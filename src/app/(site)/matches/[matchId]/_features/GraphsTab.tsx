"use client";

import { LineChart } from "../_components/LineChart";
import type { MatchView } from "../_utils/match-view-types";
import { useWords } from "@/lib/i18n/use-words";

function signedThousands(value: number) {
  const sign = value > 0 ? "+" : value < 0 ? "−" : "";
  const size = Math.abs(value);
  return `${sign}${size >= 1000 ? `${(size / 1000).toFixed(1)}k` : Math.round(size)}`;
}

const thousands = (value: number) => (Math.abs(value) >= 1000 ? `${(value / 1000).toFixed(1)}k` : String(Math.round(value)));

/** Team gold/XP advantage and the followed player's net worth against their lane opponent. */
export function GraphsTab({ view, followed, time, onTime }: { view: MatchView; followed: number; time: number; onTime: (seconds: number) => void }) {
  const say = useWords().match.graphs;
  const series = view.series;
  if (!series) return null;
  const you = view.players.find((player) => player.slot === followed) ?? view.players[0];
  const rival = view.players.find((player) => player.slot === view.laneOpponent[you.slot]);

  return (
    <div className="grid gap-[1.2rem] lg:grid-cols-2">
      <LineChart
        title={say.gold}
        split
        series={[{ id: "gold", label: say.goldLead, values: series.radiantGoldAdv, strokeClass: "", swatchClass: "" }]}
        time={time}
        onTime={onTime}
        format={signedThousands}
      />
      <LineChart
        title={say.xp}
        split
        series={[{ id: "xp", label: say.xpLead, values: series.radiantXpAdv, strokeClass: "", swatchClass: "" }]}
        time={time}
        onTime={onTime}
        format={signedThousands}
      />
      <div className="lg:col-span-2">
        <LineChart
          title={rival ? say.netWorthVs(you.hero.name, rival.hero.name) : say.netWorthOf(you.hero.name)}
          series={[
            { id: "you", label: you.hero.name, values: series.netWorth[you.slot] ?? [], strokeClass: "stroke-accent", swatchClass: "bg-accent" },
            ...(rival
              ? [{ id: "rival", label: rival.hero.name, values: series.netWorth[rival.slot] ?? [], strokeClass: "stroke-white/60", swatchClass: "bg-white/60", dashed: true }]
              : []),
          ]}
          time={time}
          onTime={onTime}
          format={thousands}
        />
      </div>
      <p className="text-[0.85rem] text-white/45 lg:col-span-2">{say.hint}</p>
    </div>
  );
}
