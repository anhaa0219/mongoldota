"use client";

import Image from "next/image";
import { ArrowDown, ArrowUp, TrendingDown, TrendingUp } from "lucide-react";
import { useState } from "react";
import { heroPortrait } from "@/lib/hero-images";
import type { HeroMeta, MetaRow } from "@/types/meta";

type SortKey = "name" | "winRate" | "lossRate" | "pickRate" | "matches" | "pickChange" | "banRate";

const pct = (value: number) => `${value.toFixed(1)}%`;

/** Sortable hero table for one rank. Heroes with too few games sink to the bottom when sorting by a rate. */
export function MetaTable({ rows, heroById, isSampled, showBans }: { rows: MetaRow[]; heroById: Map<number, HeroMeta>; isSampled: (row: MetaRow) => boolean; showBans: boolean }) {
  const [sort, setSort] = useState<{ key: SortKey; descending: boolean }>({ key: "winRate", descending: true });
  const value = (row: MetaRow) => (sort.key === "name" ? 0 : (row[sort.key] ?? 0));
  const name = (row: MetaRow) => heroById.get(row.heroId)?.name ?? "";
  const sorted = [...rows].sort((a, b) => {
    if (sort.key !== "name" && sort.key !== "matches" && isSampled(a) !== isSampled(b)) return isSampled(a) ? -1 : 1;
    const order = sort.key === "name" ? name(a).localeCompare(name(b)) : value(a) - value(b);
    return sort.descending ? -order : order;
  });

  const header = (key: SortKey, label: string, align = "text-right") => (
    <th scope="col" className={`sticky top-0 z-10 bg-ink/90 px-[0.6rem] py-[0.5rem] font-normal backdrop-blur ${align}`}>
      <button
        type="button"
        onClick={() => setSort((current) => ({ key, descending: current.key === key ? !current.descending : key !== "name" }))}
        className={`inline-flex items-center gap-[0.2rem] uppercase tracking-wider ${sort.key === key ? "text-accent" : "text-white/50 hover:text-white/80"}`}
      >
        {label}
        {sort.key === key && (sort.descending ? <ArrowDown className="size-[0.8rem]" /> : <ArrowUp className="size-[0.8rem]" />)}
      </button>
    </th>
  );

  return (
    <div className="min-h-0 flex-1 overflow-y-auto rounded-[1rem]">
      <table className="w-full border-separate border-spacing-0 text-[0.92rem] tabular-nums">
        <thead className="text-[0.85rem]">
          <tr>
            {header("name", "Hero", "text-left")}
            {header("winRate", "Win")}
            {header("lossRate", "Loss")}
            {header("pickRate", "Pick")}
            {showBans && header("banRate", "Ban")}
            {header("matches", "Games")}
            {header("pickChange", "7 days")}
          </tr>
        </thead>
        <tbody>
          {sorted.map((row) => {
            const hero = heroById.get(row.heroId);
            if (!hero) return null;
            return (
              <tr key={row.heroId} className={`group transition-colors hover:bg-white/[0.06] ${isSampled(row) ? "" : "opacity-45"}`} title={isSampled(row) ? undefined : "Too few games to trust these rates"}>
                <td className="border-b border-white/[0.06] px-[0.6rem] py-[0.35rem]">
                  <span className="flex items-center gap-[0.6rem]">
                    <span className="relative block h-[1.7rem] w-[3rem] shrink-0 overflow-hidden rounded-[0.3rem] bg-white/10">
                      <Image unoptimized src={heroPortrait(hero.slug)} alt="" fill sizes="3rem" className="object-cover transition-transform duration-300 group-hover:scale-110" />
                    </span>
                    <span className="truncate text-white transition-colors group-hover:text-accent">{hero.name}</span>
                  </span>
                </td>
                <td className="border-b border-white/[0.06] px-[0.6rem] text-right">
                  <span className="inline-flex items-center gap-[0.4rem]">
                    <span className="hidden h-[0.4rem] w-[4rem] overflow-hidden rounded-full bg-white/10 md:block" aria-hidden="true">
                      <span className={`block h-full ${row.winRate >= 50 ? "bg-radiant" : "bg-dire"}`} style={{ width: `${Math.min(100, Math.max(0, (row.winRate - 35) * (100 / 30)))}%` }} />
                    </span>
                    <span className={row.winRate >= 52 ? "text-radiant" : row.winRate < 48 ? "text-dire" : "text-white"}>{pct(row.winRate)}</span>
                  </span>
                </td>
                <td className="border-b border-white/[0.06] px-[0.6rem] text-right text-white/60">{pct(row.lossRate)}</td>
                <td className="border-b border-white/[0.06] px-[0.6rem] text-right text-white/80">{pct(row.pickRate)}</td>
                {showBans && <td className="border-b border-white/[0.06] px-[0.6rem] text-right text-white/80">{pct(row.banRate ?? 0)}</td>}
                <td className="border-b border-white/[0.06] px-[0.6rem] text-right text-white/60">{row.matches.toLocaleString("en-US")}</td>
                <td
                  className={`border-b border-white/[0.06] px-[0.6rem] text-right ${row.pickChange >= 5 ? "text-radiant" : row.pickChange <= -5 ? "text-dire" : "text-white/60"}`}
                  title={`Picks ${row.pickChange >= 0 ? "+" : ""}${Math.round(row.pickChange)}% and win rate ${row.winChange >= 0 ? "+" : ""}${row.winChange.toFixed(1)} pts over the week (all ranks)`}
                >
                  <span className="inline-flex items-center gap-[0.3rem]">
                    {row.pickChange >= 0 ? <TrendingUp className="size-[0.95rem]" aria-label="up" /> : <TrendingDown className="size-[0.95rem]" aria-label="down" />}
                    {Math.abs(Math.round(row.pickChange))}%
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
