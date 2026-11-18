import { ClerkProvider } from "@clerk/nextjs";
import { mnMN } from "@clerk/localizations";
import { WordsProvider } from "@/components/WordsProvider";
import { clerkAppearance } from "@/lib/clerk-appearance";
import type { Language } from "@/lib/i18n/language";

/**
 * Clerk and the site's words in the visitor's language. Rendered by the (site) and (auth) layouts inside their
 * Suspense boundaries, where the language cookie can be read; the root layout cannot read it, so Clerk lives here.
 */
export function LanguageProviders({ language, children }: { language: Language; children: React.ReactNode }) {
  return (
    <ClerkProvider
      appearance={clerkAppearance}
      localization={language === "mn" ? mnMN : undefined}
      signInUrl="/sign-in"
      signUpUrl="/sign-up"
      afterSignOutUrl="/sign-in"
    >
      <WordsProvider language={language}>{children}</WordsProvider>
    </ClerkProvider>
  );
}
