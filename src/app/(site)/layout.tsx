import { Suspense } from "react";
import { AccountBadge } from "@/components/AccountBadge";
import { MedalBadge } from "@/components/MedalBadge";
import { RequireSignIn } from "@/components/RequireSignIn";
import { Sidebar } from "@/components/Sidebar";
import { SteamLogin } from "@/components/SteamLogin";
import { TopNav } from "@/components/TopNav";

const frameClass =
  "relative isolate flex min-h-dvh w-full overflow-hidden bg-ink shadow-[0_2.5rem_6rem_rgb(0_0_0/0.45)] lg:h-[calc(100dvh-4.5rem)] lg:min-h-0 lg:rounded-[3rem]";

/** The rounded app frame for signed-in pages. Page backgrounds fill it from behind. */
export default function SiteLayout({ children }: LayoutProps<"/">) {
  return (
    <Suspense fallback={<div className={frameClass} />}>
      <RequireSignIn>
        <div className={frameClass}>
          <Sidebar />
          <div className="relative flex min-w-0 flex-1 flex-col">
            <div className="glass-blur absolute right-4 top-5 z-30 flex items-center gap-[0.8rem] lg:right-[3rem] lg:top-[3.2rem]">
              <Suspense fallback={null}>
                <MedalBadge />
              </Suspense>
              <Suspense fallback={null}>
                <SteamLogin />
              </Suspense>
              <Suspense fallback={null}>
                <AccountBadge />
              </Suspense>
            </div>
            <Suspense fallback={<div className="h-[7.5rem]" />}>
              <TopNav />
            </Suspense>
            <main className="flex min-h-0 flex-1 flex-col">{children}</main>
          </div>
        </div>
      </RequireSignIn>
    </Suspense>
  );
}
