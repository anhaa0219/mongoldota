/** The visitor's language on the server, from the `lang` cookie. Reads cookies: call inside <Suspense> or a route handler. */

import { cookies } from "next/headers";
import { LANG_COOKIE, toLanguage, type Language } from "./language";
import { wordsFor, type Words } from "./words";

export async function getLanguage(): Promise<Language> {
  return toLanguage((await cookies()).get(LANG_COOKIE)?.value);
}

export async function getWords(): Promise<Words> {
  return wordsFor(await getLanguage());
}
