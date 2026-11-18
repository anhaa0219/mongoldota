import { SignIn } from "@clerk/nextjs";
import { AuthShell } from "@/app/(auth)/_components/AuthShell";

export default function SignInPage() {
  return (
    <AuthShell>
      <SignIn
        path="/sign-in"
        routing="path"
        signUpUrl="/sign-up"
        fallbackRedirectUrl="/"
      />
    </AuthShell>
  );
}
