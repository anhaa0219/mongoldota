import type { Metadata } from "next";
import { Germania_One, Jost } from "next/font/google";
import { Suspense } from "react";
import { Sidebar } from "@/components/Sidebar";
import { SteamLogin } from "@/components/SteamLogin";
import { TopNav } from "@/components/TopNav";
import { site } from "@/lib/site-content";
import "./globals.css";

const jost = Jost({
  variable: "--font-jost",
  subsets: ["latin"],
});

const displayFace = Germania_One({
  variable: "--font-display-face",
  subsets: ["latin"],
  weight: "400",
});

export const metadata: Metadata = {
  title: site.gameTitle,
  description: site.tagline,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${jost.variable} ${displayFace.variable} antialiased`}>
      <body className="min-h-dvh lg:flex lg:items-center lg:justify-center lg:px-[6.25rem] lg:py-[6.875rem]">
        {/* The rounded app frame. Page backgrounds fill it from behind. */}
        <div className="relative isolate flex min-h-dvh w-full overflow-hidden bg-ink shadow-[0_2.5rem_6rem_rgb(0_0_0/0.45)] lg:h-[calc(100dvh-13.75rem)] lg:min-h-0 lg:rounded-[3rem]">
          <Sidebar />
          <div className="relative flex min-w-0 flex-1 flex-col">
            <div className="absolute right-4 top-5 z-30 lg:right-[3rem] lg:top-[3.6rem]">
              <Suspense fallback={null}>
                <SteamLogin />
              </Suspense>
            </div>
            <Suspense fallback={<div className="h-[7.5rem]" />}>
              <TopNav />
            </Suspense>
            <main className="flex flex-1 flex-col">{children}</main>
          </div>
        </div>
      </body>
    </html>
  );
}
