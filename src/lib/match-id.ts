import { z } from "zod";

const matchIdSchema = z
  .string()
  .regex(/^\d{1,19}$/)
  .transform(Number)
  .refine((id) => Number.isSafeInteger(id) && id > 0);

/** A Dota match id from a URL segment, or null when it is not a positive whole number. */
export function parseMatchId(raw: string): number | null {
  const result = matchIdSchema.safeParse(raw);
  return result.success ? result.data : null;
}
