"use client";

import { languages, useLanguage } from "@/lib/i18n/use-language";
import { useWords } from "@/lib/i18n/use-words";

/**
 * English / Монгол switch on the sign-in and sign-up screens. English until the visitor picks; the choice is saved
 * in the same cookie as the site's own language switcher.
 */
export function AuthLanguageToggle({ className }: { className?: string }) {
  const [language, setLanguage] = useLanguage();
  const words = useWords();

  return (
    <div role="group" aria-label={words.common.language} className={`glass-panel glass-blur flex rounded-full p-[0.3rem] ${className ?? ""}`}>
      {languages.map(({ code, label }) => (
        <button
          key={code}
          type="button"
          aria-pressed={language === code}
          onClick={() => {
            if (code !== language) setLanguage(code);
          }}
          className="rounded-full px-[1.1rem] py-[0.45rem] text-[1.05rem] text-white/70 transition-colors hover:text-accent aria-pressed:bg-accent aria-pressed:text-ink aria-pressed:hover:text-ink"
        >
          {label}
        </button>
      ))}
    </div>
  );
}
