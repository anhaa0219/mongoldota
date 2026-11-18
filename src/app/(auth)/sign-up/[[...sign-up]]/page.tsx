import { SignUp } from "@clerk/nextjs";
import { AuthShell } from "@/app/(auth)/_components/AuthShell";

export default function SignUpPage() {
  return (
    <AuthShell>
      <SignUp path="/sign-up" routing="path" signInUrl="/sign-in" fallbackRedirectUrl="/" />
    </AuthShell>
  );
}
