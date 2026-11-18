"use client";

import { Pause, Play } from "lucide-react";
import { formatDuration } from "@/lib/format";
import type { MatchEvent } from "../_utils/match-view-types";
import { useWords } from "@/lib/i18n/use-words";

export const PLAYBACK_SPEEDS = [30, 60] as const;
export type PlaybackSpeed = (typeof PLAYBACK_SPEEDS)[number];

const markerStyle: Record<MatchEvent["kind"], string> = {
  kill: "size-[0.7rem] rounded-full bg-radiant",
  death: "size-[0.7rem] rounded-full bg-dire",
  item: "size-[0.65rem] rounded-[0.15rem] bg-accent",
  roshan: "size-[0.7rem] rotate-45 bg-[#c6a2ff]",
  aegis: "size-[0.7rem] rotate-45 bg-[#c6a2ff]",
  tower: "h-[0.8rem] w-[0.25rem] rounded-full bg-white/60",
  teamfight: "size-[0.8rem] rounded-full ring-2 ring-white/70",
};

interface ScrubberProps {
  duration: number;
  time: number;
  onTime: (time: number) => void;
  markers: MatchEvent[];
  playing: boolean;
  onTogglePlay: () => void;
  speed: PlaybackSpeed;
  onSpeed: (speed: PlaybackSpeed) => void;
  /** False under prefers-reduced-motion: no playback, scrubbing only. */
  canPlay: boolean;
}

/** One time cursor for the whole match: drag, click a key moment, or play. */
export function TimeScrubber({ duration, time, onTime, markers, playing, onTogglePlay, speed, onSpeed, canPlay }: ScrubberProps) {
  const say = useWords().match.scrubber;
  const percent = (seconds: number) => `${(Math.min(duration, Math.max(0, seconds)) / duration) * 100}%`;

  return (
    <div className="glass-panel flex flex-col gap-[0.6rem] rounded-[1.4rem] px-[1.2rem] py-[0.9rem]">
      <div className="flex items-center gap-[1rem]">
        {canPlay && (
          <button
            type="button"
            onClick={onTogglePlay}
            aria-label={playing ? say.pause : say.play}
            className="grid size-[2.6rem] shrink-0 place-items-center rounded-full bg-accent text-ink shadow-[0_0_1.2rem_rgb(254_186_135/0.45)] transition-transform hover:scale-105 active:scale-95"
          >
            {playing ? <Pause className="size-[1.2rem]" /> : <Play className="ml-[0.1rem] size-[1.2rem]" />}
          </button>
        )}
        <div className="relative h-[2.6rem] flex-1">
          {/* Key moments; clicking one jumps the cursor there */}
          <div className="pointer-events-none absolute inset-x-0 top-[0.2rem] h-[1rem]">
            {markers.map((marker, index) => (
              <button
                key={`${marker.kind}-${marker.time}-${index}`}
                type="button"
                title={`${formatDuration(Math.max(0, marker.time))} · ${marker.label}`}
                aria-label={say.jump(formatDuration(Math.max(0, marker.time)), marker.label)}
                onClick={() => onTime(Math.max(0, marker.time))}
                className="pointer-events-auto absolute top-1/2 grid size-[1.4rem] -translate-x-1/2 -translate-y-1/2 place-items-center"
                style={{ left: percent(marker.time) }}
              >
                <span className={`block transition-transform hover:scale-150 ${markerStyle[marker.kind]}`} />
              </button>
            ))}
          </div>
          <input
            type="range"
            min={0}
            max={duration}
            step={1}
            value={Math.round(time)}
            onChange={(event) => onTime(Number(event.target.value))}
            aria-label={say.time}
            aria-valuetext={formatDuration(Math.round(time))}
            className="absolute inset-x-0 bottom-0 w-full accent-[#feba87]"
          />
        </div>
        <span className="w-[5.5rem] shrink-0 text-right font-display text-[1.5rem] tabular-nums text-white">
          {formatDuration(Math.round(time))}
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-x-[1rem] gap-y-[0.3rem] text-[0.85rem] text-white/50">
        <span className="flex items-center gap-[0.35rem]"><i className={markerStyle.kill} /> {say.kill}</span>
        <span className="flex items-center gap-[0.35rem]"><i className={markerStyle.death} /> {say.death}</span>
        <span className="flex items-center gap-[0.35rem]"><i className={markerStyle.item} /> {say.bigItem}</span>
        <span className="flex items-center gap-[0.35rem]"><i className={markerStyle.roshan} /> Roshan</span>
        <span className="flex items-center gap-[0.35rem]"><i className={markerStyle.teamfight} /> {say.teamfight}</span>
        {canPlay && (
          <span className="ml-auto flex items-center gap-[0.3rem]">
            {say.speed}
            {PLAYBACK_SPEEDS.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => onSpeed(option)}
                aria-pressed={speed === option}
                className={`rounded-full px-[0.6rem] py-[0.1rem] ${speed === option ? "bg-white/15 text-white" : "hover:text-white"}`}
              >
                {option}x
              </button>
            ))}
          </span>
        )}
      </div>
    </div>
  );
}
