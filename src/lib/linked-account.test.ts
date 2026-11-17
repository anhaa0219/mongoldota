import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  userId: "user_1" as string | null,
  cookie: undefined as string | undefined,
  saved: [] as [string, string][],
  lookups: 0,
  claimedByOther: false,
}));

vi.mock("@clerk/nextjs/server", () => ({ auth: async () => ({ userId: state.userId }) }));
vi.mock("next/headers", () => ({ cookies: async () => ({ get: () => (state.cookie ? { value: state.cookie } : undefined) }) }));
vi.mock("@/lib/steam-link-store", () => ({
  getSteamLink: async () => {
    state.lookups += 1;
    return { ok: true, steamId: null };
  },
  migrateSteamLink: async (clerkUserId: string, steamId: string) => {
    if (state.claimedByOther) return false;
    state.saved.push([clerkUserId, steamId]);
    return true;
  },
}));

const { createSession } = await import("@/lib/steam-auth");
const { getLinkedSteamId } = await import("@/lib/linked-account");
const STEAM_ID = "76561197960265729";

describe("getLinkedSteamId", () => {
  beforeEach(() => {
    state.userId = "user_1";
    state.cookie = undefined;
    state.saved = [];
    state.lookups = 0;
    state.claimedByOther = false;
  });

  it("saves the old cookie for an account without a link", async () => {
    state.cookie = createSession(STEAM_ID);
    expect(await getLinkedSteamId()).toBe(STEAM_ID);
    expect(state.saved).toEqual([["user_1", STEAM_ID]]);
  });

  it("does not adopt an old cookie another account already claimed", async () => {
    state.cookie = createSession(STEAM_ID);
    state.claimedByOther = true;
    expect(await getLinkedSteamId()).toBeNull();
    expect(state.saved).toEqual([]);
  });

  it("is not linked when signed out", async () => {
    state.userId = null;
    state.cookie = createSession(STEAM_ID);
    expect(await getLinkedSteamId()).toBeNull();
    expect(state.lookups).toBe(0);
  });
});
