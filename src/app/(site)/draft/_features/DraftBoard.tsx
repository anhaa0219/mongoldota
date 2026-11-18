"use client";

import { Lock, RotateCcw } from "lucide-react";
import { useMemo, useState } from "react";
import { clearSlot, emptyDraft, firstEmpty, firstEmptyOn, isPicked, pickHero } from "@/lib/draft/draft";
import { usePreference } from "@/app/(site)/_hooks/use-preference";
import { useStoredState } from "@/app/(site)/_hooks/use-stored-state";
import type { DraftHero, DraftSlots, PersonalRecord, SlotRef } from "@/types/draft";
import type { Side } from "@/types/game";
import { HeroGrid } from "../_components/HeroGrid";
import { SidePicker } from "../_components/SidePicker";
import { TeamSlots } from "../_components/TeamSlots";
import { BOARD_KEY, boardSchema, EMPTY_BOARD } from "../_utils/draft-storage";
import { LockScreen } from "./LockScreen";
import { ScreenshotReader } from "./ScreenshotReader";
import { SuggestionPanel } from "./SuggestionPanel";
import { useWords } from "@/lib/i18n/use-words";

const SIDES: readonly Side[] = ["radiant", "dire"];

/**
 * The Draft page: 5 + 5 slots, filled by clicking heroes or from a screenshot, with counter picks for my team.
 * The picks and the locked state are saved in this browser, so a refresh keeps them.
 */
export function DraftBoard({
  heroes,
  personal,
}: {
  heroes: DraftHero[];
  personal: Record<number, PersonalRecord>;
}) {
  const [board, setBoard] = useStoredState(BOARD_KEY, boardSchema, EMPTY_BOARD);
  const words = useWords().draft;
  const { draft, locked: isLocked } = board;
  const setDraft = (next: DraftSlots) => setBoard((current) => ({ ...current, draft: next }));
  const setIsLocked = (locked: boolean) => setBoard((current) => ({ ...current, locked }));
  // The slot a click fills: the one the player chose, or else the first empty one.
  const [chosenSlot, setSelected] = useState<SlotRef | null>(null);
  const selected = chosenSlot ?? firstEmpty(draft);
  const [mySide, setMySide] = usePreference<Side>(
    "draft-side",
    SIDES,
    "radiant",
  );
  const heroById = useMemo(
    () => new Map(heroes.map((hero) => [hero.id, hero])),
    [heroes],
  );
  const enemySide: Side = mySide === "radiant" ? "dire" : "radiant";
  const enemyIds = draft[enemySide].filter(
    (heroId): heroId is number => heroId !== null,
  );
  const canLock = draft.radiant.some((heroId) => heroId !== null) && draft.dire.some((heroId) => heroId !== null);
  const picked = new Set(
    [...draft.radiant, ...draft.dire].filter(
      (heroId): heroId is number => heroId !== null,
    ),
  );

  const pick = (heroId: number, target: SlotRef | null = selected) => {
    const result = pickHero(draft, heroId, target);
    setDraft(result.draft);
    setSelected(result.next);
  };
  const clear = (slot: SlotRef) => {
    setDraft(clearSlot(draft, slot));
    setSelected(slot);
  };
  const replace = (next: DraftSlots) => {
    setDraft(next);
    setSelected(null);
  };
  const slotProps = {
    heroes: heroById,
    selected,
    onSelect: setSelected,
    onClear: clear,
  };

  if (isLocked) {
    return <LockScreen draft={draft} heroById={heroById} mySide={mySide} onSideChange={setMySide} onUnlock={() => setIsLocked(false)} />;
  }

  return (
    <div className="stagger relative z-20 flex min-h-0 flex-1 flex-col gap-[1rem]">
      <div className="glass-panel flex flex-col gap-[0.8rem] rounded-[1.4rem] p-[1.1rem] md:flex-row md:items-start md:gap-[1.4rem]">
        <TeamSlots side="radiant" heroIds={draft.radiant} {...slotProps} />
        <span className="self-center font-display text-[1.6rem] text-white/40 md:mt-[3.2rem] md:self-start">
          {words.vs}
        </span>
        <TeamSlots side="dire" heroIds={draft.dire} {...slotProps} />
      </div>

      <div className="flex flex-wrap items-center gap-[0.8rem]">
        <SidePicker mySide={mySide} onChange={setMySide} />
        <ScreenshotReader onRecognized={replace} />
        <button
          type="button"
          onClick={() => replace(emptyDraft())}
          className="flex items-center gap-[0.4rem] rounded-full bg-white/[0.08] px-[1rem] py-[0.45rem] text-[0.95rem] text-white/80 hover:bg-white/[0.14]"
        >
          <RotateCcw className="size-[1rem]" aria-hidden="true" />
          {words.clear}
        </button>
        <button
          type="button"
          disabled={!canLock}
          onClick={() => setIsLocked(true)}
          title={
            canLock
              ? words.lockTitle
              : words.lockNeedsBoth
          }
          className="flex items-center gap-[0.4rem] rounded-full bg-radiant/90 px-[1.1rem] py-[0.45rem] text-[0.98rem] font-medium text-ink hover:bg-radiant disabled:opacity-40"
        >
          <Lock className="size-[1rem]" aria-hidden="true" />
          {words.lockDraft}
        </button>
      </div>

      <div className="grid min-h-0 flex-1 gap-[1rem] lg:grid-cols-[minmax(0,1fr)_minmax(26rem,32rem)]">
          <HeroGrid
            heroes={heroes}
            isPicked={(heroId) => isPicked(draft, heroId)}
            onPick={(heroId) => pick(heroId)}
          />
          <SuggestionPanel
            heroes={heroes}
            heroById={heroById}
            enemyIds={enemyIds}
            picked={picked}
            personal={personal}
            onPick={(heroId) => pick(heroId, firstEmptyOn(draft, mySide))}
          />
      </div>
    </div>
  );
}
