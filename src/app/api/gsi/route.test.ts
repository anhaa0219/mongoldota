import { beforeEach, describe, expect, it, vi } from "vitest";
import { FIXTURE_STEAM_ID, gsiFixture } from "@/lib/gsi-test-fixture";
import type { LiveSnapshot } from "@/types/live";

const store = vi.hoisted(() => ({
  owner: { clerkUserId: "user_1", steamId: "" } as { clerkUserId: string; steamId: string } | null,
  row: null as { snapshot: LiveSnapshot | null; updatedAt: Date } | null,
  writes: [] as { clerkUserId: string; snapshot: LiveSnapshot | null }[],
  touches: 0,
}));

vi.mock("@/lib/live-store", () => ({
  findGsiOwner: async (token: string) => (token === "t0k" ? store.owner : null),
  getLiveRow: async () => store.row,
  writeLiveRow: async (clerkUserId: string, snapshot: LiveSnapshot | null) => {
    store.writes.push({ clerkUserId, snapshot });
  },
  touchLiveRow: async () => {
    store.touches += 1;
  },
}));

const { POST } = await import("@/app/api/gsi/route");

const send = (body: string, headers: Record<string, string> = {}) =>
  POST(new Request("https://mongoldota.example/api/gsi", { method: "POST", body, headers: { "content-type": "application/json", ...headers } }));

describe("POST /api/gsi", () => {
  beforeEach(() => {
    store.owner = { clerkUserId: "user_1", steamId: FIXTURE_STEAM_ID };
    store.row = null;
    store.writes = [];
    store.touches = 0;
  });

  it("rejects an unknown token with 401", async () => {
    const response = await send(JSON.stringify({ ...gsiFixture(), auth: { token: "wrong" } }));
    expect(response.status).toBe(401);
    expect(store.writes).toEqual([]);
  });

  it("rejects a body over 64 KB with 413", async () => {
    const response = await send(JSON.stringify({ ...gsiFixture(), padding: "x".repeat(70_000) }));
    expect(response.status).toBe(413);
  });

  it("rejects invalid JSON with 400", async () => {
    expect((await send("{not json")).status).toBe(400);
  });

  it("stores the player's snapshot", async () => {
    const response = await send(JSON.stringify(gsiFixture()));
    expect(response.status).toBe(200);
    expect(store.writes[0]?.clerkUserId).toBe("user_1");
    expect(store.writes[0]?.snapshot?.heroKey).toBe("viper");
  });

  it("stores no snapshot for a spectator payload", async () => {
    const body = gsiFixture();
    const player: Record<string, unknown> = { ...body.player };
    delete player.steamid;
    await send(JSON.stringify({ ...body, player }));
    expect(store.writes).toEqual([{ clerkUserId: "user_1", snapshot: null }]);
  });

  it("throttles writes inside one second", async () => {
    store.row = { snapshot: null, updatedAt: new Date(Date.now() - 300) };
    const response = await send(JSON.stringify(gsiFixture()));
    expect(response.status).toBe(200);
    expect(store.writes).toEqual([]);
  });
});
