/** Damage matrix, teamfight gold swings, chat and purchase log. Pure. */

import { isParsed } from "@/lib/match-rows";
import type { ItemIndex } from "@/types/opendota";
import type { RawFullMatch } from "@/types/opendota-match";
import type { MatchCombat, MatchLog, ScoreboardPlayer } from "@/types/match-view";

/** Null when the match is unparsed. */
export function toCombat(raw: RawFullMatch, players: ScoreboardPlayer[]): MatchCombat | null {
  if (!isParsed(raw)) return null;
  const slotOfHero = new Map(players.map((player) => [`npc_dota_hero_${player.hero.slug}`, player]));

  const damage: MatchCombat["damage"] = {};
  for (const attacker of raw.players) {
    const attackerTeam = attacker.player_slot < 128 ? "radiant" : "dire";
    const row: Record<number, number> = {};
    for (const targets of Object.values(attacker.damage_targets ?? {})) {
      for (const [heroKey, amount] of Object.entries(targets)) {
        const target = slotOfHero.get(heroKey);
        if (!target || target.team === attackerTeam) continue;
        row[target.slot] = (row[target.slot] ?? 0) + amount;
      }
    }
    damage[attacker.player_slot] = row;
  }

  const teamfights = (raw.teamfights ?? []).map((fight) => ({
    start: fight.start,
    end: fight.end,
    deaths: fight.deaths,
    radiantGoldSwing: fight.players.reduce((swing, fighter, index) => {
      const slot = raw.players[index]?.player_slot ?? 0;
      const delta = fighter.gold_delta ?? 0;
      return slot < 128 ? swing + delta : swing - delta;
    }, 0),
  }));
  return { damage, teamfights };
}

/** Null when the match is unparsed. */
export function toLog(raw: RawFullMatch, items: ItemIndex): MatchLog | null {
  if (!isParsed(raw)) return null;
  const chat = [...(raw.chat ?? [])]
    .sort((a, b) => a.time - b.time)
    .map((line) => ({ time: line.time, slot: line.player_slot ?? null, text: line.type === "chat" ? line.key : "(chat wheel)" }));
  const purchases = Object.fromEntries(
    raw.players.map((player) => [
      player.player_slot,
      [...(player.purchase_log ?? [])]
        .sort((a, b) => a.time - b.time)
        .flatMap((purchase) => {
          const item = items.byKey.get(purchase.key);
          return item ? [{ time: purchase.time, item }] : [];
        }),
    ]),
  );
  return { chat, purchases };
}
