import { getSignedInUserId } from "@/lib/sentry/sentry-user";
import { redirect } from "next/navigation";

/**
 * Sign-in check for Server Components that load data. The (site) layout's RequireSignIn does NOT stop
 * a page's own components from running (Next 16 renders route segments independently), so every
 * component that calls OpenDota or writes to the database checks here first.
 */
export async function requireUserId(): Promise<string> {
  const userId = await getSignedInUserId();
  if (!userId) redirect("/sign-in");
  return userId;
}
