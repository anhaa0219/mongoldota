import type { Metadata } from "next";
import { Suspense } from "react";
import { DraftBoard } from "@/components/draft/DraftBoard";
import { PageBackdrop } from "@/components/PageBackdrop";
import { getLinkedAccountId } from "@/lib/linked-account";
import { getPersonalRecords } from "@/lib/opendota-draft";
import { getDraftHeroes } from "@/lib/opendota-heroes";
import { site } from "@/lib/site-content";

export const metadata: Metadata = {
  title: `Draft · ${site.gameTitle}`,
};

/** Loads the heroes and (when Steam is linked) the player's own record per hero. Reads cookies. */
async function DraftLoader() {
  const [heroes, accountId] = await Promise.all([getDraftHeroes(), getLinkedAccountId()]);
  if (heroes.length === 0) {
    return <p className="relative z-20 m-auto text-[1.4rem] text-white/80">Could not load the hero list from OpenDota. Try again in a minute.</p>;
  }
  const personal = accountId ? await getPersonalRecords(accountId) : {};
  return <DraftBoard heroes={heroes} personal={personal} />;
}

/** Draft helper: pick both teams by clicking or from a screenshot; counter picks update as enemies are added. */
export default function DraftPage() {
  return (
    <>
      <PageBackdrop tone="duel" />
      <div className="page-enter relative flex w-full flex-1 flex-col px-[1.3rem] pb-12 md:px-8 lg:min-h-0 lg:px-[5rem] lg:pb-[2.4rem]">
        <Suspense fallback={<div className="glass-panel shimmer z-20 h-[12rem] rounded-[1.4rem]" />}>
          <DraftLoader />
        </Suspense>
      </div>
    </>
  );
}
