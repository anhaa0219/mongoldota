import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  steamId: "76561197960265729" as string | null,
  userId: "user_1" as string | null,
  saveWorks: true,
  saved: [] as [string, string][],
}));

vi.mock("@/lib/steam-auth", () => ({
  SESSION_COOKIE: "steam_session",
  siteOrigin: (origin: string) => origin,
  verifySteamLogin: async () => state.steamId,
}));
vi.mock("@clerk/nextjs/server", () => ({ auth: async () => ({ userId: state.userId }) }));
vi.mock("@/lib/steam-link-store", () => ({
  saveSteamLink: async (clerkUserId: string, steamId: string) => {
    if (!state.saveWorks) return false;
    state.saved.push([clerkUserId, steamId]);
    return true;
  },
}));

const { NextRequest } = await import("next/server");
const { GET } = await import("@/app/api/auth/steam/callback/route");
const callback = () => GET(new NextRequest("https://mongoldota.example/api/auth/steam/callback?openid.mode=id_res"));

describe("Steam login callback", () => {
  beforeEach(() => {
    state.steamId = "76561197960265729";
    state.userId = "user_1";
    state.saveWorks = true;
    state.saved = [];
  });

  it("links Steam to the signed-in account and goes home", async () => {
    const response = await callback();
    expect(response.headers.get("location")).toBe("https://mongoldota.example/");
    expect(state.saved).toEqual([["user_1", "76561197960265729"]]);
  });

  it("sends a failed Steam check back with login=failed", async () => {
    state.steamId = null;
    expect((await callback()).headers.get("location")).toBe("https://mongoldota.example/?login=failed");
    expect(state.saved).toEqual([]);
  });

  it("sends a signed-out player to sign-in and saves nothing", async () => {
    state.userId = null;
    expect((await callback()).headers.get("location")).toBe("https://mongoldota.example/sign-in");
    expect(state.saved).toEqual([]);
  });

  it("reports login=failed when the link cannot be saved", async () => {
    state.saveWorks = false;
    expect((await callback()).headers.get("location")).toBe("https://mongoldota.example/?login=failed");
  });
});
