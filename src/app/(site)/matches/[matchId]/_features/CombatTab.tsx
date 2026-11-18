import Image from "next/image";
import { formatDuration } from "@/lib/format";
import { heroPortrait } from "@/app/(site)/_utils/hero-images";
import type { MatchView, ScoreboardPlayer } from "../_utils/match-view-types";
import { useWords } from "@/lib/i18n/use-words";

function Portrait({ player }: { player: ScoreboardPlayer }) {
  return (
    <span className="relative mx-auto block h-[1.6rem] w-[2.8rem] overflow-hidden rounded-[0.25rem] bg-white/10" title={player.hero.name}>
      {player.hero.slug && <Image unoptimized src={heroPortrait(player.hero.slug)} alt={player.hero.name} fill sizes="2.8rem" className="object-cover" />}
    </span>
  );
}

const thousands = (value: number) => (value >= 1000 ? `${(value / 1000).toFixed(1)}k` : String(value));

/** Who damaged whom (followed player's team vs the enemy heroes) and every teamfight's gold swing. */
export function CombatTab({ view, followed }: { view: MatchView; followed: number }) {
  const say = useWords().match.combat;
  const combat = view.combat;
  if (!combat) return null;
  const you = view.players.find((player) => player.slot === followed) ?? view.players[0];
  const allies = view.players.filter((player) => player.team === you.team);
  const enemies = view.players.filter((player) => player.team !== you.team);

  return (
    <div className="grid gap-[1.2rem] xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
      <section className="glass-panel overflow-x-auto rounded-[1.6rem] p-[1.2rem]">
        <h2 className="font-display text-[1.3rem] uppercase tracking-[0.06em] text-white/75">{say.damage}</h2>
        <p className="mb-[0.8rem] text-[0.85rem] text-white/45">{say.damageHint}</p>
        <table className="w-full min-w-[30rem] border-separate border-spacing-[0.25rem] text-[0.9rem]">
          <thead>
            <tr>
              <th />
              {enemies.map((enemy) => (
                <th key={enemy.slot} scope="col">
                  <Portrait player={enemy} />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {allies.map((ally) => {
              const row = combat.damage[ally.slot] ?? {};
              const rowMax = Math.max(1, ...Object.values(row));
              return (
                <tr key={ally.slot} className={ally.slot === followed ? "outline outline-1 outline-accent/60" : ""}>
                  <th scope="row" className="w-[3.2rem]">
                    <Portrait player={ally} />
                  </th>
                  {enemies.map((enemy) => {
                    const damage = row[enemy.slot] ?? 0;
                    return (
                      <td
                        key={enemy.slot}
                        title={`${ally.hero.name} → ${enemy.hero.name}: ${damage.toLocaleString("en-US")}`}
                        className="rounded-[0.35rem] px-[0.3rem] py-[0.35rem] text-center tabular-nums text-white"
                        style={{ backgroundColor: `rgb(254 186 135 / ${(damage / rowMax) * 0.55})` }}
                      >
                        {damage ? thousands(damage) : "·"}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>
      <section className="glass-panel rounded-[1.6rem] p-[1.2rem]">
        <h2 className="font-display text-[1.3rem] uppercase tracking-[0.06em] text-white/75">{say.teamfights}</h2>
        {combat.teamfights.length === 0 && <p className="mt-[0.6rem] text-white/45">{say.noTeamfights}</p>}
        <ol className="mt-[0.6rem] flex flex-col gap-[0.4rem]">
          {combat.teamfights.map((fight) => {
            const radiantWon = fight.radiantGoldSwing >= 0;
            return (
              <li key={fight.start} className="flex items-center gap-[0.8rem] rounded-[0.6rem] bg-white/5 px-[0.8rem] py-[0.4rem]">
                <span className="w-[3.6rem] tabular-nums text-white/55">{formatDuration(fight.start)}</span>
                <span className="flex-1 text-white/80">{say.deaths(fight.deaths)}</span>
                <span className={`tabular-nums ${radiantWon ? "text-radiant" : "text-dire"}`}>
                  {say.goldSwing(radiantWon ? "Radiant" : "Dire", thousands(Math.abs(fight.radiantGoldSwing)))}
                </span>
              </li>
            );
          })}
        </ol>
      </section>
    </div>
  );
}
