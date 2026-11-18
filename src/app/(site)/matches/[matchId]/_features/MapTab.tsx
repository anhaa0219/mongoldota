"use client";

import { useState } from "react";
import { MiniMap } from "../_components/MiniMap";
import { formatDuration } from "@/lib/format";
import { towersStandingAt, wardsAliveAt } from "../_utils/match-view-map";
import type { MatchView, Team } from "../_utils/match-view-types";
import { useWords } from "@/lib/i18n/use-words";

/** Labels: words.match.map[id]. */
const LAYERS = [{ id: "wards" }, { id: "deaths" }, { id: "towers" }, { id: "heat" }] as const;
type LayerId = (typeof LAYERS)[number]["id"];

function Count({ label, radiant, dire }: { label: string; radiant: number; dire: number }) {
  return (
    <div className="flex items-baseline justify-between gap-[1rem] rounded-[0.8rem] bg-white/5 px-[0.9rem] py-[0.5rem]">
      <span className="text-[0.9rem] text-white/60">{label}</span>
      <span className="font-display text-[1.4rem] tabular-nums">
        <span className="text-radiant">{radiant}</span>
        <span className="mx-[0.4rem] text-white/30">·</span>
        <span className="text-dire">{dire}</span>
      </span>
    </div>
  );
}

/** Minimap at the match cursor: wards alive, deaths so far, towers standing, the followed player's laning spots. */
export function MapTab({ view, followed, time }: { view: MatchView; followed: number; time: number }) {
  const say = useWords().match.map;
  const [shown, setShown] = useState<Set<LayerId>>(new Set(["wards", "deaths", "towers"]));
  const map = view.map;
  if (!map) return null;

  const wards = wardsAliveAt(map.wards, time);
  const towers = towersStandingAt(map.towers, time);
  const deaths = map.deaths.filter((death) => death.time <= time);
  const byTeam = (team: Team, list: { team: Team }[]) => list.filter((entry) => entry.team === team).length;
  const you = view.players.find((player) => player.slot === followed) ?? view.players[0];

  function toggle(layer: LayerId) {
    const next = new Set(shown);
    if (next.has(layer)) next.delete(layer);
    else next.add(layer);
    setShown(next);
  }

  return (
    <div className="grid gap-[1.2rem] lg:grid-cols-[minmax(0,34rem)_minmax(0,1fr)]">
      <div className="glass-panel rounded-[1.6rem] p-[0.8rem]">
        <MiniMap
          time={time}
          layers={{
            wards: shown.has("wards") ? wards : [],
            deaths: shown.has("deaths") ? deaths : [],
            towers: shown.has("towers") ? map.towers : [],
            heat: shown.has("heat") ? (map.laneHeat[you.slot] ?? []) : [],
          }}
        />
      </div>
      <div className="flex flex-col gap-[0.8rem]">
        <div className="flex flex-wrap gap-[0.5rem]" role="group" aria-label={say.layers}>
          {LAYERS.map((layer) => (
            <button
              key={layer.id}
              type="button"
              aria-pressed={shown.has(layer.id)}
              onClick={() => toggle(layer.id)}
              className={`rounded-full px-[0.9rem] py-[0.3rem] text-[0.9rem] transition-colors ${shown.has(layer.id) ? "bg-white/15 text-white" : "bg-white/5 text-white/50 hover:text-white"}`}
            >
              {say[layer.id]}
            </button>
          ))}
        </div>
        <p className="font-display text-[1.6rem] tabular-nums text-white">{say.at(formatDuration(Math.round(time)))}</p>
        <Count label={say.observers} radiant={byTeam("radiant", wards.filter((ward) => ward.kind === "observer"))} dire={byTeam("dire", wards.filter((ward) => ward.kind === "observer"))} />
        <Count label={say.sentries} radiant={byTeam("radiant", wards.filter((ward) => ward.kind === "sentry"))} dire={byTeam("dire", wards.filter((ward) => ward.kind === "sentry"))} />
        <Count label={say.towersStanding} radiant={byTeam("radiant", towers)} dire={byTeam("dire", towers)} />
        <Count label={say.fightDeaths} radiant={byTeam("radiant", deaths)} dire={byTeam("dire", deaths)} />
        <p className="text-[0.85rem] leading-relaxed text-white/45">
          {say.legend}
        </p>
      </div>
    </div>
  );
}
