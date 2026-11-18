import { hasFilters, NO_FILTERS, type HeroOption, type MatchFilters, type QueueFilter, type ResultFilter } from "../_utils/match-filters";
import { SegmentedToggle } from "./SegmentedToggle";
import { useWords } from "@/lib/i18n/use-words";

interface HistoryFiltersProps {
  filters: MatchFilters;
  /** Heroes in these matches, most played first. */
  heroes: HeroOption[];
  onChange: (filters: MatchFilters) => void;
}

/** Hero, result and queue filters above the History list. Wraps onto several lines on phones. */
export function HistoryFilters({ filters, heroes, onChange }: HistoryFiltersProps) {
  const words = useWords().history;
  const results: readonly { value: ResultFilter; label: string }[] = [
    { value: "all", label: words.all },
    { value: "wins", label: words.wins },
    { value: "losses", label: words.losses },
  ];
  const queues: readonly { value: QueueFilter; label: string }[] = [
    { value: "all", label: words.all },
    { value: "ranked", label: words.ranked },
    { value: "unranked", label: words.unranked },
  ];
  return (
    <div className="flex flex-wrap items-center gap-x-[1rem] gap-y-[0.6rem]">
      <select
        aria-label={words.hero}
        value={filters.heroName ?? ""}
        onChange={(event) => onChange({ ...filters, heroName: event.target.value || null })}
        className="max-w-full rounded-full bg-white/[0.08] px-[1rem] py-[0.45rem] text-[0.95rem] text-white [color-scheme:dark] focus:outline-none focus:ring-2 focus:ring-accent/60"
      >
        <option value="">{words.allHeroes}</option>
        {heroes.map((hero) => (
          <option key={hero.name} value={hero.name}>
            {hero.name} · {hero.games}
          </option>
        ))}
      </select>
      <SegmentedToggle label={words.result} options={results} value={filters.result} onChange={(result) => onChange({ ...filters, result })} />
      <SegmentedToggle label={words.queue} options={queues} value={filters.queue} onChange={(queue) => onChange({ ...filters, queue })} />
      {hasFilters(filters) && (
        <button type="button" onClick={() => onChange(NO_FILTERS)} className="text-[0.95rem] text-white/55 underline-offset-4 hover:text-accent hover:underline">
          {words.clearFilters}
        </button>
      )}
    </div>
  );
}
