/**
 * A finished, parsed OpenDota match as Live Coach snapshots, one per game second, so a past game plays on the Live
 * page as if it were live (demo). Pure.
 */

import { inventoryOf, itemsAt, sortPurchases, type ItemFacts } from "@/lib/live/replay-items";
import { buildingsAt, countUntil, hasAegisAt, levelFor, lifeAt, scoreAt, sideOfSlot, streakAt, valueAt } from "@/lib/live/replay-timeline";
import type { PlacedHero, Position } from "@/types/draft";
import type { Side } from "@/types/game";
import type { LiveSnapshot, LockedDraft } from "@/types/live";
import type { ReplayMatch, ReplayPlayer } from "@/types/live-replay";
import type { RawLogEntry } from "@/types/opendota-match";

const HERO_PREFIX = "npc_dota_hero_";
const BUYBACK_BASE_COST = 200;
/** Buyback costs 200 gold plus a twelfth of net worth. */
const BUYBACK_NET_WORTH_SHARE = 12;
const BUYBACK_COOLDOWN_SECONDS = 480;
const POSITIONS: readonly Position[] = [1, 2, 3, 4, 5];

export interface Replay {
  /** Written as the live match id: new each run, so an earlier run's tips and per-match AI limits do not carry over. */
  liveMatchId: string;
  match: ReplayMatch;
  player: ReplayPlayer;
  /** "puck" */
  heroKey: string;
  items: Map<string, ItemFacts>;
  /** The player's purchases, sorted by time. */
  purchases: RawLogEntry[];
  /** Added to earned - spent - lost so the last second shows the match's real unspent gold (the logs miss some gold). */
  goldOffset: number;
}

function goldLostUntil(player: ReplayPlayer, second: number): number {
  return (player.deaths_log ?? []).filter((entry) => entry.time <= second).reduce((total, entry) => total + (entry.gold_lost ?? 0), 0);
}

function goldBeforeOffset(player: ReplayPlayer, purchases: RawLogEntry[], items: Map<string, ItemFacts>, second: number): number {
  return valueAt(player.gold_t, player.times, second) - itemsAt(purchases, items, second).spent - goldLostUntil(player, second);
}

/** Null when the account did not play this match or OpenDota has no per-minute data for it (not parsed). */
export function prepareReplay(input: {
  match: ReplayMatch;
  accountId: number;
  items: Map<string, ItemFacts>;
  heroNames: Map<number, string>;
  liveMatchId: string;
}): Replay | null {
  const { match, items } = input;
  const player = match.players.find((candidate) => candidate.account_id === input.accountId);
  const heroName = player ? input.heroNames.get(player.hero_id) : undefined;
  if (!player || !heroName || !player.gold_t?.length || !player.xp_t?.length) return null;

  const purchases = sortPurchases(player.purchase_log ?? [], items);
  const goldOffset = (player.gold ?? 0) - goldBeforeOffset(player, purchases, items, match.duration);
  return { liveMatchId: input.liveMatchId, match, player, heroKey: heroName.replace(HERO_PREFIX, ""), items, purchases, goldOffset };
}

/** The player's game at `second` on the game clock, shaped like a GSI update. */
export function replaySnapshot(replay: Replay, second: number): LiveSnapshot {
  const { match, player, items } = replay;
  const at = (series: number[] | null | undefined) => valueAt(series, player.times, second);
  const { owned } = itemsAt(replay.purchases, items, second);
  const neutral = (player.neutral_item_history ?? []).filter((entry) => entry.time <= second).at(-1)?.item_neutral;
  const lastBuyback = (player.buyback_log ?? []).filter((entry) => entry.time <= second).at(-1)?.time;
  const minutes = Math.max(1, second / 60);
  const { buildings, teams } = buildingsAt(match, second);

  return {
    matchId: replay.liveMatchId,
    clockSeconds: second,
    heroId: player.hero_id,
    heroKey: replay.heroKey,
    level: levelFor(at(player.xp_t)),
    ...lifeAt(player, second),
    kills: countUntil(player.kills_log, second),
    deaths: countUntil(player.deaths_log, second),
    assists: countUntil(player.assists_log, second),
    lastHits: Math.floor(at(player.lh_t)),
    denies: Math.floor(at(player.dn_t)),
    gold: Math.max(0, Math.round(goldBeforeOffset(player, replay.purchases, items, second) + replay.goldOffset)),
    gpm: Math.round(at(player.gold_t) / minutes),
    xpm: Math.round(at(player.xp_t) / minutes),
    inventory: inventoryOf(owned, items),
    owned: [...owned, ...(neutral ? [neutral] : []), ...(hasAegisAt(match, player, second) ? ["aegis"] : [])],
    team: sideOfSlot(player.player_slot),
    buildings,
    buildingTeams: teams,
    killStreak: streakAt(player, second),
    buybackCost: Math.round(BUYBACK_BASE_COST + at(player.networth_t) / BUYBACK_NET_WORTH_SHARE),
    buybackCooldown: lastBuyback === undefined ? 0 : Math.max(0, lastBuyback + BUYBACK_COOLDOWN_SECONDS - second),
    score: scoreAt(match, second),
  };
}

/** The match's lineup as a locked draft (positions from OpenDota's estimate); null when a position is unknown. */
export function replayDraft(match: ReplayMatch, player: ReplayPlayer): LockedDraft | null {
  const side = sideOfSlot(player.player_slot);
  const team = (wanted: Side): PlacedHero[] =>
    match.players.flatMap((member) => {
      const position = POSITIONS.find((candidate) => candidate === member.position_est);
      return sideOfSlot(member.player_slot) === wanted && position ? [{ heroId: member.hero_id, position }] : [];
    });
  const allies = team(side);
  const enemies = team(side === "radiant" ? "dire" : "radiant");
  if (allies.length !== 5 || enemies.length !== 5) return null;
  return { side, myHeroId: player.hero_id, allies, enemies };
}
