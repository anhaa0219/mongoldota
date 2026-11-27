/**
 * Demo replay (server only): the player of the demo match can play that finished, parsed match on the Live page as if
 * live, with Play, Pause, Stop and Reset. Each step writes the next game second to the player's live row (the row
 * Dota's own updates fill), so the page and the coach react as in a real game. Every function returns null instead of
 * throwing.
 */

import { getLiveRow, touchLiveRow, writeLiveRow } from "@/lib/live/live-store";
import { saveLockedDraft } from "@/lib/live/live-tips-store";
import { toItemFacts } from "@/lib/live/replay-items";
import { prepareReplay, replayDraft, replaySnapshot, type Replay } from "@/lib/live/replay-snapshot";
import { getJson } from "@/lib/opendota/opendota";
import type { RawItemConstants, ReplayMatch } from "@/types/live-replay";
import type { LiveSnapshot } from "@/types/live";

/** Demo day: the owner's Puck game. DEMO_LIVE_MATCH_ID overrides it; "off" turns the demo off. */
const DEFAULT_DEMO_MATCH_ID = 9103482741;
const ONE_DAY = 86_400;
const RUN_MARK = "-demo-";

export const DEMO_ACTIONS = ["play", "step", "hold", "stop", "reset"] as const;
export type DemoAction = (typeof DEMO_ACTIONS)[number];

/** Where the demo stands: the game clock (null when no replay is running) and the match length, in seconds. */
export interface DemoState {
  clockSeconds: number | null;
  duration: number;
}

function demoMatchId(): number | null {
  const setting = process.env.DEMO_LIVE_MATCH_ID?.trim();
  if (setting === "off") return null;
  const id = setting ? Number(setting) : DEFAULT_DEMO_MATCH_ID;
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

/** The demo run in this live snapshot, or null when the snapshot is a real game or no game. */
function runSnapshot(snapshot: LiveSnapshot | null | undefined): LiveSnapshot | null {
  const matchId = demoMatchId();
  return matchId && snapshot?.matchId.startsWith(`${matchId}${RUN_MARK}`) ? snapshot : null;
}

/** The replay for this player under `liveMatchId`; null when the demo is off, they did not play it, or OpenDota failed. */
async function loadReplay(accountId: number, liveMatchId: string): Promise<Replay | null> {
  const matchId = demoMatchId();
  if (!matchId) return null;
  const [match, rawItems, rawHeroes] = await Promise.all([
    getJson<ReplayMatch>(`/matches/${matchId}`, ONE_DAY),
    getJson<RawItemConstants>("/constants/items", ONE_DAY),
    getJson<Record<string, { id: number; name: string }>>("/constants/heroes", ONE_DAY),
  ]);
  if (!match || !rawItems || !rawHeroes) return null;
  const heroNames = new Map(Object.values(rawHeroes).map((hero) => [hero.id, hero.name]));
  return prepareReplay({ match, accountId, items: toItemFacts(rawItems), heroNames, liveMatchId });
}

/** For the Live page: whether this player gets the demo buttons, and where a running demo stands. */
export async function getDemoState(accountId: number, snapshot: LiveSnapshot | null | undefined): Promise<DemoState | null> {
  const run = runSnapshot(snapshot);
  const replay = await loadReplay(accountId, run?.matchId ?? "");
  return replay ? { clockSeconds: run?.clockSeconds ?? null, duration: replay.match.duration } : null;
}

async function startRun(clerkUserId: string, accountId: number): Promise<DemoState | null> {
  const matchId = demoMatchId();
  // A new id per run: the earlier run's tips and per-match AI limits do not carry over.
  const replay = matchId ? await loadReplay(accountId, `${matchId}${RUN_MARK}${Date.now().toString(36)}`) : null;
  if (!replay) return null;
  const draft = replayDraft(replay.match, replay.player);
  if (draft) await saveLockedDraft(clerkUserId, draft);
  await writeLiveRow(clerkUserId, replaySnapshot(replay, 0));
  return { clockSeconds: 0, duration: replay.match.duration };
}

/**
 * One button press or tick. play: refresh the draft, then step. step: `seconds` forward (a new run at 0:00 when none
 * is running). hold: keep the page connected without moving. stop: leave the game. reset: a new run at 0:00.
 */
export async function runDemoAction(clerkUserId: string, accountId: number, action: DemoAction, seconds: number): Promise<DemoState | null> {
  try {
    if (action === "reset") return await startRun(clerkUserId, accountId);
    const run = runSnapshot((await getLiveRow(clerkUserId))?.snapshot);
    if (!run && (action === "play" || action === "step")) return await startRun(clerkUserId, accountId);

    const replay = await loadReplay(accountId, run?.matchId ?? "");
    if (!replay) return null;
    const { duration } = replay.match;
    if (!run || action === "stop") {
      if (run) await writeLiveRow(clerkUserId, null);
      return { clockSeconds: null, duration };
    }
    if (action === "hold") {
      await touchLiveRow(clerkUserId);
      return { clockSeconds: run.clockSeconds, duration };
    }

    if (action === "play") {
      const draft = replayDraft(replay.match, replay.player);
      if (draft) await saveLockedDraft(clerkUserId, draft);
    }
    const next = Math.min(duration, run.clockSeconds + seconds);
    await writeLiveRow(clerkUserId, replaySnapshot(replay, next));
    return { clockSeconds: next, duration };
  } catch {
    return null;
  }
}
