"use client";

import { useMemo, useState } from "react";
import { BracketTabs } from "@/components/trending/BracketTabs";
import { MetaHighlights } from "@/components/trending/MetaHighlights";
import { MetaTable } from "@/components/trending/MetaTable";
import { bracketRows, dataBracket, hasSample } from "@/lib/hero-meta";
import type { HeroMeta, MetaBracket } from "@/types/meta";

const ROLES = ["All", "Carry", "Support", "Nuker", "Initiator", "Disabler", "Durable", "Escape", "Pusher"] as const;
const normalize = (text: string) => text.toLowerCase().replace(/[^a-z0-9]/g, "");

const chip = (isActive: boolean) =>
  `rounded-full px-[0.7rem] py-[0.2rem] text-[0.85rem] ${isActive ? "bg-white text-ink" : "bg-white/[0.07] text-white/70 hover:bg-white/[0.12]"}`;

/** Rank tabs, three highlights and the sortable hero table. Opens on the player's own rank. */
export function TrendingBoard({ heroes, myBracket }: { heroes: HeroMeta[]; myBracket: MetaBracket | null }) {
  const [bracket, setBracket] = useState<MetaBracket>(myBracket ?? "all");
  const [role, setRole] = useState<(typeof ROLES)[number]>("All");
  const [query, setQuery] = useState("");
  const heroById = useMemo(() => new Map(heroes.map((hero) => [hero.id, hero])), [heroes]);
  const rows = useMemo(() => bracketRows(heroes, bracket), [heroes, bracket]);

  const search = normalize(query);
  const shown = rows.filter((row) => {
    const hero = heroById.get(row.heroId);
    return hero && (role === "All" || hero.roles.includes(role)) && (!search || normalize(hero.name).includes(search));
  });
  const isSampled = (row: (typeof rows)[number]) => hasSample(row, bracket);
  const usesDivine = bracket === "8" && dataBracket(heroes, bracket) === "7";

  return (
    <div className="rise-in flex min-h-0 flex-1 flex-col gap-[0.8rem] [--rise-delay:80ms]">
      <BracketTabs value={bracket} myBracket={myBracket} onChange={setBracket} />
      {usesDivine && <p className="text-[0.85rem] text-white/55">OpenDota has no Immortal-only data, so Immortal shows Divine numbers.</p>}
      <MetaHighlights rows={rows.filter(isSampled)} heroById={heroById} />

      <section aria-label="Heroes by rank" className="glass-panel flex min-h-0 flex-1 flex-col rounded-[1.4rem] p-[0.9rem]">
        <div className="mb-[0.6rem] flex flex-wrap items-center gap-[0.4rem]">
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search hero…"
            aria-label="Search heroes"
            className="mr-[0.4rem] w-[12rem] rounded-full bg-white/[0.07] px-[0.9rem] py-[0.35rem] text-[0.92rem] text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-accent/60"
          />
          {ROLES.map((entry) => (
            <button key={entry} type="button" onClick={() => setRole(entry)} className={chip(role === entry)}>
              {entry}
            </button>
          ))}
        </div>
        <MetaTable rows={shown} heroById={heroById} isSampled={isSampled} showBans={bracket === "pro"} />
        <p className="mt-[0.5rem] text-[0.85rem] text-white/45">
          OpenDota public matches (pro: professional games), refreshed every 6 hours. Pick = share of games with the hero. Faded rows have too few games.
        </p>
      </section>
    </div>
  );
}
