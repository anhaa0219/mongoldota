import type { Metadata } from "next";
import { SectionPlaceholder } from "@/components/SectionPlaceholder";
import { site } from "@/lib/site-content";

export const metadata: Metadata = {
  title: `Let’s play · ${site.gameTitle}`,
};

export default function PlayPage() {
  return <SectionPlaceholder title="Let’s play" />;
}
