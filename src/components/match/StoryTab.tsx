"use client";

import Image from "next/image";
import { linePath, valueRange } from "@/lib/chart-paths";
import { formatDuration } from "@/lib/format";
import { nearestEvents } from "@/lib/match-view-timeline";
import type { MatchView, ScoreboardPlayer } from "@/types/match-view";

const WIDTH = 600;
const HEIGHT = 140;
const LANING_MINUTE = 10;
const MOMENT_WINDOW_SECONDS = 45;

const at = (series: number[] | undefined, minute: number) => series?.[minute];
const show = (value: number | undefined) => (value === undefined ? "—" : value.toLocaleString("en-US"));

function LaneCard({ view, you, rival }: { view: MatchView; you: ScoreboardPlayer; rival: ScoreboardPlayer }) {
  const series = view.series;
  const rows = [
    { label: "Last hits @10", mine: at(series?.lastHits[you.slot], LANING_MINUTE), theirs: at(series?.lastHits[rival.slot], LANING_MINUTE) },
    { label: "Net worth @10", mine: at(series?.netWorth[you.slot], LANING_MINUTE), theirs: at(series?.netWorth[rival.slot], LANING_MINUTE) },
    { label: "XP @10", mine: at(series?.xp[you.slot], LANING_MINUTE), theirs: at(series?.xp[rival.slot], LANING_MINUTE) },
  ];
  return (
    <dl className="grid grid-cols-[1fr_auto_auto] items-baseline gap-x-[1.2rem] gap-y-[0.4rem] text-[1.05rem]">
      <span />
      <span className="text-[0.8rem] uppercase tracking-wider text-accent">{you.hero.name}</span>
      <span className="text-[0.8rem] uppercase tracking-wider text-white/50">{rival.hero.name}</span>
      {rows.map((row) => {
        const ahead = row.mine !== undefined && row.theirs !== undefined && row.mine > row.theirs;
        return [
          <dt key={`${row.label}-l`} className="text-white/60">{row.label}</dt>,
          <dd key={`${row.label}-m`} className={`text-right font-display text-[1.5rem] tabular-nums ${ahead ? "text-radiant" : "text-white"}`}>{show(row.mine)}</dd>,
          <dd key={`${row.label}-t`} className="text-right font-display text-[1.5rem] tabular-nums text-white/60">{show(row.theirs)}</dd>,
        ];
      })}
    </dl>
  );
}

function NetWorthDuel({ view, you, rival, time }: { view: MatchView; you: ScoreboardPlayer; rival: ScoreboardPlayer | null; time: number }) {
  const mine = view.series?.netWorth[you.slot] ?? [];
  const theirs = rival ? (view.series?.netWorth[rival.slot] ?? []) : [];
  const points = Math.max(mine.length, theirs.length);
  const range = valueRange([mine, theirs]);
  const cursorX = points > 1 ? Math.min(1, time / 60 / (points - 1)) * WIDTH : 0;
  if (points < 2) return null;
  return (
    <figure className="flex flex-col gap-[0.4rem]">
      <figcaption className="text-[0.8rem] uppercase tracking-[0.14em] text-white/50">
        Net worth · <span className="text-accent">{you.hero.name}</span>
        {rival && <> vs <span className="text-white/70">{rival.hero.name}</span></>}
      </figcaption>
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} preserveAspectRatio="none" className="h-[9rem] w-full" role="img" aria-label="Net worth over time">
        {rival && <path d={linePath(theirs, WIDTH, HEIGHT, range, points)} className="fill-none stroke-white/45" strokeWidth={2} strokeDasharray="5 4" vectorEffect="non-scaling-stroke" />}
        <path d={linePath(mine, WIDTH, HEIGHT, range, points)} className="fill-none stroke-accent drop-shadow-[0_0_6px_rgb(254_186_135/0.6)]" strokeWidth={2.5} vectorEffect="non-scaling-stroke" />
        <line x1={cursorX} x2={cursorX} y1={0} y2={HEIGHT} className="stroke-white/70" strokeWidth={1} vectorEffect="non-scaling-stroke" />
      </svg>
    </figure>
  );
}

/** "Story" tab: the followed player's lane duel and what happened around the cursor. */
export function StoryTab({ view, followed, time }: { view: MatchView; followed: number; time: number }) {
  const you = view.players.find((player) => player.slot === followed) ?? view.players[0];
  const rivalSlot = view.laneOpponent[you.slot];
  const rival = view.players.find((player) => player.slot === rivalSlot) ?? null;
  const relevant = view.events.filter((event) => event.slot === you.slot || event.slot === null);
  const moments = nearestEvents(relevant, time, MOMENT_WINDOW_SECONDS, 5);

  return (
    <div className="grid gap-[1.2rem] lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
      <section className="glass-panel flex flex-col gap-[1.2rem] rounded-[1.6rem] p-[1.4rem]">
        <h2 className="font-display text-[1.4rem] uppercase tracking-[0.06em] text-white/70">
          {rival ? `Lane · ${you.hero.name} vs ${rival.hero.name}` : `${you.hero.name} had no lane opponent`}
        </h2>
        {rival && <LaneCard view={view} you={you} rival={rival} />}
        <NetWorthDuel view={view} you={you} rival={rival} time={time} />
      </section>
      <section className="glass-panel flex flex-col gap-[0.8rem] rounded-[1.6rem] p-[1.4rem]">
        <h2 className="font-display text-[1.4rem] uppercase tracking-[0.06em] text-white/70">Around {formatDuration(Math.round(time))}</h2>
        {moments.length === 0 && <p className="text-white/50">Quiet moment. Drag the timeline or press play.</p>}
        {/* Only the moments are announced; the heading's clock changes every second during playback. */}
        <ul className="flex flex-col gap-[0.6rem]" aria-live="polite">
          {moments.map((moment, index) => (
            <li key={`${moment.kind}-${moment.time}-${index}`} className="flex items-center gap-[0.7rem] animate-[fadeIn_300ms_ease-out] motion-reduce:animate-none">
              <span className="w-[3.6rem] shrink-0 text-right text-[0.9rem] tabular-nums text-white/45">{formatDuration(Math.max(0, moment.time))}</span>
              {moment.image && (
                <span className="relative block h-[1.6rem] w-[2.2rem] shrink-0 overflow-hidden rounded-[0.25rem]">
                  <Image unoptimized src={moment.image} alt="" fill sizes="2.2rem" className="object-cover" />
                </span>
              )}
              <span className={moment.kind === "kill" ? "text-radiant" : moment.kind === "death" ? "text-dire" : "text-white/85"}>{moment.label}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
