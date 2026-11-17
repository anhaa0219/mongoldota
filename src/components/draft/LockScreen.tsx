"use client";

import { ArrowLeft, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
import { AdviceList } from "@/components/draft/AdviceList";
import { LanePreview } from "@/components/draft/LanePreview";
import { LineupColumn } from "@/components/draft/LineupColumn";
import { SideSwitch } from "@/components/draft/SideSwitch";
import { assignPosition, guessPositions, laneOpponentPositions, lanePartnerPositions } from "@/lib/draft-lanes";
import { adviceRequestKey, lineupKey, LOCK_KEY, lockSchema, type SavedLock } from "@/lib/draft-storage";
import { useLockedDraftSync } from "@/lib/use-locked-draft-sync";
import { useStoredState } from "@/lib/use-stored-state";
import type { AdviceItem, AdviceResponse, DraftHero, DraftSlots, PlacedHero, Position } from "@/types/draft";
import type { Side } from "@/types/game";

const FAILED = "The coach could not answer. Try again.";

/** Only in-flight states live here; finished advice is saved in the browser (see useStoredState). */
type Request = { kind: "idle" } | { kind: "loading" } | { kind: "error"; message: string };
type Status = Request | { kind: "done"; advice: AdviceItem[] };

const NO_SAVED_LOCK: SavedLock = null;
const toMap = (pairs: [number, Position][]) => new Map(pairs);

interface LockScreenProps {
  draft: DraftSlots;
  heroById: Map<number, DraftHero>;
  mySide: Side;
  onSideChange: (side: Side) => void;
  onUnlock: () => void;
}

async function requestAdvice(body: { myHeroId: number; allies: PlacedHero[]; enemies: PlacedHero[] }): Promise<AdviceResponse> {
  try {
    const response = await fetch("/api/draft/advice", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    return (await response.json()) as AdviceResponse;
  } catch {
    return { error: FAILED };
  }
}

const placed = (heroes: DraftHero[], positions: Map<number, Position>): PlacedHero[] =>
  heroes.flatMap((hero) => {
    const position = positions.get(hero.id);
    return position ? [{ heroId: hero.id, position }] : [];
  });

/**
 * After "Lock draft": choose side, mark your hero, check positions, see your lane, then get 12 tips.
 * Choices and the advice are saved in this browser for this exact lineup, so a refresh never asks the AI twice.
 */
export function LockScreen({ draft, heroById, mySide, onSideChange, onUnlock }: LockScreenProps) {
  const teamOf = (side: Side) => draft[side].flatMap((heroId) => (heroId === null ? [] : (heroById.get(heroId) ?? [])));
  const teams = { radiant: teamOf("radiant"), dire: teamOf("dire") };
  const lineup = lineupKey(draft);
  const [stored, setStored] = useStoredState(LOCK_KEY, lockSchema, NO_SAVED_LOCK);
  const saved = stored?.lineup === lineup ? stored : null;
  // A first guess for each hero's position; the player's own changes are saved instead.
  const guessed = useMemo(() => {
    const heroesOf = (side: Side) => draft[side].flatMap((heroId) => (heroId === null ? [] : (heroById.get(heroId) ?? [])));
    return { radiant: guessPositions(heroesOf("radiant")), dire: guessPositions(heroesOf("dire")) };
  }, [draft, heroById]);
  const positions = saved ? { radiant: toMap(saved.positions.radiant), dire: toMap(saved.positions.dire) } : guessed;
  const chosenId = saved?.chosenId ?? null;
  const [request, setRequest] = useState<Request>({ kind: "idle" });

  const save = (changes: Partial<NonNullable<SavedLock>>) => {
    const next = { radiant: [...positions.radiant], dire: [...positions.dire] };
    setStored({ lineup, positions: next, chosenId, advice: saved?.advice ?? null, ...changes });
  };

  const enemySide: Side = mySide === "radiant" ? "dire" : "radiant";
  const myTeam = teams[mySide];
  const enemyTeam = teams[enemySide];
  const myHeroId = myTeam.some((hero) => hero.id === chosenId) ? chosenId : myTeam.length === 1 ? myTeam[0].id : null;
  const myPosition = myHeroId === null ? null : (positions[mySide].get(myHeroId) ?? null);
  const inPositions = (side: Side, wanted: Position[]) => (hero: DraftHero) => {
    const position = positions[side].get(hero.id);
    return position !== undefined && wanted.includes(position);
  };
  const partners = myPosition ? myTeam.filter((hero) => hero.id === myHeroId || inPositions(mySide, lanePartnerPositions(myPosition))(hero)) : [];
  const opponents = myPosition ? enemyTeam.filter(inPositions(enemySide, laneOpponentPositions(myPosition))) : [];

  useLockedDraftSync(
    myHeroId === null
      ? null
      : { side: mySide, myHeroId, allies: placed(myTeam, positions[mySide]), enemies: placed(enemyTeam, positions[enemySide]) },
  );

  const setPosition = (side: Side) => (heroId: number, position: Position) =>
    save({ positions: { radiant: [...positions.radiant], dire: [...positions.dire], [side]: [...assignPosition(positions[side], heroId, position)] } });
  const setChosenId = (heroId: number) => save({ chosenId: heroId });

  // Saved advice shows only while the side, hero and every position are what it was written for.
  const requestKey = myHeroId === null ? null : adviceRequestKey(mySide, myHeroId, positions);
  const savedAdvice = saved?.advice && saved.advice.request === requestKey ? saved.advice.items : null;
  const status: Status = request.kind === "idle" && savedAdvice ? { kind: "done", advice: savedAdvice } : request;

  const ask = async () => {
    if (myHeroId === null || requestKey === null) return;
    setRequest({ kind: "loading" });
    const result = await requestAdvice({ myHeroId, allies: placed(myTeam, positions[mySide]), enemies: placed(enemyTeam, positions[enemySide]) });
    if (!("advice" in result)) {
      setRequest({ kind: "error", message: result.error });
      return;
    }
    save({ advice: { request: requestKey, items: result.advice } });
    setRequest({ kind: "idle" });
  };

  return (
    <section aria-label="Locked draft" className="stagger relative z-20 flex min-h-0 flex-1 flex-col gap-[0.9rem]">
      <div className="glass-panel flex flex-col gap-[0.9rem] rounded-[1.4rem] p-[1rem]">
        <div className="flex items-center justify-between gap-[1rem]">
          <h2 className="font-display text-[1.6rem] uppercase tracking-[0.06em] text-white">Lock in</h2>
          <button type="button" onClick={onUnlock} className="flex items-center gap-[0.4rem] rounded-full bg-white/[0.08] px-[1rem] py-[0.4rem] text-[0.92rem] text-white/80 hover:bg-white/[0.14]">
            <ArrowLeft className="size-[1rem]" aria-hidden="true" />
            Back to draft
          </button>
        </div>
        <SideSwitch mySide={mySide} teams={teams} onChange={onSideChange} />
        <div className="grid gap-[1rem] lg:grid-cols-[minmax(0,1fr)_minmax(13rem,auto)_minmax(0,1fr)]">
          <LineupColumn title="Your team" tone={mySide} heroes={myTeam} positions={positions[mySide]} onPosition={setPosition(mySide)} myHeroId={myHeroId} onChooseMe={setChosenId} />
          <LanePreview position={myPosition} myHeroId={myHeroId} partners={partners} opponents={opponents} />
          <LineupColumn title="Enemy team" tone={enemySide} heroes={enemyTeam} positions={positions[enemySide]} onPosition={setPosition(enemySide)} />
        </div>
        <button
          type="button"
          disabled={myHeroId === null || status.kind === "loading"}
          onClick={ask}
          className="flex items-center justify-center gap-[0.6rem] self-center rounded-full bg-accent px-[2.4rem] py-[0.75rem] font-display text-[1.3rem] uppercase tracking-[0.06em] text-ink shadow-[0_0_1.6rem_rgb(254_186_135/0.4)] transition hover:brightness-110 disabled:opacity-40 disabled:shadow-none"
        >
          <Sparkles className="size-[1.2rem]" aria-hidden="true" />
          {status.kind === "loading" ? "Coach is thinking…" : status.kind === "done" ? "Ask again" : myHeroId === null ? "Tap your hero first" : "Get advice"}
        </button>
      </div>

      {status.kind !== "idle" && (
        <div className="glass-panel min-h-0 flex-1 overflow-y-auto rounded-[1.4rem] p-[1rem]" aria-live="polite">
          {status.kind === "loading" && <p className="text-[0.98rem] text-white/60">Reading OpenDota data for this lineup and writing 12 tips… (usually 5–30 seconds)</p>}
          {status.kind === "error" && <p className="text-[0.98rem] text-dire">{status.message}</p>}
          {status.kind === "done" && <AdviceList advice={status.advice} />}
          <p className="mt-[0.8rem] text-[0.85rem] text-white/45">
            Numbers (matchups, item and BKB timings, game length) are real OpenDota data. The tips are written by AI (Qwen) and can get small ability details wrong.
          </p>
        </div>
      )}
    </section>
  );
}
