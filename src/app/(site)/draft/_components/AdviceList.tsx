import type { AdviceItem } from "@/types/draft";
import { useWords } from "@/lib/i18n/use-words";

const CATEGORY_COLORS: Record<string, string> = {
  laning: "bg-radiant/20 text-radiant",
  items: "bg-accent/20 text-accent",
  timing: "bg-sky-400/20 text-sky-300",
  enemies: "bg-dire/20 text-dire",
  teamfight: "bg-violet-400/20 text-violet-300",
  map: "bg-white/15 text-white/80",
};

/** The coach's numbered tips, two columns on wide screens. */
export function AdviceList({ advice }: { advice: AdviceItem[] }) {
  const categories: Record<string, string> = useWords().draft.categories;
  return (
    <ol className="grid gap-[0.6rem] md:grid-cols-2">
      {advice.map((item, index) => (
        <li key={`${index}-${item.title}`} className="flex gap-[0.7rem] rounded-[0.9rem] bg-white/[0.05] p-[0.8rem]">
          <span className="font-display text-[1.5rem] leading-none text-white/35">{index + 1}</span>
          <div className="min-w-0">
            <p className="flex flex-wrap items-center gap-[0.5rem]">
              <span className={`rounded-full px-[0.55rem] py-[0.05rem] text-[0.85rem] uppercase tracking-wider ${CATEGORY_COLORS[item.category.toLowerCase()] ?? CATEGORY_COLORS.map}`}>
                {categories[item.category.toLowerCase()] ?? item.category}
              </span>
              <span className="text-[1.02rem] font-medium leading-snug text-white">{item.title}</span>
            </p>
            <p className="mt-[0.3rem] text-[0.92rem] leading-snug text-white/70">{item.detail}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}
