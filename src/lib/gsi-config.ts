/** The player's Dota setup file (Valve KeyValues format) and the zip that delivers it as a ready folder. Pure. */

import { strToU8, zipSync } from "fflate";

export const SETUP_FOLDER = "gamestate_integration";
export const SETUP_FILE = "gamestate_integration_mongoldota.cfg";
export const SETUP_ZIP_NAME = "mongoldota-dota-setup.zip";

const DATA_SECTIONS = ["provider", "map", "player", "hero", "abilities", "items"];

/** Dota sends the game state to `<siteUrl>/api/gsi` about once a second, with the token in every request. */
export function buildGsiConfig(siteUrl: string, token: string): string {
  return [
    `"MongolDota"`,
    `{`,
    `  "uri"       "${siteUrl}/api/gsi"`,
    `  "timeout"   "5.0"`,
    `  "buffer"    "0.1"`,
    `  "throttle"  "1.0"`,
    `  "heartbeat" "30.0"`,
    `  "auth"`,
    `  {`,
    `    "token" "${token}"`,
    `  }`,
    `  "data"`,
    `  {`,
    ...DATA_SECTIONS.map((section) => `    "${section}" "1"`),
    `  }`,
    `}`,
    ``,
  ].join("\n");
}

/** One folder with the setup file inside, so the player drags a single folder into Dota's cfg folder. */
export function setupZip(configText: string): Uint8Array {
  return zipSync({ [`${SETUP_FOLDER}/${SETUP_FILE}`]: strToU8(configText) });
}
