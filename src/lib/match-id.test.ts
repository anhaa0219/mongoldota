import { describe, expect, it } from "vitest";
import { parseMatchId } from "@/lib/match-id";

describe("parseMatchId", () => {
  it("accepts a real match id", () => {
    expect(parseMatchId("9086993848")).toBe(9086993848);
  });

  it.each(["abc", "", "-1", "0", "12.5", "1234567890123456789012345"])("rejects %j", (raw) => {
    expect(parseMatchId(raw)).toBeNull();
  });
});
