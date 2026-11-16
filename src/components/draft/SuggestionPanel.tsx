"use client";

import { useState } from "react";
import { CounterEmptyState } from "@/components/draft/CounterEmptyState";
import { CounterRow } from "@/components/draft/CounterRow";
import { rankCounters } from "@/lib/draft-counters";
import { useEnemyMatchups } from "@/lib/use-enemy-matchups";
import type { DraftHero, PersonalRecord } from "@/types/draft";

const ROLES = ["All", "Carry", "Support", "Nuker", "Initiator", "Disabler", "Durable", "Escape", "Pusher"] as const;
const GOOD_COUNT = 12;
const AVOID_COUNT = 4;
/** "My heroes" = played at least this many times in the last year. */
const MIN_MY_GAMES = 3;

interface SuggestionPanelProps {
  heroes: DraftHero[];
  heroById: Map<number, DraftHero>;
  enemyIds: number[];
  picked: Set<number>;
  personal: Record<number, PersonalRecord>;
  onPick: (heroId: number) => void;
}

function chipClass(isActive: boolean) {
  return `rounded-full px-[0.7rem] py-[0.2rem] text-[0.85rem] ${isActive ? "bg-accent text-ink" : "bg-white/[0.07] text-white/70 hover:bg-white/[0.12]"}`;
}

/** Counter picks against the enemy team, updated as soon as an enemy is added. Click a hero to add it to your team. */
export function SuggestionPanel({ heroes, heroById, enemyIds, picked, personal, onPick }: SuggestionPanelProps) {
  const [role, setRole] = useState<(typeof ROLES)[number]>("All");
  const [onlyMine, setOnlyMine] = useState(false);
  const { matchups, isLoading, failed } = useEnemyMatchups(enemyIds);

  const candidates = heroes.filter(
    (hero) => (role === "All" || hero.roles.includes(role)) && (!onlyMine || (personal[hero.id]?.games ?? 0) >= MIN_MY_GAMES),
  );
  const ranked = rankCounters({ heroes: candidates, enemyIds, matchups, picked });
  const good = ranked.slice(0, GOOD_COUNT);
  const avoid = ranked.length > GOOD_COUNT + AVOID_COUNT ? ranked.slice(-AVOID_COUNT).reverse() : [];
  const rowProps = { heroes: heroById, onPick };

  return (
    <section aria-label="Pick suggestions" className="glass-panel flex min-h-0 flex-col rounded-[1.4rem] p-[1rem]">
      <h2 className="font-display text-[1.25rem] uppercase tracking-[0.06em] text-white/70">Counter picks</h2>
      <div className="mt-[0.6rem] flex flex-wrap gap-[0.35rem]">
        {ROLES.map((entry) => (
          <button key={entry} type="button" onClick={() => setRole(entry)} className={chipClass(role === entry)}>
            {entry}
          </button>
        ))}
        <button type="button" onClick={() => setOnlyMine(!onlyMine)} className={chipClass(onlyMine)} aria-pressed={onlyMine}>
          My heroes
        </button>
      </div>

      <div className="mt-[0.7rem] min-h-0 flex-1 overflow-y-auto pr-[0.2rem]" aria-live="polite">
        {enemyIds.length === 0 && <CounterEmptyState />}
        {failed && <p className="text-[0.95rem] text-dire">Could not load matchups from OpenDota. Change a pick to retry.</p>}
        {isLoading && good.length === 0 && <p className="text-[0.95rem] text-white/55">Loading matchups…</p>}
        {enemyIds.length > 0 && !isLoading && good.length === 0 && !failed && (
          <p className="text-[0.95rem] text-white/55">No hero matches these filters.</p>
        )}
        {good.length > 0 && (
          <ol className="flex flex-col">
            {good.map((suggestion) => {
              const hero = heroById.get(suggestion.heroId);
              return hero && <CounterRow key={hero.id} suggestion={suggestion} hero={hero} personal={personal[hero.id]} {...rowProps} />;
            })}
          </ol>
        )}
        {avoid.length > 0 && (
          <>
            <h3 className="mt-[0.8rem] text-[0.85rem] uppercase tracking-wider text-dire/90">Avoid</h3>
            <ol className="flex flex-col">
              {avoid.map((suggestion) => {
                const hero = heroById.get(suggestion.heroId);
                return hero && <CounterRow key={hero.id} suggestion={suggestion} hero={hero} personal={personal[hero.id]} {...rowProps} />;
              })}
            </ol>
          </>
        )}
      </div>
      <p className="mt-[0.6rem] text-[0.85rem] leading-snug text-white/45">
        Points = how much more this hero wins against each enemy than its usual win rate predicts. OpenDota samples are small (hover a number for its game count), so treat close scores as equal.
      </p>
    </section>
  );
}
