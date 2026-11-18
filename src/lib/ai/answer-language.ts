/** Which language the AI writes in, and the prompt line that asks for Mongolian. Pure. */

import type { Language } from "@/lib/i18n/language";

/**
 * The owner's switch: false keeps every AI answer in English while the pages stay Mongolian
 * (if the model's Mongolian is not good enough; check with src/db/scripts/ai-mongolian-samples.ts).
 */
export const AI_ANSWERS_FOLLOW_LANGUAGE = true;

/** The language the AI should answer in for a page shown in `page`. */
export function answerLanguage(page: Language): Language {
  return AI_ANSWERS_FOLLOW_LANGUAGE ? page : "en";
}

const MONGOLIAN =
  "Write every sentence in Mongolian (Cyrillic script). Keep hero, item and ability names and these Dota terms in English: " +
  "mid, safe lane, off lane, jungle, carry, support, GPM, XPM, KDA, BKB, Roshan, Aegis, buyback, Radiant, Dire. " +
  "JSON keys, category and tone values, item keys and hero names stay exactly as asked.";

/** Prompt lines to add before the answer format: none for English. */
export function languageLines(language: Language): string[] {
  return language === "mn" ? [MONGOLIAN] : [];
}
