/** Per-minute curves, the match's key events and time helpers. Pure. */

import { isParsed } from "@/lib/match-rows";
import type { ItemIndex } from "@/types/opendota";
import type { RawFullMatch, RawFullPlayer, RawObjective } from "@/types/opendota-match";
import type { MatchEvent, MatchSeries, ScoreboardPlayer, Team } from "@/types/match-view";

const BIG_ITEM_COST = 2000;
const TOWER = /npc_dota_(goodguys|badguys)_tower(\d)(?:_(top|mid|bot))?/;

function teamOfCode(code: number | null | undefined): Team | null {
  if (code === 2) return "radiant";
  if (code === 3) return "dire";
  return null;
}

const teamName = (team: Team) => (team === "radiant" ? "Radiant" : "Dire");

export function toSeries(raw: RawFullMatch): MatchSeries | null {
  if (!isParsed(raw)) return null;
  const bySlot = (pick: (player: RawFullPlayer) => number[] | null | undefined) =>
    Object.fromEntries(raw.players.map((player) => [player.player_slot, pick(player) ?? []]));
  return {
    radiantGoldAdv: raw.radiant_gold_adv ?? [],
    radiantXpAdv: raw.radiant_xp_adv ?? [],
    netWorth: bySlot((player) => player.networth_t),
    lastHits: bySlot((player) => player.lh_t),
    xp: bySlot((player) => player.xp_t),
  };
}

function playerEvents(raw: RawFullPlayer, player: ScoreboardPlayer, heroNames: Map<string, string>, items: ItemIndex): MatchEvent[] {
  const base = { slot: player.slot, team: player.team, image: null };
  const kills = (raw.kills_log ?? []).map((kill) => ({
    ...base,
    time: kill.time,
    kind: "kill" as const,
    label: `Killed ${heroNames.get(kill.key) ?? "unknown hero"}`,
  }));
  // Killers that are not heroes (towers, creeps, neutrals) are left out of the label.
  const deaths = (raw.deaths_log ?? []).map((death) => {
    const killer = heroNames.get(death.key);
    return { ...base, time: death.time, kind: "death" as const, label: killer ? `Died to ${killer}` : "Died" };
  });
  const seen = new Set<string>();
  const purchases = [...(raw.purchase_log ?? [])].sort((a, b) => a.time - b.time).flatMap((purchase) => {
    const item = items.byKey.get(purchase.key);
    if (!item || item.cost < BIG_ITEM_COST || seen.has(item.key)) return [];
    seen.add(item.key);
    return [{ ...base, time: purchase.time, kind: "item" as const, label: `Bought ${item.name}`, image: item.image }];
  });
  return [...kills, ...deaths, ...purchases];
}

function objectiveEvent(objective: RawObjective): MatchEvent | null {
  const base = { time: objective.time, slot: null, image: null };
  const team = teamOfCode(objective.team);
  if (objective.type === "CHAT_MESSAGE_ROSHAN_KILL") {
    return { ...base, kind: "roshan", team, label: team ? `${teamName(team)} killed Roshan` : "Roshan killed" };
  }
  if (objective.type === "CHAT_MESSAGE_AEGIS") return { ...base, kind: "aegis", team, label: "Aegis taken" };
  const tower = objective.type === "building_kill" ? TOWER.exec(objective.key ?? "") : null;
  if (!tower) return null;
  const owner: Team = tower[1] === "goodguys" ? "radiant" : "dire";
  const lane = tower[3] ? ` ${tower[3]}` : "";
  return { ...base, kind: "tower", team: owner, label: `${teamName(owner)} tier ${tower[2]}${lane} destroyed` };
}

/** Kills, deaths, first big-item buys, Roshan/Aegis, towers and teamfights, in time order. Empty when unparsed. */
export function toEvents(raw: RawFullMatch, players: ScoreboardPlayer[], items: ItemIndex): MatchEvent[] {
  if (!isParsed(raw)) return [];
  const heroNames = new Map(players.map((player) => [`npc_dota_hero_${player.hero.slug}`, player.hero.name]));
  const bySlot = new Map(players.map((player) => [player.slot, player]));

  const fromPlayers = raw.players.flatMap((rawPlayer) => {
    const player = bySlot.get(rawPlayer.player_slot);
    return player ? playerEvents(rawPlayer, player, heroNames, items) : [];
  });
  const fromObjectives = (raw.objectives ?? []).flatMap((objective) => objectiveEvent(objective) ?? []);
  const fights = (raw.teamfights ?? []).map((fight) => ({
    time: fight.start,
    kind: "teamfight" as const,
    slot: null,
    team: null,
    label: `Teamfight: ${fight.deaths} deaths`,
    image: null,
  }));
  return [...fromPlayers, ...fromObjectives, ...fights].sort((a, b) => a.time - b.time);
}

/** Events within `windowSeconds` of `time`; events before the horn count as 0:00. */
export function eventsNear(events: MatchEvent[], time: number, windowSeconds: number): MatchEvent[] {
  return events.filter((event) => Math.abs(Math.max(0, event.time) - time) <= windowSeconds);
}

export function clampTime(time: number, durationSeconds: number): number {
  return Math.min(durationSeconds, Math.max(0, time));
}

/** Up to `limit` events within the window, closest to `time` first chosen, returned in time order. */
export function nearestEvents(events: MatchEvent[], time: number, windowSeconds: number, limit: number): MatchEvent[] {
  return eventsNear(events, time, windowSeconds)
    .map((event) => ({ event, distance: Math.abs(Math.max(0, event.time) - time) }))
    .sort((a, b) => a.distance - b.distance)
    .slice(0, limit)
    .map(({ event }) => event)
    .sort((a, b) => a.time - b.time);
}

/** Longest real-time gap one playback frame may cover (a hidden browser tab pauses frames). */
const MAX_FRAME_MS = 100;

/** Next cursor time for one playback frame: `speed` game-seconds per real second, capped at the match end. */
export function playbackStep(time: number, realMs: number, speed: number, duration: number): number {
  return Math.min(duration, time + (Math.min(realMs, MAX_FRAME_MS) / 1000) * speed);
}
