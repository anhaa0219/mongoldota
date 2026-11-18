import Image from "next/image";
import { heroPortrait } from "@/app/(site)/_utils/hero-images";
import { toLaneSummaries, type LanePlayerStats, type LaneSummary } from "../_utils/match-view-lanes";
import type { MatchView, ScoreboardPlayer } from "../_utils/match-view-types";
import { useWords } from "@/lib/i18n/use-words";

const columns = "grid grid-cols-[2.6rem_minmax(0,1fr)_3rem_3rem_4rem_4rem] items-center gap-x-[0.7rem]";
const value = (number: number | undefined) => (number === undefined ? "—" : number.toLocaleString("en-US"));

function PlayerLine({ stats, player, followed }: { stats: LanePlayerStats; player: ScoreboardPlayer; followed: boolean }) {
  return (
    <div className={`${columns} rounded-[0.5rem] px-[0.4rem] py-[0.2rem] ${followed ? "bg-accent/15" : ""}`}>
      <span className="relative block h-[1.5rem] w-[2.6rem] overflow-hidden rounded-[0.25rem] bg-white/10">
        {player.hero.slug && <Image unoptimized src={heroPortrait(player.hero.slug)} alt="" fill sizes="2.6rem" className="object-cover" />}
      </span>
      <span className={`truncate ${player.team === "radiant" ? "text-radiant" : "text-dire"}`}>{player.hero.name}</span>
      <span className="text-right tabular-nums text-white/70">{value(stats.at5?.lastHits)}</span>
      <span className="text-right tabular-nums text-white">{value(stats.at10?.lastHits)}</span>
      <span className="text-right tabular-nums text-accent">{value(stats.at10?.netWorth)}</span>
      <span className="text-right tabular-nums text-white/70">{value(stats.at10?.xp)}</span>
    </div>
  );
}

function LaneCard({ lane, players, followed }: { lane: LaneSummary; players: Map<number, ScoreboardPlayer>; followed: number }) {
  const say = useWords().match.laning;
  const lines = [...lane.radiant, ...lane.dire];
  return (
    <section className="glass-panel flex flex-col gap-[0.5rem] rounded-[1.6rem] p-[1.2rem]">
      <header className="flex items-baseline justify-between">
        <h2 className="font-display text-[1.3rem] uppercase tracking-[0.06em] text-white/75">{say.titles[lane.lane]}</h2>
        {lane.winner && (
          <span className={`rounded-full px-[0.7rem] py-[0.1rem] text-[0.85rem] font-semibold ${lane.winner === "radiant" ? "bg-radiant/20 text-radiant" : "bg-dire/20 text-dire"}`}>
            {say.won(lane.winner === "radiant" ? "Radiant" : "Dire")}
          </span>
        )}
      </header>
      <div className={`${columns} px-[0.4rem] text-[0.85rem] uppercase tracking-[0.1em] text-white/40`}>
        <span />
        <span>{say.hero}</span>
        <span className="text-right">LH 5′</span>
        <span className="text-right">LH 10′</span>
        <span className="text-right">NW 10′</span>
        <span className="text-right">XP 10′</span>
      </div>
      {lines.length === 0 && <p className="px-[0.4rem] text-white/45">{say.nobody}</p>}
      {lines.map((stats) => {
        const player = players.get(stats.slot);
        return player ? <PlayerLine key={stats.slot} stats={stats} player={player} followed={stats.slot === followed} /> : null;
      })}
    </section>
  );
}

/** The first 10 minutes, lane by lane: last hits, net worth and XP, and who won each lane. */
export function LaningTab({ view, followed }: { view: MatchView; followed: number }) {
  if (!view.series) return null;
  const players = new Map(view.players.map((player) => [player.slot, player]));
  return (
    <div className="grid gap-[1.2rem] xl:grid-cols-3">
      {toLaneSummaries(view.players, view.series).map((lane) => (
        <LaneCard key={lane.lane} lane={lane} players={players} followed={followed} />
      ))}
    </div>
  );
}
