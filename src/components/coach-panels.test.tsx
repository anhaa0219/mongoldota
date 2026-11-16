import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { HeroComparison } from "@/components/HeroComparison";
import { SuggestionList } from "@/components/SuggestionList";

describe("coach panels", () => {
  it("shows each benchmark with how many players it beats", () => {
    const html = renderToStaticMarkup(
      <HeroComparison heroName="Puck" rows={[{ metric: "gold_per_min", label: "GPM", yours: 512.4, median: 521, betterThan: 47.6 }]} />,
    );
    expect(html).toContain("You vs other Puck players");
    expect(html).toContain("512");
    expect(html).toContain("beats 48%");
  });

  it("asks for more games when there is nothing to compare", () => {
    expect(renderToStaticMarkup(<HeroComparison heroName="Puck" rows={[]} />)).toContain("Play 3+ games on Puck");
  });

  it("lists suggestions in order", () => {
    const html = renderToStaticMarkup(
      <SuggestionList
        suggestions={[
          { id: "a", tone: "fix", title: "Die less", detail: "Carry a TP." },
          { id: "b", tone: "tip", title: "Try mid lane more", detail: "You win 70% there." },
        ]}
      />,
    );
    expect(html.indexOf("Die less")).toBeLessThan(html.indexOf("Try mid lane more"));
  });
});
