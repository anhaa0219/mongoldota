/** Which coach moments are big, and how a teamfight travels in an event's `detail`. Pure. */

import { BIG_EVENT_KINDS, type LiveEventKind } from "@/types/live";

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
