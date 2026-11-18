import { Castle, Coins, Crosshair, Crown, Flame, Handshake, ListOrdered, MessageCircle, PiggyBank, ShoppingBag, Skull, Swords, Telescope, Undo2, type LucideIcon } from "lucide-react";
import { usageLine } from "@/lib/ai/ai-limits";
import { formatDuration } from "@/lib/format";
import type { AiUsage } from "@/types/ai";
import type { LiveEventKind, LiveTip } from "@/types/live";
import { useWords } from "@/lib/i18n/use-words";

/** Labels: words.live.coach.kinds[kind]. */
const ICONS: Record<LiveEventKind, { icon: LucideIcon }> = {
  death: { icon: Skull },
  kill: { icon: Crosshair },
  assist: { icon: Handshake },
  streak: { icon: Flame },
  teamfight: { icon: Swords },
  buyback: { icon: Undo2 },
  nobuyback: { icon: PiggyBank },
  aegis: { icon: Crown },
  gold: { icon: Coins },
  item: { icon: ShoppingBag },
  building: { icon: Castle },
  lookahead: { icon: Telescope },
  asked: { icon: MessageCircle },
  plan: { icon: ListOrdered },
};

interface TipListProps {
  /** Newest first. */
  tips: LiveTip[];
  asking: boolean;
  error: string | null;
  /** False outside a live match. */
  canAsk: boolean;
  onAsk: () => void;
  /** AI calls used; null when nothing is counted (the line is hidden). */
  usage: AiUsage | null;
  /** Set while an AI limit holds: shown calmly in place of errors, and Ask coach is off. */
  limitText: string | null;
}

/** The coach's tips for this match, newest on top, the AI usage line and the Ask coach now button. */
export function TipList({ tips, asking, error, canAsk, onAsk, usage, limitText }: TipListProps) {
  const words = useWords();
  const say = words.live.coach;
  return (
    <section aria-label={say.title} className="glass-panel rise-in flex min-h-0 flex-1 flex-col gap-[0.8rem] rounded-[1.4rem] p-[1rem] [--rise-delay:80ms]">
      <div className="flex flex-wrap items-center justify-between gap-x-[1rem] gap-y-[0.4rem]">
        <div className="flex flex-wrap items-baseline gap-x-[0.9rem]">
          <h2 className="font-display text-[1.5rem] uppercase tracking-[0.06em] text-white">{say.title}</h2>
          {usage && <p className="text-[0.85rem] tabular-nums text-white/50">{usageLine(usage, words.ai)}</p>}
        </div>
        <button
          type="button"
          onClick={onAsk}
          disabled={!canAsk || asking || limitText !== null}
          className="rounded-full bg-accent px-[1.3rem] py-[0.45rem] font-medium text-ink transition hover:brightness-110 disabled:opacity-40"
        >
          {asking ? say.thinking : say.ask}
        </button>
      </div>
      {limitText ? <p className="text-[0.95rem] text-white/70">{limitText}</p> : error && <p className="text-[0.95rem] text-dire">{error}</p>}
      <ol aria-live="polite" className="flex min-h-0 flex-1 flex-col gap-[0.6rem] overflow-y-auto">
        {tips.length === 0 && <li className="text-[0.95rem] text-white/55">{say.empty}</li>}
        {tips.map((tip) => {
          const { icon: Icon } = ICONS[tip.kind];
          const label = say.kinds[tip.kind];
          return (
            <li key={tip.id} className="rise-in flex gap-[0.7rem] rounded-[1rem] bg-white/[0.05] px-[0.8rem] py-[0.6rem] transition-colors hover:bg-white/[0.09]">
              <Icon className="mt-[0.15rem] size-[1.1rem] shrink-0 text-accent" aria-label={label} />
              <p className="min-w-0 text-[1rem] leading-snug text-white/90">
                <span className="mr-[0.5rem] tabular-nums text-white/45">{formatDuration(tip.clockSeconds)}</span>
                {tip.text}
              </p>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
