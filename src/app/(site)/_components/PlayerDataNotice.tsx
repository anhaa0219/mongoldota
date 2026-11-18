import { SteamIcon } from "./SteamIcon";
import { getWords } from "@/lib/i18n/server";

export type NoticeReason = "not-linked" | "no-matches" | "error";


/** Shown instead of player data (Stats, History) when there is nothing to show. */
export async function PlayerDataNotice({ reason }: { reason: NoticeReason }) {
  const { shell } = await getWords();
  const messages: Record<NoticeReason, string> = { "not-linked": shell.notice.notLinked, "no-matches": shell.notice.noMatches, error: shell.notice.error };
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-[1.6rem] px-5 py-24 text-center">
      <p className="max-w-[40rem] text-[1.5rem] leading-relaxed text-white/80">{messages[reason]}</p>
      {reason === "not-linked" && (
        <a
          href="/api/auth/steam"
          className="glass-panel flex h-[3.8rem] items-center gap-[0.8rem] rounded-full pl-[0.45rem] pr-[1.4rem] transition-colors hover:border-[#66c0f4]/50 hover:bg-[#1b2838]/80"
        >
          <span className="grid size-[2.9rem] place-items-center rounded-full bg-[linear-gradient(135deg,#1b2838,#2a475e)] ring-1 ring-white/15">
            <SteamIcon className="size-[1.7rem] text-white" />
          </span>
          <span className="text-[1.1rem] font-medium text-white">{shell.linkSteam}</span>
        </a>
      )}
    </div>
  );
}
