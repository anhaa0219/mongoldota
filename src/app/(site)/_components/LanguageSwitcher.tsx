"use client";

import { Languages } from "lucide-react";
import { useRef, useState } from "react";
import { useWords } from "@/lib/i18n/use-words";
import { useDismiss } from "../_hooks/use-dismiss";
import { useLanguage, type LanguageCode } from "@/lib/i18n/use-language";
import { LanguageOptions } from "./LanguageOptions";

/** Sidebar language picker (desktop). The phone header has the same choices in its "More" menu. */
export function LanguageSwitcher({ className }: { className?: string }) {
  const [open, setOpen] = useState(false);
  const [language, setLanguage] = useLanguage();
  const words = useWords();
  const rootRef = useRef<HTMLDivElement>(null);
  useDismiss(rootRef, open, () => setOpen(false));

  function choose(code: LanguageCode) {
    setLanguage(code);
    setOpen(false);
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-label={words.common.language}
        aria-haspopup="menu"
        aria-expanded={open}
        title={words.common.language}
        className="grid size-[3.6rem] place-items-center rounded-full text-white/80 transition-colors hover:bg-white/10 hover:text-accent aria-expanded:bg-white/10 aria-expanded:text-accent"
      >
        <Languages className={className} />
      </button>

      {open && (
        <ul
          role="menu"
          className="glass-panel glass-blur pop-in absolute bottom-0 left-full z-40 ml-[1.6rem] w-[11rem] origin-bottom-left overflow-hidden rounded-[1rem] py-[0.4rem]"
        >
          <LanguageOptions language={language} onChoose={choose} />
        </ul>
      )}
    </div>
  );
}
