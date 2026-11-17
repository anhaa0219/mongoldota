import { beforeEach, describe, expect, it, vi } from "vitest";
import type { LiveSnapshot, LiveTip } from "@/types/live";

const NOW = 1_800_000_000_000;
const SNAPSHOT = { matchId: "m1", clockSeconds: 600, heroId: 47, heroKey: "viper", level: 16, alive: true, respawnSeconds: 0, kills: 7, deaths: 4, assists: 5, lastHits: 80, denies: 10, gold: 1840, gpm: 512, xpm: 600, inventory: [null, null, null, null, null, null], owned: [] } satisfies LiveSnapshot;

const state = vi.hoisted(() => ({
  userId: "user_1" as string | null,
  row: null as { snapshot: LiveSnapshot | null; updatedAt: Date } | null,
  tips: [] as LiveTip[],
  added: [] as Omit<LiveTip, "id" | "createdAt">[],
  modelCalls: 0,
  modelDelayMs: 0,
  reserved: new Map<string, number>(),
}));

vi.mock("@clerk/nextjs/server", () => ({ auth: async () => ({ userId: state.userId }) }));
vi.mock("@/lib/live-store", () => ({ getLiveRow: async () => state.row, getGsiSteamId: async () => "76561198000000001" }));
vi.mock("@/lib/live-slots-store", () => ({
  // Same contract as the SQL: claim the slot only when it was last claimed before the cutoff.
  reserveSlot: async (_user: string, slot: string, cutoff: Date) => {
    const last = state.reserved.get(slot);
    if (last !== undefined && last >= cutoff.getTime()) return false;
    state.reserved.set(slot, Date.now());
    return true;
  },
}));
vi.mock("@/lib/live-tips-store", () => ({
  getLockedDraft: async () => null,
  getTips: async () => state.tips,
  getPlanTip: async () => state.tips.find((tip) => tip.kind === "plan") ?? null,
  addTip: async (_user: string, tip: Omit<LiveTip, "id" | "createdAt">) => {
    state.added.push(tip);
    return { ...tip, id: 1, createdAt: NOW };
  },
}));
vi.mock("@/lib/hf", () => ({
  askQuickModel: async () => {
    state.modelCalls += 1;
    await new Promise((resolve) => setTimeout(resolve, state.modelDelayMs));
    return { ok: true, text: "Stay near Mars until you have BKB." };
  },
}));
vi.mock("@/lib/draft-advice-facts", () => ({ gatherAdviceFacts: async () => null }));
vi.mock("@/lib/opendota-heroes", () => ({
  getDraftHeroes: async () => [{ id: 47, name: "Viper", slug: "viper", winRate: 51, roles: [] }],
  getItemIndex: async () => ({ byId: new Map(), byKey: new Map() }),
}));
vi.mock("@/lib/opendota-draft", () => ({ getItemPopularity: async () => null }));

const { POST } = await import("@/app/api/live/coach/route");
const send = (body: unknown) => POST(new Request("https://mongoldota.example/api/live/coach", { method: "POST", body: JSON.stringify(body) }));

describe("POST /api/live/coach", () => {
  beforeEach(() => {
    vi.spyOn(Date, "now").mockReturnValue(NOW);
    state.userId = "user_1";
    state.row = { snapshot: SNAPSHOT, updatedAt: new Date(NOW - 2_000) };
    state.tips = [];
    state.added = [];
    state.modelCalls = 0;
    state.modelDelayMs = 0;
    state.reserved = new Map();
  });

  it("rejects signed-out requests with 401", async () => {
    state.userId = null;
    expect((await send({ kinds: ["death"] })).status).toBe(401);
  });

  it("answers 409 when no match is live", async () => {
    state.row = { snapshot: SNAPSHOT, updatedAt: new Date(NOW - 5 * 60_000) };
    expect((await send({ kinds: ["death"] })).status).toBe(409);
  });

  it("refuses a second automatic tip inside 90 s", async () => {
    state.reserved.set("tip:m1", NOW - 30_000);
    const response = await send({ kinds: ["death"] });
    expect(response.status).toBe(429);
    expect(state.modelCalls).toBe(0);
  });

  it("gives one tip when two tabs ask at the same moment", async () => {
    state.modelDelayMs = 20;
    const responses = await Promise.all([send({ kinds: ["death"] }), send({ kinds: ["death"] })]);
    expect(responses.map((response) => response.status).sort()).toEqual([200, 429]);
    expect(state.modelCalls).toBe(1);
  });

  it("writes one item plan when two tabs ask at the same moment", async () => {
    state.modelDelayMs = 20;
    await Promise.all([send({ kinds: ["plan"] }), send({ kinds: ["plan"] })]);
    expect(state.modelCalls).toBe(1);
  });

  it("writes a new plan when asked to replan", async () => {
    state.tips = [{ id: 9, matchId: "m1", clockSeconds: 0, kind: "plan", text: "Item plan: Dragon Lance", plan: ["dragon_lance"], createdAt: NOW - 120_000 }];
    await send({ kinds: ["plan"], replan: true });
    expect(state.modelCalls).toBe(1);
  });

  it("saves and returns a tip", async () => {
    const response = await send({ kinds: ["death"] });
    expect(response.status).toBe(200);
    expect(state.added[0]).toMatchObject({ kind: "death", matchId: "m1", clockSeconds: 600, text: "Stay near Mars until you have BKB." });
  });

  it("returns the existing plan for this match", async () => {
    state.tips = [{ id: 9, matchId: "m1", clockSeconds: 0, kind: "plan", text: "Item plan: Dragon Lance", plan: ["dragon_lance"], createdAt: NOW - 60_000 }];
    const response = await send({ kinds: ["plan"] });
    expect(((await response.json()) as { tip: LiveTip }).tip.id).toBe(9);
    expect(state.modelCalls).toBe(0);
  });
});
