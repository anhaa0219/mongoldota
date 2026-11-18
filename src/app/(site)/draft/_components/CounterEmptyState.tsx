import { Lock, MousePointerClick, Swords } from "lucide-react";
import { useWords } from "@/lib/i18n/use-words";

/** One icon per step, in the order of `words.draft.counters.emptySteps`. */
const STEP_ICONS = [MousePointerClick, Swords, Lock];

/** Counter picks panel before any enemy is picked: what the panel does and how to start. */
export function CounterEmptyState() {
  const words = useWords().draft.counters;
  const steps = words.emptySteps.map((text, index) => ({ text, icon: STEP_ICONS[index % STEP_ICONS.length] }));
  return (
    <div className="flex flex-col gap-[0.9rem] py-[0.4rem]">
      <p className="font-display text-[1.5rem] uppercase leading-tight tracking-[0.04em] text-white">{words.emptyTitle}</p>
      <ul className="flex flex-col gap-[0.7rem]">
        {steps.map(({ icon: Icon, text }) => (
          <li key={text} className="flex items-start gap-[0.7rem] text-[0.98rem] leading-snug text-white/70">
            <span className="grid size-[2rem] shrink-0 place-items-center rounded-full bg-accent/15 text-accent">
              <Icon className="size-[1rem]" aria-hidden="true" />
            </span>
            {text}
          </li>
        ))}
      </ul>
    </div>
  );
}
