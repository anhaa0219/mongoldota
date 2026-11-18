import Image from "next/image";
import { getLinkedAccountId } from "@/lib/steam/linked-account";
import { getPlayerRank, type PlayerRank } from "@/lib/opendota/opendota";
import { getWords } from "@/lib/i18n/server";

const RANK_ICONS = "https://www.opendota.com/assets/images/dota2/rank_icons";

function medalLabel(rank: PlayerRank) {
  if (rank.leaderboardRank) return `${rank.medal} #${rank.leaderboardRank.toLocaleString("en-US")}`;
  return rank.stars ? `${rank.medal} ★${rank.stars}` : rank.medal;
}

/** Top-right: the linked player's medal and OpenDota's MMR estimate. Hidden until Steam is linked and calibrated. */
export async function MedalBadge() {
  const accountId = await getLinkedAccountId();
  if (!accountId) return null;

  const rank = await getPlayerRank(accountId);
  if (!rank) return null;

  const label = medalLabel(rank);
  const words = await getWords();

  return (
    <div
      title={words.shell.medalTitle}
      className="glass-panel flex h-[3.8rem] items-center gap-[0.8rem] rounded-full px-[0.45rem] sm:pr-[1.4rem]"
    >
      <span className="relative size-[2.9rem] shrink-0">
        <Image unoptimized src={`${RANK_ICONS}/rank_icon_${rank.medalTier}.png`} alt={label} fill sizes="3rem" className="object-contain" />
        {rank.stars > 0 && (
          <Image unoptimized src={`${RANK_ICONS}/rank_star_${rank.stars}.png`} alt="" fill sizes="3rem" className="object-contain" />
        )}
      </span>
      <span className="hidden flex-col leading-tight sm:flex">
        <span className="text-[1.1rem] font-medium text-white">{label}</span>
        {rank.estimatedMmr ? (
          <span className="text-[0.85rem] text-white/55">~{rank.estimatedMmr.toLocaleString("en-US")} MMR</span>
        ) : null}
      </span>
    </div>
  );
}
