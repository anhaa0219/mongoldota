import type { Metadata } from "next";
import { SectionPlaceholder } from "@/components/SectionPlaceholder";
import { site } from "@/lib/site-content";

export const metadata: Metadata = {
  title: `Trending Heroes · ${site.gameTitle}`,
};

export default function TrendingHeroesPage() {
  return <SectionPlaceholder title="Trending Heroes" />;
}
