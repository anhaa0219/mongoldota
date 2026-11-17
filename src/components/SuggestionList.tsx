import { Lightbulb, TrendingUp, Wrench, type LucideIcon } from "lucide-react";
import { StatPanel } from "@/components/StatPanel";
import type { Suggestion, SuggestionTone } from "@/types/coach";

const tones: Record<SuggestionTone, { icon: LucideIcon; label: string; color: string }> = {
  fix: { icon: Wrench, label: "Work on", color: "text-dire bg-dire/15" },
  strength: { icon: TrendingUp, label: "Strength", color: "text-radiant bg-radiant/15" },
  tip: { icon: Lightbulb, label: "Tip", color: "text-accent bg-accent/15" },
};

const TITLES = {
  rules: "Suggestions",
  loading: "Suggestions · AI coach is thinking…",
  ai: "AI coach · suggestions",
} as const;

/** Coach suggestions, most important first. `source` says whether the AI coach wrote them (or is still writing). */
export function SuggestionList({ suggestions, source = "rules", timer }: { suggestions: Suggestion[]; source?: keyof typeof TITLES; timer?: React.ReactNode }) {
  return (
    <StatPanel title={TITLES[source]} className="flex min-h-0 flex-1 flex-col [&>div]:min-h-0 [&>div]:overflow-y-auto">
      {timer && <div className="-mt-[0.3rem] mb-[0.6rem]">{timer}</div>}
      <ol className="stagger flex flex-col gap-[0.7rem]">
        {suggestions.map((suggestion) => {
          const { icon: Icon, label, color } = tones[suggestion.tone];
          return (
            <li key={suggestion.id} className="flex gap-[0.8rem] rounded-[0.9rem] bg-white/[0.04] p-[0.8rem] transition-[background-color,translate] duration-200 hover:translate-x-[0.2rem] hover:bg-white/[0.08]">
              <span className={`grid size-[2.2rem] shrink-0 place-items-center rounded-full ${color}`}>
                <Icon className="size-[1.1rem]" aria-label={label} />
              </span>
              <div className="min-w-0">
                <p className="text-[1.05rem] font-medium leading-snug text-white">{suggestion.title}</p>
                <p className="mt-[0.2rem] text-[0.92rem] leading-snug text-white/65">{suggestion.detail}</p>
              </div>
            </li>
          );
        })}
      </ol>
    </StatPanel>
  );
}
