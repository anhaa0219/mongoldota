import Image from "next/image";
import { BRACKETS } from "@/lib/hero-meta";
import type { MetaBracket } from "@/types/meta";

const RANK_ICONS = "https://www.opendota.com/assets/images/dota2/rank_icons";

/** All · Herald … Immortal · Pro, with medal icons; the player's own rank is marked. */
export function BracketTabs({ value, myBracket, onChange }: { value: MetaBracket; myBracket: MetaBracket | null; onChange: (bracket: MetaBracket) => void }) {
  return (
    <div className="flex flex-wrap gap-[0.4rem]" role="tablist" aria-label="Rank">
      {BRACKETS.map(({ id, label }) => {
        const isActive = value === id;
        const isMine = myBracket === id;
        return (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(id)}
            className={`flex items-center gap-[0.35rem] rounded-full py-[0.25rem] pl-[0.35rem] pr-[0.85rem] text-[0.9rem] transition ${
              isActive ? "bg-accent text-ink" : "bg-white/[0.07] text-white/75 hover:bg-white/[0.13]"
            } ${isMine && !isActive ? "ring-1 ring-accent/70" : ""}`}
            title={isMine ? `${label} (your rank)` : label}
          >
            {/^[1-8]$/.test(id) ? (
              <span className="relative size-[1.6rem]">
                <Image unoptimized src={`${RANK_ICONS}/rank_icon_${id}.png`} alt="" fill sizes="1.6rem" className="object-contain" />
              </span>
            ) : (
              <span className="w-[0.35rem]" />
            )}
            {label}
            {isMine && <span className={`text-[0.85rem] uppercase ${isActive ? "text-ink/70" : "text-accent"}`}>you</span>}
          </button>
        );
      })}
    </div>
  );
}
