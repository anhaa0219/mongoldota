import { describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ deleted: [] as string[] }));

vi.mock("@clerk/nextjs/server", () => ({ auth: async () => ({ userId: "user_1" }) }));
vi.mock("@/lib/steam-link-store", () => ({
  deleteSteamLink: async (clerkUserId: string) => {
    state.deleted.push(clerkUserId);
  },
}));

const { NextRequest } = await import("next/server");
const { POST } = await import("@/app/api/auth/steam/logout/route");

describe("Steam unlink", () => {
  it("unlink deletes the saved link", async () => {
    const response = await POST(new NextRequest("https://mongoldota.example/api/auth/steam/logout", { method: "POST" }));
    expect(response.status).toBe(303);
    expect(state.deleted).toEqual(["user_1"]);
  });
});
