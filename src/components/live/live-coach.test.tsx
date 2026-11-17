import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { DraftStrip } from "@/components/live/DraftStrip";
import { LivePanel } from "@/components/live/LivePanel";
import { PositionPicker } from "@/components/live/PositionPicker";
import { TipList } from "@/components/live/TipList";
import type { LiveSnapshot, LiveTip, LockedDraft } from "@/types/live";

const HEROES = new Map([
  [47, "Viper"],
  [35, "Sniper"],
  [26, "Lion"],
  [44, "Phantom Assassin"],
]);
const DRAFT: LockedDraft = { side: "radiant", myHeroId: 47, allies: [{ heroId: 47, position: 2 }, { heroId: 26, position: 5 }], enemies: [{ heroId: 44, position: 1 }] };
const SNAPSHOT: LiveSnapshot = {
  matchId: "m1", clockSeconds: 600, heroId: 47, heroKey: "viper", level: 16, alive: true, respawnSeconds: 0,
  kills: 7, deaths: 3, assists: 5, lastHits: 80, denies: 10, gold: 1840, gpm: 512, xpm: 600,
  inventory: ["dragon_lance", null, null, null, null, null], owned: ["dragon_lance"], team: "radiant", buildings: [], buildingTeams: [],
};
const tip = (id: number, text: string): LiveTip => ({ id, matchId: "m1", clockSeconds: 600 + id, kind: "death", text, plan: null, createdAt: id });

describe("DraftStrip", () => {
  it("warns when the live hero differs from the draft", () => {
    const html = renderToStaticMarkup(<DraftStrip draft={DRAFT} heroNames={HEROES} liveHeroId={35} />);
    expect(html).toContain("Your draft says Viper but you&#x27;re playing Sniper");
  });

  it("asks to lock a draft when there is none", () => {
    expect(renderToStaticMarkup(<DraftStrip draft={null} heroNames={HEROES} liveHeroId={47} />)).toContain("Lock your draft on the Draft page for better advice.");
  });

  it("lists both teams for a matching draft", () => {
    const html = renderToStaticMarkup(<DraftStrip draft={DRAFT} heroNames={HEROES} liveHeroId={47} />);
    expect(html).toContain("Lion");
    expect(html).toContain("Phantom Assassin");
  });
});

describe("TipList", () => {
  it("shows newest first", () => {
    const html = renderToStaticMarkup(<TipList tips={[tip(2, "Newer tip"), tip(1, "Older tip")]} asking={false} error={null} canAsk onAsk={() => undefined} />);
    expect(html.indexOf("Newer tip")).toBeLessThan(html.indexOf("Older tip"));
    expect(html).toContain("Ask coach now");
  });
});

describe("LivePanel", () => {
  it("shows clock, KDA and gold", () => {
    const items = new Map([["dragon_lance", { name: "Dragon Lance", image: "https://cdn.example/dragon_lance.png" }]]);
    const html = renderToStaticMarkup(<LivePanel snapshot={SNAPSHOT} heroName="Viper" items={items} updatedAt={1_000} now={2_000} />);
    expect(html).toContain("10:00");
    expect(html).toContain("7 / 3 / 5");
    expect(html).toContain("1,840");
    expect(html).toContain("Dragon Lance");
    expect(html).toContain("Live");
  });
});

describe("PositionPicker", () => {
  it("marks the chosen position and says when it is only a guess", () => {
    const html = renderToStaticMarkup(<PositionPicker value={3} isGuess onChange={() => {}} />);
    expect(html).toMatch(/aria-checked="true"[^>]*>3</);
    expect(html).toContain("Our guess");
    expect(renderToStaticMarkup(<PositionPicker value={3} isGuess={false} onChange={() => {}} />)).not.toContain("Our guess");
  });
});
