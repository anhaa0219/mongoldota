import { describe, expect, it } from "vitest";
import { toPlaystyle } from "@/lib/playstyle";

describe("toPlaystyle", () => {
  it("averages known fields per match, in display order", () => {
    const totals = [
      { field: "actions_per_min", n: 100, sum: 25828 },
      { field: "kills", n: 100, sum: 838 },
      { field: "denies", n: 100, sum: 1481 },
      { field: "purchase_ward_observer", n: 90, sum: 294 },
    ];
    expect(toPlaystyle(totals)).toEqual([
      { label: "Denies", average: 14.81, matches: 100 },
      { label: "APM", average: 258.28, matches: 100 },
      { label: "Observers bought", average: 294 / 90, matches: 90 },
    ]);
  });

  it("skips fields with no matches", () => {
    expect(toPlaystyle([{ field: "stuns", n: 0, sum: 0 }])).toEqual([]);
  });
});
