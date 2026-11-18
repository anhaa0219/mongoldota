"use client";

import { createContext, useContext } from "react";
import type { Language } from "./language";
import { wordsFor, type Words } from "./words";

/** Set by WordsProvider from the server's reading of the cookie, so the first render is already in the right language. */
export const LanguageContext = createContext<Language>("en");

export function useLanguageCode(): Language {
  return useContext(LanguageContext);
}

export function useWords(): Words {
  return wordsFor(useLanguageCode());
}
