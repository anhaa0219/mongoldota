import Image from "next/image";
import type { MatchBasics } from "@/types/opendota";

function Stat({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div>
      <dt className="text-[0.9rem] uppercase tracking-wider text-white/55">{label}</dt>
      <dd className="font-display text-[1.6rem] leading-none tabular-nums text-white">{value}</dd>
      {note && <dd className="mt-[0.2rem] text-[0.85rem] text-white/45">{note}</dd>}
    </div>
  );
}

function betterThan(percentile: number | null) {
  return percentile === null ? undefined : `better than ${percentile}% on this hero`;
}

const number = (value: number) => value.toLocaleString("en-US");

/** End-of-game stats every match has, parsed or not. */
export function MatchBasicsGrid({ basics }: { basics: MatchBasics }) {
  const upgrades = [basics.scepter && "Aghanim's Scepter", basics.shard && "Aghanim's Shard"].filter(Boolean).join(" · ");
  return (
    <div className="flex flex-col gap-[1rem]">
      <dl className="grid grid-cols-2 gap-x-[1rem] gap-y-[1rem] sm:grid-cols-4">
        {basics.killParticipation !== null && <Stat label="Kill participation" value={`${basics.killParticipation}%`} />}
        <Stat label="Net worth" value={number(basics.netWorth)} />
        <Stat label="Level" value={String(basics.level)} />
        <Stat label="LH / DN" value={`${basics.lastHits} / ${basics.denies}`} />
        <Stat label="GPM" value={String(basics.gpm)} note={betterThan(basics.gpmPercentile)} />
        <Stat label="XPM" value={String(basics.xpm)} note={betterThan(basics.xpmPercentile)} />
        <Stat label="Hero damage" value={number(basics.heroDamage)} />
        <Stat label="Tower damage" value={number(basics.towerDamage)} />
        {basics.healing > 0 && <Stat label="Healing" value={number(basics.healing)} />}
      </dl>
      {(basics.neutralItem || upgrades) && (
        <p className="flex flex-wrap items-center gap-[0.8rem] text-[1rem] text-white/75">
          {basics.neutralItem && (
            <span className="flex items-center gap-[0.5rem]" title={basics.neutralItem.name}>
              <span className="relative block h-[1.6rem] w-[2.2rem] overflow-hidden rounded-full ring-1 ring-white/15">
                <Image unoptimized src={basics.neutralItem.image} alt="" fill sizes="2.5rem" className="object-cover" />
              </span>
              {basics.neutralItem.name}
            </span>
          )}
          {upgrades && <span>{upgrades}</span>}
        </p>
      )}
    </div>
  );
}
