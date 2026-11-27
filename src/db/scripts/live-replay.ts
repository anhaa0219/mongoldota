/**
 * Demo: replays one of your finished, parsed matches on the Live page as if you were playing it right now. Every second
 * it writes that moment of the game to your live row (the row Dota's own updates fill), so the page and the AI coach
 * react as in a real game; the coach's tips count toward your AI limits. It also locks the match's lineup as your draft.
 * Writes to the database in DATABASE_URL, so the replay shows on every site that uses that database.
 *
 * Run: npx tsx --env-file=.env.local src/db/scripts/live-replay.ts <matchId> [--from 32] [--speed 1]
 *   --from   game minute to start at (default 32)
 *   --speed  game seconds per real second (default 1 = real time)
 * After the last second it holds the final moment. Ctrl+C leaves the game (back to the menu).
 */

import { db } from "@/db";
import { gsiTokens } from "@/db/schema";
import { toItemFacts } from "@/lib/live/replay-items";
import { prepareReplay, replayDraft, replaySnapshot, type Replay } from "@/lib/live/replay-snapshot";
import { touchLiveRow, writeLiveRow } from "@/lib/live/live-store";
import { saveLockedDraft } from "@/lib/live/live-tips-store";
import { fetchJson } from "@/lib/opendota/opendota";
import { dotaAccountId } from "@/lib/steam/steam-auth";
import type { RawItemConstants, ReplayMatch } from "@/types/live-replay";

const TICK_MS = 1000;
/** After the match ends, keep the row fresh so the page stays "connected". */
const HOLD_TOUCH_MS = 15_000;
const LOG_EVERY_SECONDS = 30;

const out = (line: string) => process.stdout.write(`${line}\n`);
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const clock = (second: number) => `${Math.floor(second / 60)}:${String(second % 60).padStart(2, "0")}`;

function readArgs(argv: string[]): { matchId: number; fromSecond: number; speed: number } {
  const flag = (name: string, fallback: number) => {
    const index = argv.indexOf(name);
    return index === -1 ? fallback : Number(argv[index + 1]);
  };
  const matchId = Number(argv[0]);
  const fromSecond = Math.round(flag("--from", 32) * 60);
  const speed = flag("--speed", 1);
  if (!Number.isSafeInteger(matchId) || matchId <= 0) throw new Error("pass a match id first");
  if (!Number.isFinite(fromSecond) || !Number.isFinite(speed) || speed <= 0) throw new Error("--from and --speed must be numbers");
  return { matchId, fromSecond, speed };
}

/** The match player who has Live Coach set up (a setup file made), with their Clerk account. */
async function findPlayer(match: ReplayMatch): Promise<{ clerkUserId: string; accountId: number } | null> {
  if (!db) return null;
  const owners = await db.select({ clerkUserId: gsiTokens.clerkUserId, steamId: gsiTokens.steamId }).from(gsiTokens);
  const inMatch = new Set(match.players.map((player) => player.account_id));
  const owner = owners.map((row) => ({ clerkUserId: row.clerkUserId, accountId: Number(dotaAccountId(row.steamId)) })).find((row) => inMatch.has(row.accountId));
  return owner ?? null;
}

async function play(replay: Replay, clerkUserId: string, fromSecond: number, speed: number): Promise<void> {
  const startedAt = Date.now();
  const { duration } = replay.match;
  let loggedAt = -Infinity;
  for (;;) {
    const second = Math.min(duration, Math.floor(fromSecond + ((Date.now() - startedAt) / 1000) * speed));
    const snapshot = replaySnapshot(replay, second);
    await writeLiveRow(clerkUserId, snapshot);
    if (second - loggedAt >= LOG_EVERY_SECONDS || second === duration) {
      loggedAt = second;
      out(`${clock(second)}  ${snapshot.kills}/${snapshot.deaths}/${snapshot.assists}  lvl ${snapshot.level}  gold ${snapshot.gold}${snapshot.alive ? "" : "  (dead)"}`);
    }
    if (second >= duration) break;
    await sleep(TICK_MS - ((Date.now() - startedAt) % TICK_MS));
  }
  out("Match over: holding the last moment. Ctrl+C to leave the game.");
  for (;;) {
    await sleep(HOLD_TOUCH_MS);
    await touchLiveRow(clerkUserId);
  }
}

async function main() {
  const { matchId, fromSecond, speed } = readArgs(process.argv.slice(2));
  if (!db) throw new Error("DATABASE_URL is not set (put it in .env.local)");

  const [match, rawItems, rawHeroes] = await Promise.all([
    fetchJson<ReplayMatch>(`/matches/${matchId}`),
    fetchJson<RawItemConstants>("/constants/items"),
    fetchJson<Record<string, { id: number; name: string }>>("/constants/heroes"),
  ]);
  const owner = await findPlayer(match);
  if (!owner) throw new Error("none of this match's players has Live Coach set up (download the setup file on the Live page first)");

  const heroNames = new Map(Object.values(rawHeroes).map((hero) => [hero.id, hero.name]));
  const liveMatchId = `${matchId}-demo-${Date.now().toString(36)}`;
  const replay = prepareReplay({ match, accountId: owner.accountId, items: toItemFacts(rawItems), heroNames, liveMatchId });
  if (!replay) throw new Error("OpenDota has no per-minute data for this match (it is not parsed)");
  if (fromSecond >= match.duration) throw new Error(`the match lasted ${clock(match.duration)}: start earlier with --from`);

  const draft = replayDraft(match, replay.player);
  if (draft) await saveLockedDraft(owner.clerkUserId, draft);
  out(`Replaying ${replay.heroKey} in match ${matchId} from ${clock(fromSecond)} at ${speed}x${draft ? ", draft locked" : ""}. Open the Live page.`);

  // tsx passes Ctrl+C on as well, so the signal can arrive twice: leave once.
  let isLeaving = false;
  process.on("SIGINT", () => {
    if (isLeaving) return;
    isLeaving = true;
    out("\nLeaving the game.");
    void writeLiveRow(owner.clerkUserId, null).finally(() => process.exit(0));
  });
  await play(replay, owner.clerkUserId, fromSecond, speed);
}

main().catch((error: unknown) => {
  process.stderr.write(`Replay failed: ${error instanceof Error ? error.message : "unknown error"}\n`);
  process.exit(1);
});
