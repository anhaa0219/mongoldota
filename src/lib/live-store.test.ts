import { describe, expect, it, vi } from "vitest";

vi.mock("@/db", () => ({ db: null }));

const { createGsiToken, findGsiOwner, hashToken } = await import("@/lib/live-store");

describe("live-store", () => {
  it("hashes tokens with sha256", () => {
    expect(hashToken("abc")).toBe("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
  });

  it("returns null without a database", async () => {
    expect(await findGsiOwner("x")).toBeNull();
    expect(await createGsiToken("u", "s")).toBeNull();
  });
});
