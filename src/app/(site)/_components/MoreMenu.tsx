"use client";

import { SignOutButton } from "@clerk/nextjs";
import { Ellipsis, LogOut } from "lucide-react";
import { useRef, useState } from "react";
import { useWords } from "@/lib/i18n/use-words";
import { useDismiss } from "../_hooks/use-dismiss";
import { useLanguage, type LanguageCode } from "../_hooks/use-language";
import { LanguageOptions } from "./LanguageOptions";

/** Phones only: the "⋯" button in the header row, holding what the hidden sidebar has (Language, Log out). */
export function MoreMenu() {
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
    <div ref={rootRef} className="relative md:hidden">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-label={words.common.more}
        aria-haspopup="menu"
        aria-expanded={open}
        title={words.common.more}
        className="glass-panel grid size-[3.8rem] place-items-center rounded-full text-white/80 transition-colors hover:text-accent aria-expanded:text-accent"
      >
        <Ellipsis className="size-[1.6rem]" aria-hidden="true" />
      </button>

      {open && (
        <div
          role="menu"
          aria-label={words.common.more}
          className="glass-panel glass-blur pop-in absolute right-0 top-full z-40 mt-[0.6rem] w-[13rem] origin-top-right overflow-hidden rounded-[1rem] py-[0.4rem]"
        >
          <p className="px-[1rem] pb-[0.2rem] pt-[0.3rem] text-[0.8rem] uppercase tracking-[0.12em] text-white/45">{words.common.language}</p>
          <ul role="group" aria-label={words.common.language}>
            <LanguageOptions language={language} onChoose={choose} />
          </ul>
          <div role="separator" className="my-[0.4rem] h-px bg-white/10" />
          <SignOutButton>
            <button
              type="button"
              role="menuitem"
              className="flex w-full items-center gap-[0.6rem] px-[1rem] py-[0.55rem] text-left text-[1.1rem] text-white/80 transition-colors hover:bg-dire/15 hover:text-dire"
            >
              <LogOut className="size-[1.2rem]" aria-hidden="true" />
              {words.common.logOut}
            </button>
          </SignOutButton>
        </div>
      )}
    </div>
  );
}
