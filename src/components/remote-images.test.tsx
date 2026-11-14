import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { MatchDetailPanel } from "@/components/MatchDetailPanel";
import { MatchRow } from "@/components/MatchRow";
import { PlayerStats } from "@/components/PlayerStats";
import { summarize } from "@/lib/player-summary";
import type { MatchSummary } from "@/types/opendota";

// Valve/OpenDota icons are already small PNGs. Sending them through Next's optimizer made the
// server resize hundreds of images per History visit and queued page navigations behind them.
const OPTIMIZER = "/_next/image";
const ITEM = "https://cdn.cloudflare.steamstatic.com/apps/dota2/images/dota_react/items/blink.png";

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
        detail={{
          parsed: true, goldEarned: [0, 300], killParticipation: 50, observers: 1, sentries: 0, deathMinutes: [],
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
