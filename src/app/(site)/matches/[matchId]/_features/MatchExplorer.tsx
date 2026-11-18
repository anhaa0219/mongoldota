"use client";

import { useState } from "react";
import { CombatTab } from "./CombatTab";
import { GraphsTab } from "./GraphsTab";
import { LaningTab } from "./LaningTab";
import { LogTab } from "./LogTab";
import { MapTab } from "./MapTab";
import { MatchBanner } from "../_components/MatchBanner";
import { NotParsedCard } from "../_components/NotParsedCard";
import { Scoreboard } from "../_components/Scoreboard";
import { StoryTab } from "./StoryTab";
import { TimeScrubber, type PlaybackSpeed } from "../_components/TimeScrubber";
import { MATCH_TABS, type MatchTab } from "../_utils/match-tabs";
import { clampTime } from "../_utils/match-view-timeline";
import { useMatchPlayback, usePrefersReducedMotion } from "../_hooks/use-match-playback";
import type { MatchView } from "../_utils/match-view-types";
import { useWords } from "@/lib/i18n/use-words";

const TIMELINE_TABS: readonly MatchTab[] = ["story", "graphs", "map"];
const START_SECONDS = 600; // open at the end of the laning stage

interface TabContentProps {
  tab: MatchTab;
  view: MatchView;
  followed: number;
  time: number;
  onTime: (seconds: number) => void;
}

function TabContent({ tab, view, followed, time, onTime }: TabContentProps) {
  if (!view.parsed) return <NotParsedCard matchId={view.matchId} />;
  if (tab === "story") return <StoryTab view={view} followed={followed} time={time} />;
  if (tab === "laning") return <LaningTab view={view} followed={followed} />;
  if (tab === "graphs") return <GraphsTab view={view} followed={followed} time={time} onTime={onTime} />;
  if (tab === "combat") return <CombatTab view={view} followed={followed} />;
  if (tab === "map") return <MapTab view={view} followed={followed} time={time} />;
  return <LogTab view={view} followed={followed} />;
}

/** The interactive match page: scoreboard, tabs and one time cursor shared by Story, Graphs and Map. */
export function MatchExplorer({ view, initialTab, ago }: { view: MatchView; initialTab: MatchTab; ago: string }) {
  const words = useWords().match;
  const duration = view.header.durationSeconds;
  const [followed, setFollowed] = useState(view.defaultFollowedSlot);
  const [tab, setTab] = useState<MatchTab>(initialTab);
  const [time, setTime] = useState(Math.min(START_SECONDS, duration));
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState<PlaybackSpeed>(60);
  const reducedMotion = usePrefersReducedMotion();

  useMatchPlayback(playing && !reducedMotion, time, speed, duration, setTime, () => setPlaying(false));

  function chooseTab(next: MatchTab) {
    // The play button lives on the timeline tabs only: leaving them pauses playback.
    if (!TIMELINE_TABS.includes(next)) setPlaying(false);
    setTab(next);
    window.history.replaceState(null, "", `?tab=${next}`);
  }

  function moveTo(seconds: number) {
    setTime(clampTime(seconds, duration));
  }

  function togglePlay() {
    if (!playing && time >= duration) setTime(0);
    setPlaying(!playing);
  }

  const linked = view.players.find((player) => player.isLinked);
  const markers = view.events.filter((event) => event.slot === followed || event.slot === null);

  return (
    <div className="flex flex-col gap-[1.2rem]">
      <MatchBanner view={view} ago={ago} linked={linked} />
      <Scoreboard players={view.players} followed={followed} onFollow={setFollowed} />

      <div role="tablist" aria-label={words.details} className="flex flex-wrap gap-[0.5rem]">
        {MATCH_TABS.map((option) => (
          <button
            key={option.id}
            type="button"
            role="tab"
            aria-selected={tab === option.id}
            onClick={() => chooseTab(option.id)}
            className={`rounded-full px-[1.1rem] py-[0.45rem] text-[1rem] transition-colors ${
              tab === option.id ? "bg-accent font-semibold text-ink shadow-[0_0_1rem_rgb(254_186_135/0.35)]" : "glass-panel text-white/75 hover:text-white"
            }`}
          >
            {words.tabs[option.id]}
          </button>
        ))}
      </div>

      {view.parsed && TIMELINE_TABS.includes(tab) && (
        <TimeScrubber
          duration={duration}
          time={time}
          onTime={moveTo}
          markers={markers}
          playing={playing}
          onTogglePlay={togglePlay}
          speed={speed}
          onSpeed={setSpeed}
          canPlay={!reducedMotion}
        />
      )}

      <div key={tab} role="tabpanel" className="rise-in" aria-label={words.tabs[tab]}>
        <TabContent tab={tab} view={view} followed={followed} time={time} onTime={moveTo} />
      </div>
    </div>
  );
}
