"use client";

import { useEffect, useRef, useState } from "react";
import type { Matchup } from "@/types/draft";

type MatchupResponse = { matchups: Matchup[] } | { error: string };

async function fetchMatchups(heroId: number): Promise<Matchup[] | null> {
  try {
    const response = await fetch(`/api/draft/matchups?hero=${heroId}`);
    const body = (await response.json()) as MatchupResponse;
    return "matchups" in body ? body.matchups : null;
  } catch {
    return null;
  }
}

/** Loads (once per hero) the matchup list of every enemy pick. `failed` is true when one could not load. */
export function useEnemyMatchups(enemyIds: number[]) {
  const [matchups, setMatchups] = useState<Map<number, Matchup[]>>(() => new Map());
  const [failed, setFailed] = useState(false);
  const requested = useRef(new Set<number>());
  const key = enemyIds.join(",");

  useEffect(() => {
    const missing = key
      .split(",")
      .filter(Boolean)
      .map(Number)
      .filter((heroId) => !requested.current.has(heroId));
    for (const heroId of missing) {
      requested.current.add(heroId);
      void fetchMatchups(heroId).then((rows) => {
        if (!rows) {
          requested.current.delete(heroId); // retried the next time the enemy list changes
          setFailed(true);
          return;
        }
        setFailed(false);
        setMatchups((current) => new Map(current).set(heroId, rows));
      });
    }
  }, [key]);

  const isLoading = enemyIds.some((heroId) => !matchups.has(heroId)) && !failed;
  return { matchups, isLoading, failed };
}
