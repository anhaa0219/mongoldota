import { afterEach, describe, expect, it, vi } from "vitest";
import { devSteamId } from "@/lib/steam-auth";

const STEAM_ID = "76561198000000000";

describe("devSteamId", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("returns the hard-coded ID in development", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("DEV_STEAM_ID", ` ${STEAM_ID} `);
    expect(devSteamId()).toBe(STEAM_ID);
  });

  it("is ignored in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("DEV_STEAM_ID", STEAM_ID);
    expect(devSteamId()).toBeNull();
  });

  it("is ignored when missing or not a 64-bit Steam ID", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("DEV_STEAM_ID", "");
    expect(devSteamId()).toBeNull();
    vi.stubEnv("DEV_STEAM_ID", "39734272");
    expect(devSteamId()).toBeNull();
  });
});
