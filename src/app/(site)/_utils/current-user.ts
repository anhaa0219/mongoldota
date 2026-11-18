import { currentUser } from "@clerk/nextjs/server";
import { unstable_rethrow } from "next/navigation";

/**
 * The signed-in Clerk user, or null when there is none or Clerk's API call fails
 * (e.g. "This operation was aborted" when a slow page request is cancelled).
 * Next.js's own internal errors are re-thrown so routing/prerendering keeps working.
 */
export async function currentUserOrNull(): Promise<Awaited<ReturnType<typeof currentUser>>> {
  try {
    return await currentUser();
  } catch (error) {
    unstable_rethrow(error);
    return null;
  }
}
