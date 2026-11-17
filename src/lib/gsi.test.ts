import { describe, expect, it } from "vitest";
import { parseGsiPayload, shouldWrite, toLiveSnapshot } from "@/lib/gsi";
import { FIXTURE_STEAM_ID, gsiFixture } from "@/lib/gsi-test-fixture";

function snapshotOf(body: unknown, steamId = FIXTURE_STEAM_ID) {
  const payload = parseGsiPayload(body);
  if (!payload) throw new Error("fixture did not parse");
  return toLiveSnapshot(payload, steamId);
}

describe("parseGsiPayload", () => {
  it("parses a valid payload", () => {
    expect(parseGsiPayload(gsiFixture())?.auth.token).toBe("t0k");
  });

  it("rejects a payload without auth.token", () => {
    const body: Record<string, unknown> = gsiFixture();
    delete body.auth;
    expect(parseGsiPayload(body)).toBeNull();
  });
});

describe("toLiveSnapshot", () => {
  it("maps the player's own game", () => {
    const snapshot = snapshotOf(gsiFixture());
    expect(snapshot).toMatchObject({
      matchId: "7400000001",
      clockSeconds: 600,
      heroId: 47,
      heroKey: "viper",
      level: 16,
      alive: true,
      kills: 7,
      deaths: 3,
      assists: 5,
      gold: 1840,
      gpm: 512,
    });
    expect(snapshot?.inventory[0]).toBe("dragon_lance");
    expect(snapshot?.inventory[1]).toBeNull();
    expect(snapshot?.inventory).toHaveLength(6);
    expect(snapshot?.owned).toContain("ultimate_orb");
  });

  it("returns null for another player's steamid", () => {
    expect(snapshotOf(gsiFixture(), "76561198999999999")).toBeNull();
  });

  it("returns null without player.steamid", () => {
    const body = gsiFixture();
    const player: Record<string, unknown> = { ...body.player };
    delete player.steamid;
    expect(snapshotOf({ ...body, player })).toBeNull();
  });

  it("returns null in HERO_SELECTION", () => {
    const body = gsiFixture();
    expect(snapshotOf({ ...body, map: { ...body.map, game_state: "DOTA_GAMERULES_STATE_HERO_SELECTION" } })).toBeNull();
  });

  it("returns null in POST_GAME", () => {
    const body = gsiFixture();
    expect(snapshotOf({ ...body, map: { ...body.map, game_state: "DOTA_GAMERULES_STATE_POST_GAME" } })).toBeNull();
  });

  it("keeps a negative clock before the horn", () => {
    const body = gsiFixture();
    const map = { ...body.map, game_state: "DOTA_GAMERULES_STATE_PRE_GAME", clock_time: -45 };
    expect(snapshotOf({ ...body, map })?.clockSeconds).toBe(-45);
  });
});

describe("shouldWrite", () => {
  it("writes the first snapshot", () => expect(shouldWrite(null, 0, true)).toBe("write"));
  it("skips a change inside one second", () => expect(shouldWrite(0, 500, true)).toBe("skip"));
  it("writes a change after one second", () => expect(shouldWrite(0, 1200, true)).toBe("write"));
  it("skips an unchanged state for a while", () => expect(shouldWrite(0, 5000, false)).toBe("skip"));
  it("touches an unchanged state after 20 seconds", () => expect(shouldWrite(0, 21000, false)).toBe("touch"));
});
