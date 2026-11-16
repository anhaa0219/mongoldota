import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { MatchRowData } from "@/components/MatchRow";
import { PagedMatchList } from "@/components/PagedMatchList";

const rows: MatchRowData[] = Array.from({ length: 25 }, (_, index) => ({
  id: index + 1, heroName: `Hero ${index + 1}`, heroSlug: "axe", won: true, ranked: true, kills: 1, deaths: 1, assists: 1,
  gpm: 400, durationMinutes: 30, ago: "1 d ago", itemImages: [null, null, null, null, null, null],
}));

describe("PagedMatchList", () => {
  it("shows only the first 10 matches and the page controls", () => {
    const html = renderToStaticMarkup(<PagedMatchList rows={rows} />);
    expect(html).toContain("Matches 1–10 of 25");
    expect(html).toContain("Hero 10<");
    expect(html).not.toContain("Hero 11<");
    expect(html).toContain("Next");
    expect(html).toMatch(/aria-current="page"[^>]*>1</);
  });

  it("hides the controls when everything fits on one page", () => {
    expect(renderToStaticMarkup(<PagedMatchList rows={rows.slice(0, 4)} />)).not.toContain("History pages");
  });
});
