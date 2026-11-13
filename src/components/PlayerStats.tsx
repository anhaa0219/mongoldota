import Image from "next/image";
import { heroPortrait } from "@/lib/hero-images";
import { player } from "@/lib/player-stats";

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="glass-panel rounded-[1.6rem] p-[1.4rem]">
      <h2 className="font-display text-[1.4rem] uppercase tracking-[0.06em] text-white/70">{title}</h2>
      <div className="mt-[0.9rem]">{children}</div>
    </section>
  );
}

function Last100() {
  const { wins, losses, recent } = player.last100;
  const winRate = Math.round((wins / (wins + losses)) * 100);
  return (
    <Panel title="Last 100 matches">
      <p className="flex items-baseline gap-[0.8rem] font-display leading-none">
        <span className="text-[3.4rem] text-radiant">{wins}W</span>
        <span className="text-[2rem] text-white/40">/</span>
        <span className="text-[3.4rem] text-dire">{losses}L</span>
      </p>
      <div
        className="mt-[0.9rem] flex h-[0.6rem] overflow-hidden rounded-full"
        role="meter"
        aria-label="Win rate"
        aria-valuenow={winRate}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <span className="bg-radiant" style={{ width: `${winRate}%` }} />
        <span className="flex-1 bg-dire" />
      </div>
      <p className="mt-[0.5rem] text-[1.1rem] text-white/70">{winRate}% win rate</p>
      <div className="mt-[1rem] flex items-center gap-[0.35rem]" aria-label={`Last 10: ${recent.join(" ")}`}>
        {recent.map((result, i) => (
          <span
            key={i}
            className={`grid size-[1.6rem] place-items-center rounded-[0.35rem] text-[0.85rem] font-semibold ${
              result === "W" ? "bg-radiant/25 text-radiant" : "bg-dire/25 text-dire"
            }`}
          >
            {result}
          </span>
        ))}
      </div>
    </Panel>
  );
}

function Records() {
  return (
    <Panel title="Records">
      <ul className="flex flex-col gap-[0.7rem]">
        {player.records.map((record) => (
          <li key={record.label} className="flex items-center gap-[0.8rem]">
            <span className="relative block h-[2.2rem] w-[3.9rem] shrink-0 overflow-hidden rounded-[0.4rem]">
              <Image src={heroPortrait(record.hero.slug)} alt={record.hero.name} fill sizes="4rem" className="object-cover" />
            </span>
            <span className="min-w-0 flex-1 text-[1.1rem] text-white/75">{record.label}</span>
            <span className="font-display text-[1.6rem] leading-none">{record.value}</span>
          </li>
        ))}
      </ul>
    </Panel>
  );
}

function Averages() {
  return (
    <Panel title="Averages">
      <dl className="grid grid-cols-3 gap-x-[1rem] gap-y-[1rem]">
        {player.averages.map((stat) => (
          <div key={stat.label}>
            <dt className="text-[1rem] uppercase tracking-wider text-white/55">{stat.label}</dt>
            <dd className="font-display text-[2rem] leading-none">{stat.value}</dd>
          </div>
        ))}
      </dl>
    </Panel>
  );
}

export function PlayerStats() {
  const { bestHero, role } = player;
  return (
    <div className="relative z-20 px-[1.3rem] lg:ml-[5.3rem] lg:max-w-[62rem] lg:px-0">
      <p className="mt-10 font-display text-[1.8rem] uppercase tracking-[0.08em] text-accent lg:mt-[4rem] lg:text-[2.4rem]">
        Your best hero is
      </p>
      <h1 className="title-metal font-display text-[6rem] uppercase leading-[0.9] tracking-[0.02em] lg:text-[12rem]">
        {bestHero.name}
      </h1>

      <div className="mt-[1.2rem] flex flex-wrap items-center gap-[0.8rem] text-[1.2rem]">
        <span className="rounded-full bg-accent px-[1rem] py-[0.35rem] font-display text-[1.4rem] uppercase text-ink">
          Your role is Pos {role.position} · {role.name}
        </span>
        <span className="text-white/80">
          {bestHero.matches} matches · {bestHero.winRate}% win rate · {role.share}% of games as Pos {role.position}
        </span>
      </div>

      <div className="mt-[2.2rem] grid gap-[1.2rem] md:grid-cols-3">
        <Last100 />
        <Records />
        <Averages />
      </div>
    </div>
  );
}
