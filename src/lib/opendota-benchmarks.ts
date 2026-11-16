/** OpenDota per-hero benchmarks: what players at each percentile reach on a hero. */

import { getJson } from "@/lib/opendota";
import type { HeroBenchmarks } from "@/types/coach";

const ONE_DAY = 86400;

/** Null when OpenDota is unavailable. */
export async function getHeroBenchmarks(heroId: number): Promise<HeroBenchmarks | null> {
  const response = await getJson<{ result?: HeroBenchmarks }>(`/benchmarks?hero_id=${heroId}`, ONE_DAY);
  return response?.result ?? null;
}
