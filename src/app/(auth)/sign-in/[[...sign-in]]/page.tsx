import { SignIn } from "@clerk/nextjs";
import { AuthShell } from "@/app/(auth)/_components/AuthShell";
import { isDemoLoginOn } from "@/lib/auth/demo-login";
import { DemoSignIn } from "./_features/DemoSignIn";

export default function SignInPage() {
  return (
    <AuthShell>
      <SignIn
        path="/sign-in"
        routing="path"
        signUpUrl="/sign-up"
        fallbackRedirectUrl="/"
      />
      {/* Only while DEMO_LOGIN_EMAIL is set */}
      {isDemoLoginOn() && <DemoSignIn />}
    </AuthShell>
  );
}
