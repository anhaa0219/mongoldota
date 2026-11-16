import { beforeEach, describe, expect, it, vi } from "vitest";

const auth = vi.hoisted(() => ({ steamId: "76561197960265729" as string | null, secretMissing: false }));

vi.mock("@/lib/steam-auth", () => ({
  SESSION_COOKIE: "steam_session",
  SESSION_COOKIE_OPTIONS: { httpOnly: true, path: "/" },
  siteOrigin: (origin: string) => origin,
  verifySteamLogin: async () => auth.steamId,
  createSession: (steamId: string) => {
    if (auth.secretMissing) throw new Error("AUTH_SECRET is not set");
    return `${steamId}.signature`;
  },
}));

const { NextRequest } = await import("next/server");
const { GET } = await import("@/app/api/auth/steam/callback/route");
const callback = () => GET(new NextRequest("https://mongoldota.example/api/auth/steam/callback?openid.mode=id_res"));

describe("Steam login callback", () => {
  beforeEach(() => {
    auth.steamId = "76561197960265729";
    auth.secretMissing = false;
  });

  it("signs in and goes home", async () => {
    const response = await callback();
    expect(response.headers.get("location")).toBe("https://mongoldota.example/");
    expect(response.cookies.get("steam_session")?.value).toBe("76561197960265729.signature");
  });

  it("sends a failed Steam check back with login=failed", async () => {
    auth.steamId = null;
    expect((await callback()).headers.get("location")).toBe("https://mongoldota.example/?login=failed");
  });

  it("never crashes when AUTH_SECRET is missing: redirects with login=failed and sets no cookie", async () => {
    auth.secretMissing = true;
    const response = await callback();
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("https://mongoldota.example/?login=failed");
    expect(response.cookies.get("steam_session")).toBeUndefined();
  });
});
