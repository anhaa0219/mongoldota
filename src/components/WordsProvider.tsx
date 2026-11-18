"use client";

import { LanguageContext } from "@/lib/i18n/use-words";
import type { Language } from "@/lib/i18n/language";

/** Gives every client component below it the visitor's language (read from the cookie on the server). */
export function WordsProvider({ language, children }: { language: Language; children: React.ReactNode }) {
  return <LanguageContext value={language}>{children}</LanguageContext>;
}
