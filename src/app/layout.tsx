import type { Metadata } from "next";
import { Germania_One, Jost, Montserrat, Oswald } from "next/font/google";
import { PointerGlow } from "./_components/PointerGlow";
import { site } from "@/lib/site-content";
import "./globals.css";

const jost = Jost({
  variable: "--font-jost",
  subsets: ["latin"],
});

/** Mongolian needs Cyrillic with Ө and Ү (cyrillic-ext), which Jost and Germania One lack. Loaded only where used. */
const mongolianBody = Montserrat({ variable: "--font-montserrat", subsets: ["latin", "cyrillic", "cyrillic-ext"], preload: false });
const mongolianDisplay = Oswald({ variable: "--font-oswald", subsets: ["latin", "cyrillic", "cyrillic-ext"], preload: false });

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
    <html lang="en" className={`${jost.variable} ${displayFace.variable} ${mongolianBody.variable} ${mongolianDisplay.variable} antialiased`}>
      <body className="min-h-dvh lg:flex lg:items-center lg:justify-center lg:px-[2.5rem] lg:py-[2.25rem]">
        {/* Clerk is provided by the (site) and (auth) layouts, in the visitor's language. */}
        {children}
        <PointerGlow />
      </body>
    </html>
  );
}
