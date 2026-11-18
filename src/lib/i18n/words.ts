/** All visible wording, per language. `mn` must have exactly the shape of `en`: a missing line fails the typecheck. */

import { en } from "./en";
import type { Language } from "./language";
import { mn } from "./mn";

export type Words = typeof en;

export function wordsFor(language: Language): Words {
  return language === "mn" ? mn : en;
}
