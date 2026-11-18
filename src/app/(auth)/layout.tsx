import { Suspense, type ReactNode } from "react";
import { LanguageProviders } from "@/components/LanguageProviders";
import { getLanguage } from "@/lib/i18n/server";

/** Sign-in and sign-up in the visitor's language (cookie read inside Suspense, as Cache Components requires). */
async function AuthLanguage({ children }: { children: ReactNode }) {
  const language = await getLanguage();
  return (
    <LanguageProviders language={language}>
      <div className="contents" data-lang={language}>
        {children}
      </div>
    </LanguageProviders>
  );
}

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={null}>
      <AuthLanguage>{children}</AuthLanguage>
    </Suspense>
  );
}
