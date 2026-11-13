import type { Metadata } from "next";
import { Germania_One, Jost } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { clerkAppearance } from "@/lib/clerk-appearance";
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
        <ClerkProvider appearance={clerkAppearance} signInUrl="/sign-in" signUpUrl="/sign-up" afterSignOutUrl="/sign-in">
          {children}
        </ClerkProvider>
      </body>
    </html>
  );
}
