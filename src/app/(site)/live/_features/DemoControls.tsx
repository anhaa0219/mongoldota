"use client";

import { FastForward, Pause, Play, RotateCcw, Square, type LucideIcon } from "lucide-react";
import { formatDuration } from "@/lib/format";
import { useWords } from "@/lib/i18n/use-words";
import { useDemoReplay } from "../_hooks/use-demo-replay";

function DemoButton({ icon: Icon, label, isActive, onClick }: { icon: LucideIcon; label: string; isActive?: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={isActive}
      className="flex items-center gap-[0.4rem] rounded-full bg-white/[0.07] px-[0.9rem] py-[0.4rem] text-[0.95rem] text-white/85 transition-colors hover:bg-white/[0.14] aria-pressed:bg-accent aria-pressed:text-ink"
    >
      <Icon className="size-[1rem]" aria-hidden="true" />
      {label}
    </button>
  );
}

/** Demo day: Play, 2×, Pause, Stop and Reset for the replay of the demo match, above the Live Coach view. */
export function DemoControls({ duration, initialClock }: { duration: number; initialClock: number | null }) {
  const words = useWords().live.demo;
  const demo = useDemoReplay(initialClock);
  const position = demo.clock === null ? words.notStarted : `${formatDuration(demo.clock)} / ${formatDuration(duration)}`;

  return (
    <section aria-label={words.label} className="glass-panel flex flex-wrap items-center gap-[0.6rem] rounded-[1.2rem] px-[1rem] py-[0.6rem]">
      <span className="text-[0.8rem] uppercase tracking-[0.12em] text-white/50">{words.label}</span>
      <span className="min-w-[6.5rem] tabular-nums text-[1rem] text-white/85">{position}</span>
      <DemoButton icon={Play} label={words.play} isActive={demo.mode.isPlaying && demo.mode.speed === 1} onClick={() => demo.play(1)} />
      <DemoButton icon={FastForward} label={words.fast} isActive={demo.mode.isPlaying && demo.mode.speed === 2} onClick={() => demo.play(2)} />
      <DemoButton icon={Pause} label={words.pause} onClick={demo.pause} />
      <DemoButton icon={Square} label={words.stop} onClick={demo.stop} />
      <DemoButton icon={RotateCcw} label={words.reset} onClick={demo.reset} />
      {demo.hasFailed && (
        <p role="alert" className="text-[0.9rem] text-dire">
          {words.failed}
        </p>
      )}
    </section>
  );
}
