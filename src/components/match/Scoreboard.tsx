"use client";

import Image from "next/image";
import { heroPortrait } from "@/lib/hero-images";
import type { LaneRole } from "@/types/opendota";
import type { ScoreboardPlayer, Team } from "@/types/match-view";

const laneNames: Record<LaneRole, string> = { 1: "Safe", 2: "Mid", 3: "Off", 4: "Jungle" };
const columns = "grid grid-cols-[3.6rem_minmax(7rem,1fr)_3.4rem_5.8rem_4.4rem_4rem] items-center gap-x-[0.8rem] md:grid-cols-[3.6rem_minmax(8rem,1fr)_3.4rem_5.8rem_4.4rem_4rem_14rem]";

const thousands = (value: number) => (value >= 1000 ? `${(value / 1000).toFixed(1)}k` : String(value));

function Row({ player, followed, onFollow }: { player: ScoreboardPlayer; followed: boolean; onFollow: () => void }) {
  return (
    <button
      type="button"
      onClick={onFollow}
      aria-pressed={followed}
      title={`Follow ${player.hero.name} in the tabs below`}
      className={`${columns} w-full rounded-[0.8rem] px-[0.6rem] py-[0.35rem] text-left transition-[background-color,box-shadow] ${
        followed ? "bg-accent/15 shadow-[inset_0_0_0_1px_rgb(254_186_135/0.6)]" : "hover:bg-white/5"
      }`}
    >
      <span className="relative block h-[2rem] w-[3.6rem] overflow-hidden rounded-[0.35rem] bg-white/10">
        {player.hero.slug && <Image unoptimized src={heroPortrait(player.hero.slug)} alt="" fill sizes="3.6rem" className="object-cover" />}
      </span>
      <span className="min-w-0 leading-tight">
        <span className="block truncate text-[1.05rem] text-white">
          {player.isLinked && <span className="mr-[0.4rem] rounded-full bg-accent px-[0.45rem] text-[0.75rem] font-semibold text-ink">YOU</span>}
          {player.hero.name}
        </span>
        <span className="block truncate text-[0.85rem] text-white/50">{player.name}</span>
      </span>
      <span className="text-[0.9rem] text-white/60">{player.lane ? laneNames[player.lane] : "—"}</span>
      <span className="font-display text-[1.2rem] tabular-nums">
        {player.kills}/<span className="text-dire/90">{player.deaths}</span>/{player.assists}
      </span>
      <span className="tabular-nums text-accent">{thousands(player.netWorth)}</span>
      <span className="tabular-nums text-white/70">{player.gpm}</span>
      <span className="hidden items-center gap-[0.2rem] md:flex" aria-label="Items">
        {player.items.map((item, slot) => (
          <span key={slot} className="relative block h-[1.5rem] w-[2rem] overflow-hidden rounded-[0.2rem] bg-white/5" title={item?.name}>
            {item && <Image unoptimized src={item.image} alt={item.name} fill sizes="2rem" className="object-cover" />}
          </span>
        ))}
        {player.neutral && (
          <span className="relative ml-[0.2rem] block size-[1.5rem] overflow-hidden rounded-full ring-1 ring-white/20" title={player.neutral.name}>
            <Image unoptimized src={player.neutral.image} alt={player.neutral.name} fill sizes="1.5rem" className="object-cover" />
          </span>
        )}
      </span>
    </button>
  );
}

function TeamRows({ team, players, followed, onFollow }: { team: Team; players: ScoreboardPlayer[]; followed: number; onFollow: (slot: number) => void }) {
  return (
    <div className="flex flex-col gap-[0.15rem]">
      <p className={`px-[0.6rem] pb-[0.2rem] text-[0.8rem] uppercase tracking-[0.16em] ${team === "radiant" ? "text-radiant" : "text-dire"}`}>
        {team === "radiant" ? "Radiant" : "Dire"}
      </p>
      {players
        .filter((player) => player.team === team)
        .map((player) => (
          <Row key={player.slot} player={player} followed={player.slot === followed} onFollow={() => onFollow(player.slot)} />
        ))}
    </div>
  );
}

/** All 10 players. Clicking a row follows that player in every tab. */
export function Scoreboard({ players, followed, onFollow }: { players: ScoreboardPlayer[]; followed: number; onFollow: (slot: number) => void }) {
  return (
    <section className="glass-panel overflow-x-auto rounded-[1.6rem] p-[0.9rem]" aria-label="Scoreboard">
      <div className="min-w-[30rem]">
        <div className={`${columns} px-[0.6rem] pb-[0.4rem] text-[0.75rem] uppercase tracking-[0.12em] text-white/40`}>
          <span />
          <span>Hero</span>
          <span>Lane</span>
          <span>K / D / A</span>
          <span>Net worth</span>
          <span>GPM</span>
          <span className="hidden md:block">Items</span>
        </div>
        <div className="flex flex-col gap-[0.8rem]">
          <TeamRows team="radiant" players={players} followed={followed} onFollow={onFollow} />
          <TeamRows team="dire" players={players} followed={followed} onFollow={onFollow} />
        </div>
      </div>
    </section>
  );
}
