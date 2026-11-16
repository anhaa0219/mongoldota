import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { PageBackdrop } from "@/components/PageBackdrop";
import { heroArtPath } from "@/lib/hero-images";

describe("PageBackdrop", () => {
  it("finds hero art by slug in public/heroes", () => {
    expect(heroArtPath("puck")).toBe("/heroes/puck.jpg");
  });

  it("shows the hero's art when given a slug", () => {
    const html = renderToStaticMarkup(<PageBackdrop heroSlug="puck" />);
    expect(html).toContain("<img");
    expect(html).toContain(encodeURIComponent("/heroes/puck.jpg"));
  });

  it("stays plain without a slug", () => {
    expect(renderToStaticMarkup(<PageBackdrop />)).not.toContain("<img");
  });
});
