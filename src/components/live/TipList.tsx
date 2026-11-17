import { Castle, Coins, Crosshair, ListOrdered, MessageCircle, ShoppingBag, Skull, Telescope, type LucideIcon } from "lucide-react";
import { formatDuration } from "@/lib/format";
import type { LiveEventKind, LiveTip } from "@/types/live";

const ICONS: Record<LiveEventKind, { icon: LucideIcon; label: string }> = {
  death: { icon: Skull, label: "After a death" },
  kill: { icon: Crosshair, label: "After a kill" },
  gold: { icon: Coins, label: "Gold ready" },
  item: { icon: ShoppingBag, label: "Item bought" },
  building: { icon: Castle, label: "Building fell" },
  lookahead: { icon: Telescope, label: "Coming up" },
  asked: { icon: MessageCircle, label: "You asked" },
  plan: { icon: ListOrdered, label: "Item plan" },
};

interface TipListProps {
  /** Newest first. */
  tips: LiveTip[];
  asking: boolean;
  error: string | null;
  /** False outside a live match. */
  canAsk: boolean;
  onAsk: () => void;
}

/** The coach's tips for this match, newest on top, and the Ask coach now button. */
export function TipList({ tips, asking, error, canAsk, onAsk }: TipListProps) {
  return (
    <section aria-label="Coach" className="glass-panel flex min-h-0 flex-1 flex-col gap-[0.8rem] rounded-[1.4rem] p-[1rem]">
      <div className="flex items-center justify-between gap-[1rem]">
        <h2 className="font-display text-[1.5rem] uppercase tracking-[0.06em] text-white">Coach</h2>
        <button
          type="button"
          onClick={onAsk}
          disabled={!canAsk || asking}
          className="rounded-full bg-accent px-[1.3rem] py-[0.45rem] font-medium text-ink transition hover:brightness-110 disabled:opacity-40"
        >
          {asking ? "Coach is thinking…" : "Ask coach now"}
        </button>
      </div>
      {error && <p className="text-[0.95rem] text-dire">{error}</p>}
      <ol aria-live="polite" className="flex min-h-0 flex-1 flex-col gap-[0.6rem] overflow-y-auto">
        {tips.length === 0 && <li className="text-[0.95rem] text-white/55">Tips appear here when you die, get a kill, buy an item, have gold for your next item, a tower or barracks falls, and every few minutes.</li>}
        {tips.map((tip) => {
          const { icon: Icon, label } = ICONS[tip.kind];
          return (
            <li key={tip.id} className="flex gap-[0.7rem] rounded-[1rem] bg-white/[0.05] px-[0.8rem] py-[0.6rem]">
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
