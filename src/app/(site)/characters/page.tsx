import type { Metadata } from "next";
import { CharacterRoster } from "@/components/CharacterRoster";
import { PageBackdrop } from "@/components/PageBackdrop";
import { site } from "@/lib/site-content";

export const metadata: Metadata = {
  title: `Hero Pick · ${site.gameTitle}`,
};

export default function HeroPickPage() {
  return (
    <>
      <PageBackdrop />
      <div className="relative mx-auto w-full max-w-[103.125rem] flex-1 px-5 py-8 md:px-8 lg:p-0">
        <CharacterRoster />
      </div>
    </>
  );
}
