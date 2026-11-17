import { describe, expect, it, vi } from "vitest";

vi.mock("@/db", () => ({ db: null }));

const { getSteamLink, migrateSteamLink, saveSteamLink } = await import("@/lib/steam-link-store");

describe("steam-link-store", () => {
  it("reports the database as unavailable without one", async () => {
    expect(await getSteamLink("u")).toEqual({ ok: false });
  });

  it("does not save without a database", async () => {
    expect(await saveSteamLink("u", "76561197960265729")).toBe(false);
  });

  it("does not move an old cookie without a database", async () => {
    expect(await migrateSteamLink("u", "76561197960265729")).toBe(false);
  });
});
