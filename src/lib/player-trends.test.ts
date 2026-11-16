import { describe, expect, it } from "vitest";
import { coachMatch } from "@/lib/coach-test-fixture";
import { formTrend } from "@/lib/player-trends";

describe("formTrend", () => {
  it("needs 10+ matches on both sides of the last 20", () => {
    expect(formTrend(Array.from({ length: 29 }, () => coachMatch()))).toBeNull();
  });

  it("compares the last 20 with the matches before them", () => {
    const recent = Array.from({ length: 20 }, (_, index) => coachMatch({ won: index < 5, deaths: 8 }));
    const earlier = Array.from({ length: 10 }, () => coachMatch({ won: true, deaths: 4 }));
    const trend = formTrend([...recent, ...earlier]);
    expect(trend?.recent).toMatchObject({ matches: 20, winRate: 25, deaths: 8, kda: 1.5 });
    expect(trend?.earlier).toMatchObject({ matches: 10, winRate: 100, deaths: 4, kda: 3 });
  });
});
