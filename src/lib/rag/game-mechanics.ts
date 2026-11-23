/**
 * Hand-written map and mechanics facts for the coaches' knowledge base (one fact per record).
 *
 * UNCHECKED until the project owner verifies each line against the current patch. Timings change between
 * patches, and a wrong line here is exactly the false info RAG is meant to remove. Edit or delete lines,
 * then set MECHANICS_CHECKED_FOR_PATCH to the patch key (e.g. "7_42"). The ingest script loads this list
 * only when that key matches the newest patch, so after every new patch the list must be checked again.
 */

import type { RagRecord } from "@/types/rag";

export const MECHANICS_CHECKED_FOR_PATCH: string | null = null;

const MECHANICS: Record<string, string> = {
  "bounty-runes": "Bounty runes spawn at 0:00 and then every 3 minutes at the bounty rune spots in each jungle; picking one up gives gold to the whole team.",
  "power-runes": "Power runes spawn from 6:00 and then every 2 minutes at one of the two river rune spots: Double Damage, Haste, Illusion, Invisibility, Regeneration, Arcane or Shield.",
  "water-runes": "Water runes spawn at 2:00 and 4:00 at both river rune spots and restore health and mana; they help mid players stay in lane.",
  "wisdom-runes": "Wisdom runes spawn every 7 minutes starting at 7:00 at the wisdom shrines and give experience to the team that takes them; contesting them matters for supports.",
  "lotus-pools": "Healing Lotuses grow in the lotus pools over time and can be picked to restore health and mana; stacks build up if nobody takes them.",
  "roshan-respawn": "After Roshan dies he respawns randomly between 8 and 11 minutes later. Track the kill time to know the earliest possible respawn.",
  "roshan-drops": "Roshan always drops the Aegis of the Immortal. From the second kill he also drops Cheese, and later kills add an Aghanim's Blessing or Refresher Shard.",
  "aegis": "The Aegis brings its holder back to life once where they died; it expires 5 minutes after pickup, so the team should use the extra life to take objectives.",
  "roshan-pit": "Roshan's pit is in the river and moves between the top and bottom side with the day and night cycle; check which side he is on before rotating.",
  "tormentors": "Tormentors are neutral shield monsters on each side of the map; killing one gives the team an Aghanim's Shard. They hit back harder the longer you take, so bring several heroes.",
  "day-night": "Day and night each last 5 minutes. Most heroes see less far at night, which makes ganks and smoke moves stronger.",
  "buyback": "Buyback revives a dead hero instantly at base for gold that grows with net worth, then has a long cooldown. Keep buyback gold in the late game before fighting at high ground.",
  "glyph": "The Glyph of Fortification makes your team's buildings invulnerable for a few seconds and has a long cooldown; save it to stop a push on a tower about to fall.",
  "scan": "Scan reveals whether enemy heroes are in a circle on the map for a few seconds and has a long cooldown; use it before Roshan or before entering an unwarded area.",
  "outposts": "Outposts give the team that captures them vision around them and a teleport point; capturing one takes a few seconds of channeling.",
  "high-ground": "Attacking up the high ground gives the defenders vision and the attackers a miss chance against units above them; push high ground with an advantage or with Aegis.",
  "stacking": "Neutral camps can be stacked by pulling them out of their area just before the minute mark, so a new camp spawns; stacked camps give carries fast farm.",
  "smoke": "Smoke of Deceit makes allied heroes nearby invisible and hidden from the minimap until they get close to an enemy hero or tower; use it to gank or to reach Roshan unseen.",
};

export function mechanicRecords(): RagRecord[] {
  return Object.entries(MECHANICS).map(([slug, text]) => ({ id: `mechanic:${slug}`, text, source: "mechanic" }));
}
