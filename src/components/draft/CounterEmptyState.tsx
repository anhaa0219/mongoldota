import { Lock, MousePointerClick, Swords } from "lucide-react";

const STEPS = [
  { icon: MousePointerClick, text: "Add the enemy heroes: click a Dire slot, or type a name and press Enter." },
  { icon: Swords, text: "The best counters for your team appear here instantly, with their edge against each enemy." },
  { icon: Lock, text: "Lock the draft when picks are done to get 12 tips for this game." },
];

/** Counter picks panel before any enemy is picked: what the panel does and how to start. */
export function CounterEmptyState() {
  return (
    <div className="flex flex-col gap-[0.9rem] py-[0.4rem]">
      <p className="font-display text-[1.5rem] uppercase leading-tight tracking-[0.04em] text-white">Who are you up against?</p>
      <ul className="flex flex-col gap-[0.7rem]">
        {STEPS.map(({ icon: Icon, text }) => (
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
