/**
 * The signed-in Clerk user ID (null when signed out), also set as this request's Sentry user so any error later in
 * the request shows which player hit it. Only the ID is sent: no email, name or Steam ID. Server only.
 */

import { auth } from "@clerk/nextjs/server";
import * as Sentry from "@sentry/nextjs";

export async function getSignedInUserId(): Promise<string | null> {
  const { userId } = await auth();
  Sentry.setUser(userId ? { id: userId } : null);
  return userId;
}
