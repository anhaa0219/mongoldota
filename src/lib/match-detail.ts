/** Cuts one player's details out of a full OpenDota match. Pure: no fetching. */

import type { HeroInfo, ItemInfo, ItemTiming, MatchDetail, RawDetailPlayer, RawMatchDetail } from "@/types/opendota";

const BIG_ITEM_COST = 2000;
const BKB = "black_king_bar";

function isRadiant(player: RawDetailPlayer) {
  return player.player_slot < 128;
}

/** First purchase of every item costing >= 2000 gold, in purchase order. Unknown keys (recipes) are skipped. */
function itemTimings(player: RawDetailPlayer, items: Map<string, ItemInfo>): ItemTiming[] {
  const seen = new Set<string>();
  const timings: ItemTiming[] = [];
  const purchases = [...(player.purchase_log ?? [])].sort((a, b) => a.time - b.time);

  for (const purchase of purchases) {
    const item = items.get(purchase.key);
    if (!item || item.cost < BIG_ITEM_COST || seen.has(purchase.key)) continue;
    seen.add(purchase.key);
    timings.push({ key: item.key, name: item.name, image: item.image, seconds: purchase.time, isBkb: item.key === BKB });
  }
  return timings;
}

/** Minutes when an enemy hero's kill log names this player's hero. Deaths to creeps/towers are not in the data. */
function deathMinutes(raw: RawMatchDetail, player: RawDetailPlayer, heroes: Map<number, HeroInfo>): number[] | null {
  const slug = heroes.get(player.hero_id)?.slug;
  if (!slug) return null;

  const heroKey = `npc_dota_hero_${slug}`;
  return raw.players
    .filter((other) => isRadiant(other) !== isRadiant(player))
    .flatMap((enemy) => enemy.kills_log ?? [])
    .filter((kill) => kill.key === heroKey)
    .map((kill) => Math.floor(kill.time / 60))
    .sort((a, b) => a - b);
}

/** Null when the account is not in the match. */
export function toMatchDetail(
  raw: RawMatchDetail,
  accountId: number,
  items: Map<string, ItemInfo>,
  heroes: Map<number, HeroInfo>,
): MatchDetail | null {
  const player = raw.players.find((candidate) => candidate.account_id === accountId);
  if (!player) return null;
  if (raw.version === null || raw.version === undefined) return { parsed: false };

  const teamKills = isRadiant(player) ? raw.radiant_score : raw.dire_score;
  return {
    parsed: true,
    goldEarned: player.gold_t ?? [],
    itemTimings: itemTimings(player, items),
    killParticipation: teamKills > 0 ? Math.round(((player.kills + player.assists) / teamKills) * 100) : null,
    observers: player.obs_placed ?? 0,
    sentries: player.sen_placed ?? 0,
    deathMinutes: deathMinutes(raw, player, heroes),
  };
}

function round(value: number) {
  return Math.round(value * 10) / 10;
}

/** Chart coordinates: x spread evenly, y scaled to the max. Empty when there is nothing to draw. */
function chartPoints(values: number[], width: number, height: number): string[] {
  const max = Math.max(0, ...values);
  if (values.length < 2 || max === 0) return [];

  return values.map((value, index) => {
    const x = round((index / (values.length - 1)) * width);
    const y = round(height - (value / max) * height);
    return `${x},${y}`;
  });
}

/** Closed SVG area path for the gold curve. "" when there is nothing to draw. */
export function goldChartPath(values: number[], width: number, height: number): string {
  const points = chartPoints(values, width, height);
  if (points.length === 0) return "";
  return `M0,${height} ${points.map((point) => `L${point}`).join(" ")} L${width},${height} Z`;
}

/** Open SVG line along the top of the gold area. "" when there is nothing to draw. */
export function goldLinePath(values: number[], width: number, height: number): string {
  const [first, ...rest] = chartPoints(values, width, height);
  if (!first) return "";
  return [`M${first}`, ...rest.map((point) => `L${point}`)].join(" ");
}
