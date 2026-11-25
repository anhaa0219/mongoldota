"use client";

import { useAuth } from "@clerk/nextjs";
import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

/**
 * Tags browser errors and Session Replays with the signed-in Clerk user ID (cleared on sign-out). Only the ID is
 * sent: no email, name or Steam ID. Renders nothing.
 */
export function SentryUser() {
  const { isLoaded, userId } = useAuth();

  useEffect(() => {
    if (!isLoaded) return;
    Sentry.setUser(userId ? { id: userId } : null);
  }, [isLoaded, userId]);

  return null;
}
