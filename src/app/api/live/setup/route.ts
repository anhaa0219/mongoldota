/** Live Coach "Download setup folder": a new GSI token, written into a zip the player drags into Dota's cfg folder. */

import { auth } from "@clerk/nextjs/server";
import { buildGsiConfig, SETUP_ZIP_NAME, setupZip } from "@/lib/gsi-config";
import { getLinkedSteamId } from "@/lib/linked-account";
import { createGsiToken } from "@/lib/live-store";
import { siteOrigin } from "@/lib/steam-auth";

const error = (message: string, status: number) => Response.json({ error: message }, { status });

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) return error("Sign in first.", 401);

  const steamId = await getLinkedSteamId();
  if (!steamId) return error("Link Steam first.", 400);

  const token = await createGsiToken(userId, steamId);
  if (!token) return error("Live Coach is not set up yet.", 503);

  const zip = setupZip(buildGsiConfig(siteOrigin(new URL(request.url).origin), token));
  return new Response(new Blob([zip as BlobPart]), {
    headers: {
      "content-type": "application/zip",
      "content-disposition": `attachment; filename="${SETUP_ZIP_NAME}"`,
      "cache-control": "no-store",
    },
  });
}
