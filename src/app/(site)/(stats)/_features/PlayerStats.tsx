import Image from "next/image";
import Link from "next/link";
import { CountUp } from "@/app/(site)/_components/CountUp";
import { HeroHeadline } from "../_components/HeroHeadline";
import { MoreStats } from "../_components/MoreStats";
import { StatPanel as Panel } from "../_components/StatPanel";
import { heroPortrait } from "@/app/(site)/_utils/hero-images";
import type { FormTrend } from "../_utils/coach-types";
import type { HeroInfo, PlayerSummary } from "@/types/opendota";
import { getWords } from "@/lib/i18n/server";
import type { Words } from "@/lib/i18n/words";

const compact = new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 });

function Last100({ summary, words }: { summary: PlayerSummary; words: Words }) {
  const { wins, losses, last10 } = summary;
  const winRate = Math.round((wins / (wins + losses)) * 100);
  return (
    <Panel title={words.stats.lastMatches(wins + losses)}>
      <p className="flex items-baseline gap-[0.8rem] font-display leading-none">
        <span className="text-[2.8rem] text-radiant">
          <CountUp value={wins} suffix="W" />
        </span>
        <span className="text-[1.7rem] text-white/40">/</span>
        <span className="text-[2.8rem] text-dire">
          <CountUp value={losses} suffix="L" />
        </span>
      </p>
      <div
        className="mt-[0.7rem] flex h-[0.5rem] overflow-hidden rounded-full bg-dire"
        role="meter"
        aria-label={words.stats.winRate}
        aria-valuenow={winRate}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <span className="grow-x bg-radiant" style={{ width: `${winRate}%` }} />
      </div>
      <p className="mt-[0.4rem] text-[1rem] text-white/70">
        <CountUp value={winRate} suffix="%" /> {words.stats.winRateLower}
      </p>
      <div className="mt-[0.8rem] flex flex-wrap items-center gap-[0.3rem]" aria-label={words.stats.lastResults(last10.length, last10.join(" "))}>
        {last10.map((result, i) => (
          <span
            key={i}
            style={{ animationDelay: `${300 + i * 45}ms` }}
            className={`pop-in grid size-[1.45rem] place-items-center rounded-[0.3rem] text-[0.85rem] font-semibold ${
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
    <span className="relative block h-[1.8rem] w-[3.2rem] shrink-0 overflow-hidden rounded-[0.35rem] bg-white/10">
      {hero.slug && <Image unoptimized src={heroPortrait(hero.slug)} alt={hero.name} fill sizes="4rem" className="object-cover transition-transform duration-300 group-hover:scale-110" />}
    </span>
  );
}

function Records({ summary, words }: { summary: PlayerSummary; words: Words }) {
  return (
    <Panel title={words.stats.records}>
      <ul className="flex flex-col gap-[0.45rem]">
        {summary.records.map((record) => (
          <li key={record.label}>
            <Link
              href={`/matches/${record.matchId}`}
              title={words.stats.openRecord(words.stats.recordLabels[record.label], record.hero.name)}
              className="group -mx-[0.4rem] flex items-center gap-[0.8rem] rounded-[0.6rem] px-[0.4rem] py-[0.15rem] transition-colors hover:bg-white/5"
            >
              <HeroThumb hero={record.hero} />
              <span className="min-w-0 flex-1 truncate text-[1rem] text-white/75 group-hover:text-white">{words.stats.recordLabels[record.label]}</span>
              <span className="font-display text-[1.4rem] leading-none transition-colors group-hover:text-accent">{compact.format(record.value)}</span>
            </Link>
          </li>
        ))}
      </ul>
    </Panel>
  );
}

function Averages({ summary, words }: { summary: PlayerSummary; words: Words }) {
  const label = words.stats.averageLabels;
  const { kills, deaths, assists, kda, gpm, xpm, lastHits, heroDamage } = summary.averages;
  const stats = [
    { label: label.kills, value: kills.toFixed(1) },
    { label: label.deaths, value: deaths.toFixed(1) },
    { label: label.assists, value: assists.toFixed(1) },
    { label: label.kda, value: kda.toFixed(1) },
    { label: label.gpm, value: String(Math.round(gpm)) },
    { label: label.xpm, value: String(Math.round(xpm)) },
    { label: label.lastHits, value: String(Math.round(lastHits)) },
    { label: label.heroDamage, value: compact.format(heroDamage) },
  ];
  return (
    <Panel title={words.stats.averages}>
      <dl className="grid grid-cols-4 gap-x-[0.8rem] gap-y-[0.9rem]">
        {stats.map((stat) => (
          <div key={stat.label} className="min-w-0">
            <dt className="truncate text-[0.85rem] uppercase tracking-wider text-white/55">{stat.label}</dt>
            <dd className="font-display text-[1.7rem] leading-none">{stat.value}</dd>
          </div>
        ))}
      </dl>
    </Panel>
  );
}

/** Left column of the Stats page. `children` render last (the Stats page streams Playstyle in there). */
export async function PlayerStats({ summary, form, children }: { summary: PlayerSummary; form: FormTrend | null; children?: React.ReactNode }) {
  const words = await getWords();
  return (
    <div className="relative z-20 flex min-w-0 flex-col gap-[1.1rem] px-[1.3rem] lg:px-0">
      <HeroHeadline summary={summary} />
      <div className="stagger grid gap-[1.1rem] md:grid-cols-3">
        <Last100 summary={summary} words={words} />
        <Averages summary={summary} words={words} />
        <Records summary={summary} words={words} />
      </div>
      <MoreStats summary={summary} form={form} />
      {children}
    </div>
  );
}
