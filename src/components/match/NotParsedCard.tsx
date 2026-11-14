"use client";

import { useRouter } from "next/navigation";
import { AnalyseMatch } from "@/components/AnalyseMatch";

/** Shown in every tab of an unparsed match: ask OpenDota to analyse it, then reload the page. */
export function NotParsedCard({ matchId }: { matchId: number }) {
  const router = useRouter();
  return (
    <div className="glass-panel rounded-[1.6rem] p-[1.4rem]">
      <AnalyseMatch matchId={matchId} onCheckAgain={() => router.refresh()} />
    </div>
  );
}
