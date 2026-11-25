"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { LANG_COOKIE, LANG_COOKIE_MAX_AGE, type Language } from "@/lib/i18n/language";
import { useLanguageCode } from "@/lib/i18n/use-words";

/** Each language's own name, never translated. */
export const languages = [
  { code: "en", label: "English" },
  { code: "mn", label: "Монгол" },
] as const satisfies readonly { code: Language; label: string }[];

export type LanguageCode = Language;

/**
 * The language shown (from the `lang` cookie, read on the server) and a setter. Setting writes the cookie
 * and refreshes the page, so the server renders it in the new language; client state such as filters stays.
 */
export function useLanguage(): readonly [LanguageCode, (code: LanguageCode) => void] {
  const language = useLanguageCode();
  const router = useRouter();

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  function setLanguage(code: LanguageCode) {
    document.cookie = `${LANG_COOKIE}=${code}; path=/; max-age=${LANG_COOKIE_MAX_AGE}; samesite=lax`;
    router.refresh();
  }

  return [language, setLanguage] as const;
}
