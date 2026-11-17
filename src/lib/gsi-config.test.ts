import { unzipSync, strFromU8 } from "fflate";
import { describe, expect, it } from "vitest";
import { buildGsiConfig, setupZip } from "@/lib/gsi-config";

describe("buildGsiConfig", () => {
  const config = buildGsiConfig("https://mongoldota.example", "abc");

  it("writes the uri, token and throttle", () => {
    expect(config).toMatch(/"uri"\s+"https:\/\/mongoldota\.example\/api\/gsi"/);
    expect(config).toMatch(/"token"\s+"abc"/);
    expect(config).toMatch(/"throttle"\s+"1\.0"/);
    expect(config).toMatch(/"heartbeat"\s+"30\.0"/);
  });

  it("asks for the six data sections", () => {
    for (const section of ["provider", "map", "player", "hero", "abilities", "items"]) {
      expect(config).toMatch(new RegExp(`"${section}"\\s+"1"`));
    }
  });
});

describe("setupZip", () => {
  it("zips the config into the gamestate_integration folder", () => {
    const files = unzipSync(setupZip("x"));
    expect(Object.keys(files)).toEqual(["gamestate_integration/gamestate_integration_mongoldota.cfg"]);
    expect(strFromU8(files["gamestate_integration/gamestate_integration_mongoldota.cfg"])).toBe("x");
  });
});
