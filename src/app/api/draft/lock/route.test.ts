import { beforeEach, describe, expect, it, vi } from "vitest";
import type { LockedDraft } from "@/types/live";

const state = vi.hoisted(() => ({ userId: "user_1" as string | null, saved: [] as [string, LockedDraft][] }));

vi.mock("@clerk/nextjs/server", () => ({ auth: async () => ({ userId: state.userId }) }));
vi.mock("@/lib/live-tips-store", () => ({
  saveLockedDraft: async (clerkUserId: string, draft: LockedDraft) => {
    state.saved.push([clerkUserId, draft]);
  },
}));

const { POST } = await import("@/app/api/draft/lock/route");

const DRAFT: LockedDraft = {
  side: "radiant",
  myHeroId: 47,
  allies: [
    { heroId: 47, position: 2 },
    { heroId: 26, position: 5 },
  ],
  enemies: [{ heroId: 44, position: 1 }],
};
const send = (body: unknown) => POST(new Request("https://mongoldota.example/api/draft/lock", { method: "POST", body: JSON.stringify(body) }));

describe("POST /api/draft/lock", () => {
  beforeEach(() => {
    state.userId = "user_1";
    state.saved = [];
  });

  it("rejects signed-out requests with 401", async () => {
    state.userId = null;
    expect((await send(DRAFT)).status).toBe(401);
    expect(state.saved).toEqual([]);
  });

  it("rejects a hero that is not on the player's team with 400", async () => {
    expect((await send({ ...DRAFT, myHeroId: 44 })).status).toBe(400);
    expect(state.saved).toEqual([]);
  });

  it("saves a valid draft", async () => {
    expect((await send(DRAFT)).status).toBe(200);
    expect(state.saved).toEqual([["user_1", DRAFT]]);
  });
});
