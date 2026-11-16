import { describe, expect, it } from "vitest";
import { MATCH_TABS, toMatchTab } from "@/lib/match-tabs";

describe("toMatchTab", () => {
  it("returns a known tab id", () => {
    expect(toMatchTab("combat")).toBe("combat");
  });

  it("falls back to story for unknown, missing or repeated values", () => {
    expect(toMatchTab("nope")).toBe("story");
    expect(toMatchTab(undefined)).toBe("story");
    expect(toMatchTab(["map", "log"])).toBe("story");
  });

  it("is a plain array a Server Component can use", () => {
    expect(Array.isArray(MATCH_TABS)).toBe(true);
  });
});
