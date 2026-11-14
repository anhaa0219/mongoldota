import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { MatchDetailPanel } from "@/components/MatchDetailPanel";
import { MatchRow } from "@/components/MatchRow";
import { PlayerStats } from "@/components/PlayerStats";
import { summarize } from "@/lib/player-summary";
import type { MatchBasics, MatchSummary } from "@/types/opendota";

// Valve/OpenDota icons are already small PNGs. Sending them through Next's optimizer made the
// server resize hundreds of images per History visit and queued page navigations behind them.
const OPTIMIZER = "/_next/image";
const ITEM = "https://cdn.cloudflare.steamstatic.com/apps/dota2/images/dota_react/items/blink.png";

const basics: MatchBasics = {
  killParticipation: 50, netWorth: 13888, level: 17, lastHits: 149, denies: 5, gpm: 459, xpm: 546,
  gpmPercentile: 84, xpmPercentile: 36, heroDamage: 11970, towerDamage: 1987, healing: 0,
  neutralItem: { id: 574, key: "mysterious_hat", name: "Fairy's Trinket", image: ITEM, cost: 0 },
  scepter: false, shard: true,
};

const match: MatchSummary = {
  id: 1, heroId: 1, won: true, radiant: true, ranked: true, kills: 5, deaths: 3, assists: 7,
  gpm: 500, xpm: 600, lastHits: 200, heroDamage: 20000, items: [1, 0, 0, 0, 0, 0],
  laneRole: 1, parsed: true, durationSeconds: 2400, playedAt: 0,
};

describe("remote Dota images load straight from the CDN", () => {
  it("History row: hero portrait and item icons", () => {
    const html = renderToStaticMarkup(
      <MatchRow
        match={{
          id: 1, heroName: "Axe", heroSlug: "axe", won: true, ranked: true, kills: 5, deaths: 3, assists: 7,
          gpm: 500, durationMinutes: 40, ago: "2 h ago", itemImages: [ITEM, null, null, null, null, null],
        }}
      />,
    );
    expect(html).toContain("<img");
    expect(html).not.toContain(OPTIMIZER);
  });

  it("Match detail: item timing icons", () => {
    const html = renderToStaticMarkup(
      <MatchDetailPanel
        matchId={1}
        onCheckAgain={() => {}}
        detail={{
          parsed: true, basics, goldEarned: [0, 300], observers: 1, sentries: 0, deathMinutes: [],
          itemTimings: [{ key: "blink", name: "Blink Dagger", image: ITEM, seconds: 600, isBkb: false }],
        }}
      />,
    );
    expect(html).toContain("<img");
    expect(html).not.toContain(OPTIMIZER);
  });

  it("Stats panels: record and top hero portraits", () => {
    const summary = summarize([match], new Map([[1, { id: 1, name: "Axe", slug: "axe" }]]));
    if (!summary) throw new Error("expected a summary");
    const html = renderToStaticMarkup(<PlayerStats summary={summary} />);
    expect(html).toContain("<img");
    expect(html).not.toContain(OPTIMIZER);
  });
});

describe("unparsed match details", () => {
  const html = renderToStaticMarkup(
    <MatchDetailPanel matchId={1} onCheckAgain={() => {}} detail={{ parsed: false, basics }} />,
  );

  it("shows the basic stats every match has", () => {
    expect(html).toContain("13,888");
    expect(html).toContain("better than 84%");
    expect(html).toContain("Aghanim&#x27;s Shard");
    expect(html).not.toContain(OPTIMIZER);
  });

  it("offers to ask OpenDota for the full analysis", () => {
    expect(html).toContain("Analyse with OpenDota");
  });
});
