import type { LockedDraft } from "@/types/live";

interface DraftStripProps {
  draft: LockedDraft | null;
  heroNames: Map<number, string>;
  /** The hero the player is actually playing (from Dota). */
  liveHeroId: number;
}

/** The locked draft the coach uses, or why it can't: no draft yet, or a draft for a different hero. */
export function DraftStrip({ draft, heroNames, liveHeroId }: DraftStripProps) {
  const name = (heroId: number) => heroNames.get(heroId) ?? `Hero ${heroId}`;

  if (!draft) {
    return (
      <p className="glass-panel rounded-[1.2rem] px-[1rem] py-[0.7rem] text-[0.95rem] text-white/70">
        Lock your draft on the Draft page for better advice.{" "}
        <a href="/draft" className="text-accent hover:underline">
          Open Draft
        </a>
      </p>
    );
  }

  if (draft.myHeroId !== liveHeroId) {
    return (
      <p className="glass-panel rounded-[1.2rem] px-[1rem] py-[0.7rem] text-[0.95rem] text-white/80">
        Your draft says {name(draft.myHeroId)} but you&apos;re playing {name(liveHeroId)} — update the draft?{" "}
        <a href="/draft" className="text-accent hover:underline">
          Open Draft
        </a>
      </p>
    );
  }

  const team = (side: "radiant" | "dire", heroes: LockedDraft["allies"]) => (
    <p className="min-w-0 truncate">
      <span className={side === "radiant" ? "text-radiant" : "text-dire"}>●</span> {heroes.map((hero) => name(hero.heroId)).join(", ")}
    </p>
  );
  const enemySide = draft.side === "radiant" ? "dire" : "radiant";

  return (
    <div className="glass-panel flex flex-wrap items-center gap-x-[1rem] gap-y-[0.3rem] rounded-[1.2rem] px-[1rem] py-[0.7rem] text-[0.95rem] text-white/80">
      <span className="text-[0.8rem] uppercase tracking-[0.12em] text-white/50">Your draft</span>
      {team(draft.side, draft.allies)}
      <span className="text-white/40">vs</span>
      {team(enemySide, draft.enemies)}
    </div>
  );
}
