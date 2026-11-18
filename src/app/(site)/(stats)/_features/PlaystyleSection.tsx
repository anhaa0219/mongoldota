import { PlaystylePanel } from "../_components/PlaystylePanel";
import { getPlaystyle } from "@/lib/opendota/opendota-matches";

/** Loads on its own (inside Suspense) so a slow totals request never holds back the rest of the Stats page. */
export async function PlaystyleSection({ accountId }: { accountId: string }) {
  const stats = await getPlaystyle(accountId);
  return stats ? <PlaystylePanel stats={stats} /> : null;
}
