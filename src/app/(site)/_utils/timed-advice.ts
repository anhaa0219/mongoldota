/** AI answers stored per player: reused for 12 hours, then asked again (server only). */

import { and, eq } from "drizzle-orm";
import { connection } from "next/server";
import type { z } from "zod";
import type { Language } from "@/lib/i18n/language";
import { db, withQueryTimeout } from "@/db";
import { aiAdvice } from "@/db/schema";
import { isFresh } from "./advice-refresh";

export type AdviceKind = "stats-coach" | "hero-picks";

/** English answers keep the plain kind; Mongolian ones are stored apart ("stats-coach:mn"), so neither is shown for the other. */
const storedKind = (kind: AdviceKind, language: Language) => (language === "mn" ? `${kind}:mn` : kind);

export interface TimedAdvice<T> {
  value: T;
  /** Milliseconds since epoch. */
  createdAt: number;
  /** The request time this was read at (for the countdown's first render). */
  now: number;
}

async function readStored(accountId: string, kind: string) {
  if (!db) return null;
  try {
    const [row] = await withQueryTimeout(
      db
        .select({ payload: aiAdvice.payload, createdAt: aiAdvice.createdAt })
        .from(aiAdvice)
        .where(and(eq(aiAdvice.accountId, Number(accountId)), eq(aiAdvice.kind, kind)))
        .limit(1),
    );
    return row ?? null;
  } catch {
    return null; // Database down or over 4 s, or the ai_advice migration not applied yet.
  }
}

async function writeStored(accountId: string, kind: string, payload: unknown, createdAt: Date) {
  if (!db) return;
  try {
    await withQueryTimeout(
      db
        .insert(aiAdvice)
        .values({ accountId: Number(accountId), kind, payload, createdAt })
        .onConflictDoUpdate({ target: [aiAdvice.accountId, aiAdvice.kind], set: { payload, createdAt } }),
    );
  } catch {
    // Not saved: the next visit asks again.
  }
}

interface TimedAdviceOptions<T> {
  accountId: string;
  kind: AdviceKind;
  /** The language the answer is written in. */
  language: Language;
  schema: z.ZodType<T>;
  /** Asks the AI; null when it failed. */
  generate: () => Promise<T | null>;
  /** False when stored advice no longer fits (e.g. the player changed rank). */
  stillFits?: (value: T) => boolean;
}

/**
 * Stored advice younger than 12 hours, else a fresh answer (saved with the time it was made).
 * When the AI fails, older stored advice is still better than none. Null only when there is nothing at all.
 */
export async function getTimedAdvice<T>({ accountId, kind: baseKind, language, schema, generate, stillFits }: TimedAdviceOptions<T>): Promise<TimedAdvice<T> | null> {
  await connection(); // reads the clock: request time only, never prerendered
  const now = Date.now();
  const kind = storedKind(baseKind, language);
  const stored = await readStored(accountId, kind);
  const parsed = stored ? schema.safeParse(stored.payload) : null;
  const previous = parsed?.success && stored ? { value: parsed.data, createdAt: stored.createdAt.getTime(), now } : null;
  const fits = previous !== null && (stillFits?.(previous.value) ?? true);
  if (previous && fits && isFresh(previous.createdAt, now)) return previous;

  const fresh = await generate();
  if (fresh !== null) {
    await writeStored(accountId, kind, fresh, new Date(now));
    return { value: fresh, createdAt: now, now };
  }
  return fits ? previous : null;
}
