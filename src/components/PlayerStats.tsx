import Image from "next/image";
import Link from "next/link";
import { HeroHeadline } from "@/components/HeroHeadline";
import { MoreStats } from "@/components/MoreStats";
import { StatPanel as Panel } from "@/components/StatPanel";
import { heroPortrait } from "@/lib/hero-images";
import type { HeroInfo, PlayerSummary } from "@/types/opendota";

function Last100({ summary }: { summary: PlayerSummary }) {
  const { wins, losses, last10 } = summary;
  const winRate = Math.round((wins / (wins + losses)) * 100);
  return (
    <Panel title={`Last ${wins + losses} matches`}>
      <p className="flex items-baseline gap-[0.8rem] font-display leading-none">
        <span className="text-[3.4rem] text-radiant">{wins}W</span>
        <span className="text-[2rem] text-white/40">/</span>
        <span className="text-[3.4rem] text-dire">{losses}L</span>
      </p>
      <div
        className="mt-[0.9rem] flex h-[0.6rem] overflow-hidden rounded-full"
        role="meter"
        aria-label="Win rate"
        aria-valuenow={winRate}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <span className="bg-radiant" style={{ width: `${winRate}%` }} />
        <span className="flex-1 bg-dire" />
      </div>
      <p className="mt-[0.5rem] text-[1.1rem] text-white/70">{winRate}% win rate</p>
      <div className="mt-[1rem] flex items-center gap-[0.35rem]" aria-label={`Last ${last10.length}: ${last10.join(" ")}`}>
        {last10.map((result, i) => (
          <span
            key={i}
            className={`grid size-[1.6rem] place-items-center rounded-[0.35rem] text-[0.85rem] font-semibold ${
              result === "W" ? "bg-radiant/25 text-radiant" : "bg-dire/25 text-dire"
            }`}
          >
            {result}
          </span>
        ))}
      </div>
    </Panel>
  );
}

function HeroThumb({ hero }: { hero: HeroInfo }) {
  return (
    <span className="relative block h-[2.2rem] w-[3.9rem] shrink-0 overflow-hidden rounded-[0.4rem] bg-white/10">
      {hero.slug && <Image unoptimized src={heroPortrait(hero.slug)} alt={hero.name} fill sizes="4rem" className="object-cover" />}
    </span>
  );
}

function Records({ summary }: { summary: PlayerSummary }) {
  return (
    <Panel title="Records">
      <ul className="flex flex-col gap-[0.7rem]">
        {summary.records.map((record) => (
          <li key={record.label}>
            <Link
              href={`/matches/${record.matchId}`}
              title={`Open the match: ${record.label.toLowerCase()} on ${record.hero.name}`}
              className="group -mx-[0.4rem] flex items-center gap-[0.8rem] rounded-[0.6rem] px-[0.4rem] py-[0.15rem] transition-colors hover:bg-white/5"
            >
              <HeroThumb hero={record.hero} />
              <span className="min-w-0 flex-1 text-[1.1rem] text-white/75 group-hover:text-white">{record.label}</span>
              <span className="font-display text-[1.6rem] leading-none">{record.value.toLocaleString("en-US")}</span>
            </Link>
          </li>
        ))}
      </ul>
    </Panel>
  );
}

function Averages({ summary }: { summary: PlayerSummary }) {
  const { kills, deaths, assists, gpm, xpm, lastHits } = summary.averages;
  const stats = [
    { label: "Kills", value: kills.toFixed(1) },
    { label: "Deaths", value: deaths.toFixed(1) },
    { label: "Assists", value: assists.toFixed(1) },
    { label: "GPM", value: String(Math.round(gpm)) },
    { label: "XPM", value: String(Math.round(xpm)) },
    { label: "Last hits", value: String(Math.round(lastHits)) },
  ];
  return (
    <Panel title="Averages">
      <dl className="grid grid-cols-3 gap-x-[1rem] gap-y-[1rem]">
        {stats.map((stat) => (
          <div key={stat.label}>
            <dt className="text-[1rem] uppercase tracking-wider text-white/55">{stat.label}</dt>
            <dd className="font-display text-[2rem] leading-none">{stat.value}</dd>
          </div>
        ))}
      </dl>
    </Panel>
  );
}

/** `children` render below the panels (the Stats page streams Playstyle in there). */
export function PlayerStats({ summary, children }: { summary: PlayerSummary; children?: React.ReactNode }) {
  return (
    <div className="relative z-20 px-[1.3rem] lg:max-w-[62rem] lg:px-0">
      <HeroHeadline summary={summary} />

      <div className="mt-[2.2rem] grid gap-[1.2rem] md:grid-cols-3">
        <Last100 summary={summary} />
        <Records summary={summary} />
        <Averages summary={summary} />
      </div>
      <div className="mt-[1.2rem] flex flex-col gap-[1.2rem]">
        <MoreStats summary={summary} />
        {children}
      </div>
    </div>
  );
}
