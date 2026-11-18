"use client";

import { useState } from "react";
import { HistoryFilters } from "../_components/HistoryFilters";
import { filterMatches, heroOptions, NO_FILTERS, type MatchFilters } from "../_utils/match-filters";
import type { MatchRowData } from "../_utils/match-row-types";
import { PagedMatchList } from "./PagedMatchList";
import { useWords } from "@/lib/i18n/use-words";

/**
 * History's filters and the paged list under them. Works on the matches already loaded (no new requests).
 * Filters reset on reload; any change re-mounts the pager, so it goes back to page 1.
 */
export function FilteredMatchList({ rows }: { rows: MatchRowData[] }) {
  const [filters, setFilters] = useState<MatchFilters>(NO_FILTERS);
  const words = useWords().history;
  const filtered = filterMatches(rows, filters);
  const filterKey = `${filters.heroName ?? ""}|${filters.result}|${filters.queue}`;

  const empty = (
    <div className="glass-panel flex flex-col items-start gap-[0.8rem] rounded-[1.2rem] p-[1.2rem]">
      <p className="text-[1.05rem] text-white/75">{words.noneFit}</p>
      <button
        type="button"
        onClick={() => setFilters(NO_FILTERS)}
        className="rounded-full bg-accent/90 px-[1.1rem] py-[0.45rem] text-[0.95rem] font-medium text-ink transition-colors hover:bg-accent"
      >
        {words.clearFilters}
      </button>
    </div>
  );

  return (
    <div className="flex flex-col gap-[0.9rem]">
      <HistoryFilters filters={filters} heroes={heroOptions(rows)} onChange={setFilters} />
      <PagedMatchList key={filterKey} rows={filtered} empty={empty} />
    </div>
  );
}
