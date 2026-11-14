import Image from "next/image";
import { formatDuration } from "@/lib/format";
import type { MatchView } from "@/types/match-view";

const OBJECTIVES = new Set(["roshan", "aegis", "tower"]);

/** The followed player's full item build with timings, then chat and objectives in time order. */
export function LogTab({ view, followed }: { view: MatchView; followed: number }) {
  const log = view.log;
  if (!log) return null;
  const you = view.players.find((player) => player.slot === followed) ?? view.players[0];
  const nameOf = new Map(view.players.map((player) => [player.slot, player.hero.name]));

  const timeline = [
    ...log.chat.map((line) => ({ time: line.time, kind: "chat" as const, text: `${line.slot === null ? "" : `${nameOf.get(line.slot) ?? "?"}: `}${line.text}` })),
    ...view.events.filter((event) => OBJECTIVES.has(event.kind)).map((event) => ({ time: event.time, kind: "objective" as const, text: event.label })),
  ].sort((a, b) => a.time - b.time);

  return (
    <div className="grid gap-[1.2rem] xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <section className="glass-panel rounded-[1.6rem] p-[1.2rem]">
        <h2 className="font-display text-[1.3rem] uppercase tracking-[0.06em] text-white/75">{you.hero.name} · item build</h2>
        <ol className="mt-[0.8rem] flex flex-wrap gap-[0.6rem]">
          {(log.purchases[you.slot] ?? []).map((purchase, index) => {
            const item = log.items[purchase.key];
            return item ? (
              <li key={`${purchase.key}-${index}`} className="flex w-[3.2rem] flex-col items-center gap-[0.2rem]" title={item.name}>
                <span className={`relative block h-[1.9rem] w-[2.6rem] overflow-hidden rounded-[0.3rem] ${item.cost >= 2000 ? "ring-1 ring-accent/70" : "ring-1 ring-white/10"}`}>
                  <Image unoptimized src={item.image} alt={item.name} fill sizes="2.6rem" className="object-cover" />
                </span>
                <span className="text-[0.75rem] tabular-nums text-white/55">{formatDuration(purchase.time)}</span>
              </li>
            ) : null;
          })}
        </ol>
      </section>
      <section className="glass-panel rounded-[1.6rem] p-[1.2rem]">
        <h2 className="font-display text-[1.3rem] uppercase tracking-[0.06em] text-white/75">Chat & objectives</h2>
        <ol className="mt-[0.8rem] flex max-h-[28rem] flex-col gap-[0.3rem] overflow-y-auto pr-[0.4rem]">
          {timeline.length === 0 && <li className="text-white/45">Nothing recorded.</li>}
          {timeline.map((entry, index) => (
            <li key={`${entry.time}-${index}`} className="flex gap-[0.8rem] text-[0.95rem]">
              <span className="w-[3.4rem] shrink-0 text-right tabular-nums text-white/45">{formatDuration(Math.max(0, entry.time))}</span>
              <span className={entry.kind === "objective" ? "text-accent" : "text-white/80"}>{entry.text}</span>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
