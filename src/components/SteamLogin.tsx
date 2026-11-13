import Image from "next/image";
import { cookies } from "next/headers";
import { getSteamProfile, readSession, SESSION_COOKIE } from "@/lib/steam-auth";

function SteamIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <circle cx="16" cy="16" r="15" fill="currentColor" />
      <circle cx="21" cy="11.5" r="4.6" fill="none" stroke="#171a21" strokeWidth="2" />
      <circle cx="21" cy="11.5" r="2" fill="#171a21" />
      <circle cx="11.5" cy="20.5" r="3.4" fill="#171a21" />
      <path d="M17.6 14.6 L12.6 19.2" stroke="#171a21" strokeWidth="2.6" strokeLinecap="round" />
      <path d="M1.5 17 L9.3 20.2" stroke="#171a21" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}

/** Top-right corner: "Sign in through Steam", or the linked account once signed in. */
export async function SteamLogin() {
  const steamId = readSession((await cookies()).get(SESSION_COOKIE)?.value);

  if (!steamId) {
    return (
      <a
        href="/api/auth/steam"
        className="glass-panel flex items-center gap-[0.7rem] rounded-full py-[0.5rem] pl-[0.6rem] pr-[1.2rem] text-[1.15rem] font-medium text-white transition-colors hover:border-white/30 hover:bg-[#171a21]/80"
      >
        <SteamIcon className="size-[2rem] text-white" />
        <span>
          <span className="hidden sm:inline">Sign in through </span>Steam
        </span>
      </a>
    );
  }

  const profile = await getSteamProfile(steamId);

  return (
    <div className="glass-panel flex items-center gap-[0.8rem] rounded-full py-[0.4rem] pl-[0.4rem] pr-[0.6rem]">
      <a
        href={profile.profileUrl}
        target="_blank"
        rel="noreferrer"
        className="flex items-center gap-[0.7rem] text-[1.1rem] font-medium hover:text-accent"
        title="Open Steam profile"
      >
        {profile.avatar ? (
          <Image src={profile.avatar} alt="" width={64} height={64} className="size-[2.4rem] rounded-full" />
        ) : (
          <SteamIcon className="size-[2.4rem] text-white" />
        )}
        <span className="flex flex-col leading-tight">
          <span className="max-w-[10rem] truncate">{profile.name}</span>
          <span className="text-[0.85rem] text-radiant">Steam linked</span>
        </span>
      </a>
      <form action="/api/auth/steam/logout" method="post">
        <button
          type="submit"
          className="rounded-full px-[0.8rem] py-[0.3rem] text-[0.95rem] text-white/60 transition-colors hover:bg-white/10 hover:text-white"
        >
          Sign out
        </button>
      </form>
    </div>
  );
}
