import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { StoryTab } from "@/components/match/StoryTab";
import { toMatchView } from "@/lib/match-view";
import { fixtureHeroes, fixtureItems, fixtureMatch } from "@/lib/match-test-fixture";

describe("StoryTab accessibility", () => {
  const html = renderToStaticMarkup(<StoryTab view={toMatchView(fixtureMatch(), fixtureHeroes, fixtureItems, 42)} followed={0} time={600} />);

  it("announces only the list of moments, not the clock heading that changes every second", () => {
    expect(html).toMatch(/<ul[^>]*aria-live="polite"/);
    expect(html).not.toMatch(/<section[^>]*aria-live/);
  });
});
