"use client";

import { Languages } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { usePreference } from "@/lib/use-preference";

const languages = [
  { code: "en", label: "English" },
  { code: "mn", label: "Монгол" },
] as const;

type LanguageCode = (typeof languages)[number]["code"];
const codes = languages.map((l) => l.code);

/**
 * Language picker. Remembers the choice and sets `lang` on <html>.
 * Page text is not translated yet — hook translations up to `language` later.
 */
export function LanguageSwitcher({ className }: { className?: string }) {
  const [open, setOpen] = useState(false);
  const [language, setLanguage] = usePreference<LanguageCode>("language", codes, "en");
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  useEffect(() => {
    if (!open) return;
    function close(event: MouseEvent | KeyboardEvent) {
      if (event instanceof KeyboardEvent ? event.key === "Escape" : !rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
    };
  }, [open]);

  function choose(code: LanguageCode) {
    setLanguage(code);
    setOpen(false);
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-label="Language"
        aria-haspopup="menu"
        aria-expanded={open}
        title="Language"
        className="text-white/80 transition-colors hover:text-accent"
      >
        <Languages className={className} />
      </button>

      {open && (
        <ul
          role="menu"
          className="glass-panel absolute bottom-0 left-full z-40 ml-[2.4rem] w-[11rem] overflow-hidden rounded-[1rem] py-[0.4rem]"
        >
          {languages.map((item) => (
            <li key={item.code} role="none">
              <button
                type="button"
                role="menuitemradio"
                aria-checked={item.code === language}
                onClick={() => choose(item.code)}
                className={`flex w-full items-center justify-between px-[1rem] py-[0.55rem] text-left text-[1.1rem] transition-colors hover:bg-white/10 ${
                  item.code === language ? "text-accent" : "text-white"
                }`}
              >
                {item.label}
                <span className="text-[0.85rem] uppercase text-white/45">{item.code}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
