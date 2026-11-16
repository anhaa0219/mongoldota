import { Suspense } from "react";
import { ChartColumn, Map, Swords } from "lucide-react";
import { site } from "@/lib/site-content";

/** Official dota2.com homepage montage, streamed from Valve's CDN (no extension). */
const LIVE_WALLPAPER = "https://cdn.cloudflare.steamstatic.com/apps/dota2/videos/dota_react/homepage/dota_montage_02";

const features = [
  { icon: ChartColumn, text: "Your stats from every match" },
  { icon: Swords, text: "Hero picks that fit your role" },
  { icon: Map, text: "Lane predictions before the horn" },
];

/**
 * Full-width sign-in / sign-up screen: welcome copy on the left, Clerk card on the right,
 * over the live Dota wallpaper (desktop). On phones it stacks.
 */
export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative isolate flex min-h-dvh w-full overflow-hidden bg-ink lg:h-[calc(100dvh-4.5rem)] lg:min-h-0 lg:rounded-[3rem] lg:shadow-[0_2.5rem_6rem_rgb(0_0_0/0.45)]">
      {/* Live wallpaper; skipped when the visitor prefers reduced motion */}
      <video
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        aria-hidden="true"
        className="absolute inset-0 -z-10 size-full object-cover motion-reduce:hidden"
      >
        <source src={`${LIVE_WALLPAPER}.webm`} type="video/webm" />
        <source src={`${LIVE_WALLPAPER}.mp4`} type="video/mp4" />
      </video>
      {/* Dark on both sides so copy and card read; lighter in the middle */}
      <div className="absolute inset-0 -z-10 bg-ink/75 lg:bg-transparent lg:bg-[linear-gradient(90deg,rgb(6_14_24/0.94)_0%,rgb(6_14_24/0.72)_30%,rgb(6_14_24/0.3)_50%,rgb(6_14_24/0.72)_70%,rgb(6_14_24/0.94)_100%)]" />

      <div className="flex w-full flex-col items-center justify-center gap-10 px-4 py-12 sm:px-8 lg:flex-row lg:justify-between lg:gap-12 lg:px-[6rem] lg:py-[4rem]">
        <section className="flex w-full max-w-[42rem] flex-col items-center text-center lg:items-start lg:text-left">
          <p className="font-display text-[1.8rem] uppercase tracking-[0.08em] text-accent lg:text-[2.4rem]">
            Welcome to
          </p>
          <h1 className="title-metal font-display text-[4.5rem] uppercase leading-[0.9] tracking-[0.02em] lg:text-[8rem]">
            {site.gameTitle}
          </h1>
          <p className="mt-6 max-w-[34rem] text-[1.35rem] leading-relaxed text-white/75 lg:text-[1.5rem]">
            {site.tagline}
          </p>

          <ul className="mt-10 hidden flex-col gap-5 lg:flex">
            {features.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-4 text-[1.4rem] text-white/85">
                <span className="glass-panel grid size-[3.4rem] place-items-center rounded-full">
                  <Icon className="size-[1.6rem] stroke-[1.75] text-accent" aria-hidden="true" />
                </span>
                {text}
              </li>
            ))}
          </ul>
        </section>

        {/* Clerk's forms read the URL, which must sit inside Suspense with cacheComponents */}
        <div className="w-full max-w-[46rem] shrink-0">
          <Suspense fallback={null}>{children}</Suspense>
        </div>
      </div>
    </div>
  );
}
