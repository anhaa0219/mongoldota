"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useRef, useState } from "react";
import { MatchRow, type MatchRowData } from "@/components/MatchRow";
import { clampPage, pageButtons, pageCount, pageItems } from "@/lib/pagination";

const PAGE_SIZE = 10;

const buttonClass =
  "flex items-center gap-[0.3rem] rounded-full bg-white/[0.08] px-[1rem] py-[0.45rem] text-[0.95rem] text-white/85 transition-colors hover:bg-white/[0.14] disabled:pointer-events-none disabled:opacity-35";

/** History rows, 10 per page, with Prev / Next and page numbers. Changing page scrolls back to the first row. */
export function PagedMatchList({ rows }: { rows: MatchRowData[] }) {
  const [page, setPage] = useState(1);
  const topRef = useRef<HTMLDivElement>(null);
  const pages = pageCount(rows.length, PAGE_SIZE);
  const current = clampPage(page, rows.length, PAGE_SIZE);
  const first = (current - 1) * PAGE_SIZE + 1;
  const last = Math.min(current * PAGE_SIZE, rows.length);

  const goTo = (next: number) => {
    setPage(clampPage(next, rows.length, PAGE_SIZE));
    topRef.current?.scrollIntoView({ block: "start", behavior: "smooth" });
  };

  return (
    <div ref={topRef} className="flex scroll-mt-[1rem] flex-col gap-[0.9rem]">
      <p className="text-[0.95rem] text-white/55" aria-live="polite">
        Matches {first}–{last} of {rows.length}
      </p>
      <ul className="stagger flex flex-col gap-[0.6rem]">
        {pageItems(rows, current, PAGE_SIZE).map((row) => (
          <MatchRow key={row.id} match={row} />
        ))}
      </ul>

      {pages > 1 && (
        <nav aria-label="History pages" className="flex flex-wrap items-center justify-center gap-[0.5rem]">
          <button type="button" onClick={() => goTo(current - 1)} disabled={current === 1} className={buttonClass}>
            <ChevronLeft className="size-[1rem]" aria-hidden="true" />
            Prev
          </button>
          {pageButtons(current, pages).map((entry, index) =>
            entry === null ? (
              <span key={`gap-${index}`} className="px-[0.2rem] text-white/40">
                …
              </span>
            ) : (
              <button
                key={entry}
                type="button"
                onClick={() => goTo(entry)}
                aria-current={entry === current ? "page" : undefined}
                className={`grid size-[2.3rem] place-items-center rounded-full text-[0.95rem] tabular-nums transition-colors ${
                  entry === current ? "bg-accent font-semibold text-ink shadow-[0_0_1rem_rgb(254_186_135/0.45)]" : "bg-white/[0.06] text-white/75 hover:bg-white/[0.13]"
                }`}
              >
                {entry}
              </button>
            ),
          )}
          <button type="button" onClick={() => goTo(current + 1)} disabled={current === pages} className={buttonClass}>
            Next
            <ChevronRight className="size-[1rem]" aria-hidden="true" />
          </button>
        </nav>
      )}
    </div>
  );
}
