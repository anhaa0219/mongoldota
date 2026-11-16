import { afterEach, describe, expect, it, vi } from "vitest";
import { createSession, devSteamId, readSession } from "@/lib/steam-auth";

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

describe("readSession", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("accepts its own session and rejects a tampered one", () => {
    vi.stubEnv("AUTH_SECRET", "test-secret");
    const session = createSession(STEAM_ID);
    expect(readSession(session)).toBe(STEAM_ID);
    expect(readSession(`${STEAM_ID}.forged`)).toBeNull();
  });

  it("treats a missing AUTH_SECRET in production as signed out instead of crashing", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("AUTH_SECRET", "");
    expect(() => createSession(STEAM_ID)).toThrow("AUTH_SECRET is not set");
    expect(readSession(`${STEAM_ID}.anything`)).toBeNull();
  });
});
