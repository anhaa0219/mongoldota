/** Scoreboard rows, the default followed player and lane opponents. Pure. */

import { heroOf } from "@/lib/player-breakdowns";
import type { HeroInfo, ItemIndex, ItemInfo, LaneRole } from "@/types/opendota";
import type { RawFullMatch, RawFullPlayer } from "@/types/opendota-match";
import type { ScoreboardPlayer } from "@/types/match-view";

const LANES: readonly LaneRole[] = [1, 2, 3, 4];
/** A team's safe lane faces the enemy's off lane; mid faces mid; the jungle has no opponent. */
const FACING_LANE: Record<LaneRole, LaneRole | null> = { 1: 3, 2: 2, 3: 1, 4: null };

function itemOf(id: number | null | undefined, items: ItemIndex): ItemInfo | null {
  return id ? (items.byId.get(id) ?? null) : null;
}

function toPlayer(raw: RawFullPlayer, heroes: Map<number, HeroInfo>, items: ItemIndex, linkedAccountId: number | null): ScoreboardPlayer {
  const itemIds = [raw.item_0, raw.item_1, raw.item_2, raw.item_3, raw.item_4, raw.item_5];
  return {
    slot: raw.player_slot,
    accountId: raw.account_id,
    isLinked: raw.account_id !== null && raw.account_id === linkedAccountId,
    team: raw.player_slot < 128 ? "radiant" : "dire",
    name: raw.personaname || "Anonymous",
    hero: heroOf(raw.hero_id, heroes),
    lane: LANES.find((lane) => lane === raw.lane_role) ?? null,
    position: raw.position_est ?? null,
    kills: raw.kills,
    deaths: raw.deaths ?? 0,
    assists: raw.assists,
    netWorth: raw.net_worth ?? 0,
    gpm: raw.gold_per_min ?? 0,
    xpm: raw.xp_per_min ?? 0,
    lastHits: raw.last_hits ?? 0,
    denies: raw.denies ?? 0,
    level: raw.level ?? 0,
    heroDamage: raw.hero_damage ?? 0,
    towerDamage: raw.tower_damage ?? 0,
    healing: raw.hero_healing ?? 0,
    items: itemIds.map((id) => itemOf(id, items)),
    neutral: itemOf(raw.item_neutral, items),
    scepter: (raw.aghanims_scepter ?? 0) > 0,
    shard: (raw.aghanims_shard ?? 0) > 0,
  };
}

/** Radiant first, each team ordered by slot. */
export function toScoreboard(
  raw: RawFullMatch,
  heroes: Map<number, HeroInfo>,
  items: ItemIndex,
  linkedAccountId: number | null,
): ScoreboardPlayer[] {
  return raw.players
    .map((player) => toPlayer(player, heroes, items, linkedAccountId))
    .sort((a, b) => a.slot - b.slot);
}

/** The linked player's slot, or the first player's when they are not in the match. */
export function defaultFollowedSlot(players: ScoreboardPlayer[]): number {
  return (players.find((player) => player.isLinked) ?? players[0]).slot;
}

/** Each player's lane opponent (facing lane on the other team; most last hits at 10 wins ties), or null. */
export function laneOpponents(players: ScoreboardPlayer[], lastHitsAt10: Record<number, number>): Record<number, number | null> {
  const opponents: Record<number, number | null> = {};
  for (const player of players) {
    const facing = player.lane ? FACING_LANE[player.lane] : null;
    const candidates = players
      .filter((other) => other.team !== player.team && facing !== null && other.lane === facing)
      .sort((a, b) => (lastHitsAt10[b.slot] ?? 0) - (lastHitsAt10[a.slot] ?? 0));
    opponents[player.slot] = candidates[0]?.slot ?? null;
  }
  return opponents;
}
