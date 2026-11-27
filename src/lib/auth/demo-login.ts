/**
 * Demo-day login (server only): one button on the sign-in page signs in as the account whose email is in
 * DEMO_LOGIN_EMAIL, with its linked Steam, no Google step. Anyone who opens the sign-in page while it is set can use
 * it, so set the variable only for the demo and remove it afterwards.
 */

import { clerkClient } from "@clerk/nextjs/server";

/** The button uses the token right away, so it is short on purpose. */
const TOKEN_SECONDS = 60;
const CLERK_TIMEOUT_MS = 8_000;

function demoEmail(): string | null {
  return process.env.DEMO_LOGIN_EMAIL?.trim().toLowerCase() || null;
}

/** True when DEMO_LOGIN_EMAIL is set: the sign-in page shows the demo button and the route answers. */
export function isDemoLoginOn(): boolean {
  return demoEmail() !== null;
}

async function tokenFor(email: string): Promise<string | null> {
  const client = await clerkClient();
  const { data: users } = await client.users.getUserList({ emailAddress: [email], limit: 5 });
  const user = users.find((candidate) => candidate.emailAddresses.some((address) => address.emailAddress.toLowerCase() === email));
  if (!user) return null;

  const { token } = await client.signInTokens.createSignInToken({ userId: user.id, expiresInSeconds: TOKEN_SECONDS });
  return token;
}

/** A one-time Clerk sign-in token for the demo account; null when the demo is off, the account is missing or Clerk fails. */
export async function createDemoSignInToken(): Promise<string | null> {
  const email = demoEmail();
  if (!email) return null;
  try {
    const timeout = new Promise<null>((resolve) => setTimeout(() => resolve(null), CLERK_TIMEOUT_MS));
    return await Promise.race([tokenFor(email), timeout]);
  } catch {
    // Clerk down, slow or the secret key is wrong: the button shows a friendly message.
    return null;
  }
}
