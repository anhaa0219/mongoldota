import Image from "next/image";
import { formatDuration } from "@/lib/format";
import { heroPortrait } from "@/lib/hero-images";
import type { LiveSnapshot } from "@/types/live";

const LIVE_WITHIN_MS = 60_000;

interface LivePanelProps {
  snapshot: LiveSnapshot;
  heroName: string;
  items: Map<string, { name: string; image: string }>;
  /** Milliseconds since epoch of the last update from Dota. */
  updatedAt: number | null;
  now: number;
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col">
      <span className="text-[0.75rem] uppercase tracking-[0.12em] text-white/50">{label}</span>
      <span className="text-[1.3rem] font-medium tabular-nums text-white">{value}</span>
    </div>
  );
}

/** The player's game right now: clock, hero, K/D/A, gold and items, with how fresh the data is. */
export function LivePanel({ snapshot, heroName, items, updatedAt, now }: LivePanelProps) {
  const age = updatedAt === null ? null : now - updatedAt;
  const live = age !== null && age < LIVE_WITHIN_MS;
  const status = live ? "Live" : age === null ? "Waiting for Dota" : `Last update ${Math.max(1, Math.round(age / 60_000))} min ago`;

  return (
    <section aria-label="Your game" className="glass-panel flex flex-col gap-[0.9rem] rounded-[1.4rem] p-[1rem]">
      <div className="flex flex-wrap items-center gap-[1rem]">
        <div className="relative h-[3.6rem] w-[6.4rem] shrink-0 overflow-hidden rounded-[0.8rem]">
          <Image unoptimized src={heroPortrait(snapshot.heroKey)} alt="" fill sizes="6.4rem" className="object-cover" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-[1.7rem] uppercase leading-none tracking-[0.04em] text-white">{heroName}</p>
          <p className="text-[0.95rem] text-white/60">
            Level {snapshot.level}
            {!snapshot.alive && <span className="text-dire"> · Dead, respawn in {snapshot.respawnSeconds}s</span>}
          </p>
        </div>
        <p className="flex items-center gap-[0.5rem] text-[0.95rem] text-white/70">
          <span aria-hidden="true" className={`size-[0.6rem] rounded-full ${live ? "animate-pulse bg-radiant" : "bg-white/30"}`} />
          {status} · <span className="tabular-nums">{formatDuration(snapshot.clockSeconds)}</span>
        </p>
      </div>
      <div className="flex flex-wrap gap-x-[2rem] gap-y-[0.6rem]">
        <Stat label="K / D / A" value={`${snapshot.kills} / ${snapshot.deaths} / ${snapshot.assists}`} />
        <Stat label="Gold" value={snapshot.gold.toLocaleString("en-US")} />
        <Stat label="GPM" value={String(snapshot.gpm)} />
        <Stat label="Last hits" value={`${snapshot.lastHits} / ${snapshot.denies}`} />
      </div>
      <ul className="grid grid-cols-6 gap-[0.4rem]" aria-label="Items">
        {snapshot.inventory.map((key, slot) => {
          const item = key ? items.get(key) : undefined;
          return (
            <li key={slot} className="relative aspect-[88/64] overflow-hidden rounded-[0.5rem] bg-white/[0.06]">
              {item ? <Image unoptimized src={item.image} alt={item.name} title={item.name} fill sizes="4rem" className="object-cover" /> : key && <span className="sr-only">{key}</span>}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
