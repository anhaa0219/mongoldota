/** Which coach moments are big, how a group of moments becomes coach events, and how a teamfight travels in an event's `detail`. Pure. */

import { BIG_EVENT_KINDS, type LiveEvent, type LiveEventKind, type Moment } from "@/types/live";

/** Big moments get a tip soon after they happen; small ones wait for the usual gap. */
export function isBigKind(kind: LiveEventKind): boolean {
  return BIG_EVENT_KINDS.includes(kind);
}

export interface TeamfightSummary {
  /** Kills by the player's team and by the enemy; null when Dota sends no team scores. */
  ours: number | null;
  theirs: number | null;
  /** The player's own part in the fight. */
  kills: number;
  assists: number;
  died: boolean;
}

const UNKNOWN = "?";
const COUNT = /^\d{1,3}$/;

/** "3:1:1:2:0" = our kills : their kills : my kills : my assists : died (1) or survived (0). "?" for unknown scores. */
export function teamfightDetail({ ours, theirs, kills, assists, died }: TeamfightSummary): string {
  return [ours ?? UNKNOWN, theirs ?? UNKNOWN, kills, assists, died ? 1 : 0].join(":");
}

function score(text: string): number | null | undefined {
  if (text === UNKNOWN) return null;
  return COUNT.test(text) ? Number(text) : undefined;
}

/** Null for anything that is not a teamfight detail (the detail comes from the browser). */
export function parseTeamfightDetail(detail: string): TeamfightSummary | null {
  const parts = detail.split(":");
  if (parts.length !== 5) return null;
  const [oursText, theirsText, killsText, assistsText, diedText] = parts;
  const ours = score(oursText);
  const theirs = score(theirsText);
  if (ours === undefined || theirs === undefined) return null;
  if (!COUNT.test(killsText) || !COUNT.test(assistsText) || (diedText !== "0" && diedText !== "1")) return null;
  return { ours, theirs, kills: Number(killsText), assists: Number(assistsText), died: diedText === "1" };
}

/** Hero deaths (both teams together) in one group that make it a teamfight. */
export const TEAMFIGHT_HERO_DEATHS = 3;
/** Without team scores: this many of the player's own kills, assists and deaths in one group. */
export const TEAMFIGHT_OWN_ACTIONS = 2;

const FIGHT_KINDS: readonly LiveEventKind[] = ["death", "kill", "assist"];
const isEvent = (moment: Moment): moment is LiveEvent => moment.kind !== "teamkill" && moment.kind !== "gap";

/** How many kills or assists the events of one kind add up to. */
function countOf(events: LiveEvent[], kind: LiveEventKind): number {
  return events.filter((event) => event.kind === kind).reduce((total, event) => total + (Number.parseInt(event.detail, 10) || 0), 0);
}

/**
 * One group of moments to the events the coach is told about. A burst of kills becomes a single "teamfight"
 * event (replacing the player's own deaths, kills and assists in it); kills by either team that are not
 * part of a fight are dropped, so a group can come back empty. A group with a jump in the game state is never a fight.
 */
export function closeGroup(moments: Moment[]): LiveEvent[] {
  const events = moments.filter(isEvent);
  if (moments.some((moment) => moment.kind === "gap")) return events;
  const ours = moments.filter((moment) => moment.kind === "teamkill" && moment.detail === "ours").length;
  const theirs = moments.filter((moment) => moment.kind === "teamkill" && moment.detail === "theirs").length;
  const hasScores = ours + theirs > 0;
  const kills = countOf(events, "kill");
  const assists = countOf(events, "assist");
  const died = events.some((event) => event.kind === "death");

  const isFight = hasScores ? ours + theirs >= TEAMFIGHT_HERO_DEATHS : kills + assists + (died ? 1 : 0) >= TEAMFIGHT_OWN_ACTIONS;
  if (!isFight) return events;

  const detail = teamfightDetail({ ours: hasScores ? ours : null, theirs: hasScores ? theirs : null, kills, assists, died });
  return [{ kind: "teamfight", detail }, ...events.filter((event) => !FIGHT_KINDS.includes(event.kind))];
}
