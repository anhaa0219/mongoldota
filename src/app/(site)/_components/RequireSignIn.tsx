import { getSignedInUserId } from "@/lib/sentry/sentry-user";
import { redirect } from "next/navigation";

/** Renders its children only for signed-in users; everyone else goes to /sign-in. */
export async function RequireSignIn({ children }: { children: React.ReactNode }) {
  const userId = await getSignedInUserId();
  if (!userId) redirect("/sign-in");

  return children;
}
