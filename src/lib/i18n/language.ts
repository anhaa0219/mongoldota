/** The site's languages and the cookie that remembers the choice. Pure: safe in server and browser code. */

export type Language = "en" | "mn";

export const LANG_COOKIE = "lang";
export const LANG_COOKIE_MAX_AGE = 365 * 24 * 3600;

/** Unknown or missing values read as English. */
export function toLanguage(value: string | undefined | null): Language {
  return value === "mn" ? "mn" : "en";
}
