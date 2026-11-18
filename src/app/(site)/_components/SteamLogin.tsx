import Image from "next/image";
import { Unlink } from "lucide-react";
import { SteamIcon } from "./SteamIcon";
import { getLinkedSteamId } from "@/lib/steam/linked-account";
import { getSteamProfile } from "@/lib/steam/steam-auth";
import { getWords } from "@/lib/i18n/server";

const pillClass = "glass-panel flex h-[3.8rem] items-center gap-[0.8rem] rounded-full pl-[0.45rem]";

/** Top-right: a "Link Steam" button, or the linked Steam account once connected. */
export async function SteamLogin() {
  const [steamId, words] = await Promise.all([getLinkedSteamId(), getWords()]);

  if (!steamId) {
    return (
      <a
        href="/api/auth/steam"
        aria-label={words.shell.linkSteam}
        title={words.shell.linkSteam}
        className={`${pillClass} group pr-[0.45rem] transition-colors hover:border-[#66c0f4]/50 hover:bg-[#1b2838]/80 md:pr-[1.4rem]`}
      >
        <span className="grid size-[2.9rem] place-items-center rounded-full bg-[linear-gradient(135deg,#1b2838,#2a475e)] ring-1 ring-white/15 transition-shadow group-hover:ring-[#66c0f4]/60">
          <SteamIcon className="size-[1.7rem] text-white" />
        </span>
        {/* Phones: a round icon pill; the words come back from md up */}
        <span className="hidden flex-col text-left leading-tight md:flex">
          <span className="text-[1.1rem] font-medium text-white">{words.shell.linkSteam}</span>
          <span className="hidden text-[0.85rem] text-white/55 sm:block">{words.shell.syncStats}</span>
        </span>
      </a>
    );
  }

  const profile = await getSteamProfile(steamId);

  return (
    <div className={`${pillClass} pr-[0.45rem]`}>
      <a
        href={profile.profileUrl}
        target="_blank"
        rel="noreferrer"
        title={words.shell.openSteamProfile}
        className="group flex items-center gap-[0.8rem]"
      >
        <span className="relative">
          {profile.avatar ? (
            <Image unoptimized src={profile.avatar} alt="" width={64} height={64} className="size-[2.9rem] rounded-full ring-1 ring-white/20" />
          ) : (
            <span className="grid size-[2.9rem] place-items-center rounded-full bg-[#1b2838]">
              <SteamIcon className="size-[1.7rem] text-white" />
            </span>
          )}
          <span className="absolute -bottom-[0.15rem] -right-[0.15rem] grid size-[1.25rem] place-items-center rounded-full bg-[#1b2838] ring-2 ring-ink">
            <SteamIcon className="size-[0.8rem] text-[#66c0f4]" />
          </span>
        </span>
        <span className="hidden flex-col leading-tight md:flex">
          <span className="max-w-[10rem] truncate text-[1.1rem] font-medium text-white group-hover:text-accent">{profile.name}</span>
          <span className="hidden items-center gap-[0.35rem] text-[0.85rem] text-radiant sm:flex">
            <span className="size-[0.45rem] rounded-full bg-radiant" />
            {words.shell.steamLinked}
          </span>
        </span>
      </a>
      <form action="/api/auth/steam/logout" method="post">
        <button
          type="submit"
          aria-label={words.shell.unlinkSteam}
          title={words.shell.unlinkSteam}
          className="grid size-[2.6rem] place-items-center rounded-full text-white/50 transition-colors hover:bg-white/10 hover:text-white"
        >
          <Unlink className="size-[1.2rem]" />
        </button>
      </form>
    </div>
  );
}
