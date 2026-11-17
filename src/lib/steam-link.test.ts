import { describe, expect, it } from "vitest";
import { resolveSteamLink } from "@/lib/steam-link";

describe("resolveSteamLink", () => {
  it("uses the saved link", () => {
    expect(resolveSteamLink({ ok: true, steamId: "A" }, null)).toEqual({ steamId: "A", migrate: false });
  });

  it("migrates a valid old cookie into the database", () => {
    expect(resolveSteamLink({ ok: true, steamId: null }, "B")).toEqual({ steamId: "B", migrate: true });
  });

  it("is not linked without a row or cookie", () => {
    expect(resolveSteamLink({ ok: true, steamId: null }, null)).toEqual({ steamId: null, migrate: false });
  });

  it("falls back to the cookie when the database is unavailable", () => {
    expect(resolveSteamLink({ ok: false }, "B")).toEqual({ steamId: "B", migrate: false });
  });

  it("keeps the account's own link over a cookie from someone else", () => {
    expect(resolveSteamLink({ ok: true, steamId: "A" }, "B")).toEqual({ steamId: "A", migrate: false });
  });
});
