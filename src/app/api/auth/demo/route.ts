import { createDemoSignInToken, isDemoLoginOn } from "@/lib/auth/demo-login";

function error(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

/**
 * Sign-in page, demo button: a one-time sign-in token for the demo account. No sign-in check (this is the sign-in)
 * and no input; it answers only while DEMO_LOGIN_EMAIL is set.
 */
export async function POST() {
  if (!isDemoLoginOn()) return error("Demo login is off.", 404);

  const ticket = await createDemoSignInToken();
  if (!ticket) return error("Could not start the demo login. Try again.", 502);
  return Response.json({ ticket });
}
