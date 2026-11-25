/** Live Coach "Download setup folder": a new GSI token, written into a zip the player drags into Dota's cfg folder. */

import { getSignedInUserId } from "@/lib/sentry/sentry-user";
import { buildGsiConfig, SETUP_ZIP_NAME, setupZip } from "./_utils/gsi-config";
import { getLinkedSteamId } from "@/lib/steam/linked-account";
import { createGsiToken } from "@/lib/live/live-store";
import { siteOrigin } from "@/lib/steam/steam-auth";
import { getWords } from "@/lib/i18n/server";

const error = (message: string, status: number) => Response.json({ error: message }, { status });

export async function POST(request: Request) {
  const say = (await getWords()).errors;
  const userId = await getSignedInUserId();
  if (!userId) return error(say.signIn, 401);

  const steamId = await getLinkedSteamId();
  if (!steamId) return error(say.linkSteam, 400);

  const token = await createGsiToken(userId, steamId);
  if (!token) return error(say.liveNotSetUp, 503);

  const zip = setupZip(buildGsiConfig(siteOrigin(new URL(request.url).origin), token));
  return new Response(new Blob([zip as BlobPart]), {
    headers: {
      "content-type": "application/zip",
      "content-disposition": `attachment; filename="${SETUP_ZIP_NAME}"`,
      "cache-control": "no-store",
    },
  });
}
