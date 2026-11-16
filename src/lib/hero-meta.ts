/** Per-rank hero rates for the Trending Heroes page, from OpenDota /heroStats. Pure. */

import type { HeroMeta, MetaBracket, MetaRow, PickWin } from "@/types/meta";

export const BRACKETS: { id: MetaBracket; label: string }[] = [
  { id: "all", label: "All" },
  { id: "1", label: "Herald" },
  { id: "2", label: "Guardian" },
  { id: "3", label: "Crusader" },
  { id: "4", label: "Archon" },
  { id: "5", label: "Legend" },
  { id: "6", label: "Ancient" },
  { id: "7", label: "Divine" },
  { id: "8", label: "Immortal" },
  { id: "pro", label: "Pro" },
];

export const bracketLabel = (bracket: MetaBracket) => BRACKETS.find((entry) => entry.id === bracket)?.label ?? "All";

/** The bracket to read numbers from: OpenDota has no Immortal data, so Immortal falls back to Divine. */
export function dataBracket(heroes: HeroMeta[], bracket: MetaBracket): MetaBracket {
  if (bracket !== "8") return bracket;
  return heroes.some((hero) => hero.brackets["8"].picks > 0) ? "8" : "7";
}

/** Medal tier 1-8 from the player's rank, as a bracket. */
export function bracketForTier(tier: number | null | undefined): MetaBracket {
  return tier && tier >= 1 && tier <= 8 ? (String(tier) as MetaBracket) : "all";
}

const rate = ({ picks, wins }: PickWin) => (picks > 0 ? (wins / picks) * 100 : 0);

function change(values: number[]) {
  const first = values[0] ?? 0;
  const last = values[values.length - 1] ?? 0;
  return first > 0 ? ((last - first) / first) * 100 : 0;
}

function winChange(hero: HeroMeta) {
  const days = hero.pickTrend.length;
  if (days < 2) return 0;
  const dayRate = (index: number) => rate({ picks: hero.pickTrend[index], wins: hero.winTrend[index] ?? 0 });
  return dayRate(days - 1) - dayRate(0);
}

/** Rows for one bracket. Pick rate counts matches: every match has 10 picks. */
export function bracketRows(heroes: HeroMeta[], bracket: MetaBracket): MetaRow[] {
  const source = dataBracket(heroes, bracket);
  const totalPicks = heroes.reduce((sum, hero) => sum + hero.brackets[source].picks, 0);
  const matches = totalPicks / 10;
  return heroes.map((hero) => {
    const counts = hero.brackets[source];
    const winRate = rate(counts);
    return {
      heroId: hero.id,
      matches: counts.picks,
      winRate,
      lossRate: counts.picks > 0 ? 100 - winRate : 0,
      pickRate: matches > 0 ? (counts.picks / matches) * 100 : 0,
      banRate: source === "pro" ? (matches > 0 ? (hero.proBans / matches) * 100 : 0) : null,
      pickChange: change(hero.pickTrend),
      winChange: winChange(hero),
    };
  });
}

/** Win-rate leaders need a real sample: in public ranks 200+ games and a 1%+ pick rate; in pro 5+ games. */
export function hasSample(row: MetaRow, bracket: MetaBracket) {
  return bracket === "pro" ? row.matches >= 5 : row.matches >= 200 && row.pickRate >= 1;
}
