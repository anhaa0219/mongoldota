import { Suspense, type ReactNode } from "react";
import { LanguageProviders } from "@/components/LanguageProviders";
import { getLanguage } from "@/lib/i18n/server";
import { AccountBadge } from "./_components/AccountBadge";
import { Logo } from "./_components/Logo";
import { MedalBadge } from "./_components/MedalBadge";
import { MoreMenu } from "./_components/MoreMenu";
import { RequireSignIn } from "./_components/RequireSignIn";
import { Sidebar } from "./_components/Sidebar";
import { SteamLogin } from "./_components/SteamLogin";
import { TopNav } from "./_components/TopNav";

const frameClass =
  "relative isolate flex min-h-dvh w-full overflow-hidden bg-ink shadow-[0_2.5rem_6rem_rgb(0_0_0/0.45)] lg:h-[calc(100dvh-4.5rem)] lg:min-h-0 lg:rounded-[3rem]";

/** The frame in the visitor's language: Clerk and words for every client component inside, and the Mongolian fonts when needed. */
async function LanguageFrame({ children }: { children: ReactNode }) {
  const language = await getLanguage();
  return (
    <LanguageProviders language={language}>
      <div className={frameClass} data-lang={language}>
        {children}
      </div>
    </LanguageProviders>
  );
}

/** The rounded app frame for signed-in pages. Page backgrounds fill it from behind. */
export default function SiteLayout({ children }: LayoutProps<"/">) {
  return (
    <Suspense fallback={<div className={frameClass} />}>
      <RequireSignIn>
        <LanguageFrame>
          <Sidebar />
          <div className="relative flex min-w-0 flex-1 flex-col">
            {/* Phones: row 1 = logo + pills. From md up this wrapper disappears (contents) and the pills float top-right as before. */}
            <div className="flex items-center justify-between gap-[0.8rem] px-5 pt-5 md:contents">
              <div className="shrink-0 md:hidden">
                <Logo className="size-[3.8rem]" />
              </div>
              <div className="glass-blur relative z-30 flex items-center gap-[0.6rem] md:absolute md:right-4 md:top-5 md:gap-[0.8rem] lg:right-[3rem] lg:top-[3.2rem]">
                <Suspense fallback={null}>
                  <MedalBadge />
                </Suspense>
                <Suspense fallback={null}>
                  <SteamLogin />
                </Suspense>
                <Suspense fallback={null}>
                  <AccountBadge />
                </Suspense>
                <MoreMenu />
              </div>
            </div>
            <Suspense fallback={<div className="h-[7.5rem]" />}>
              <TopNav />
            </Suspense>
            <main className="flex min-h-0 flex-1 flex-col">{children}</main>
          </div>
        </LanguageFrame>
      </RequireSignIn>
    </Suspense>
  );
}
