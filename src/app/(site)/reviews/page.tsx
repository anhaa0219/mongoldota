import type { Metadata } from "next";
import { SectionPlaceholder } from "@/components/SectionPlaceholder";
import { site } from "@/lib/site-content";

export const metadata: Metadata = {
  title: `Reviews · ${site.gameTitle}`,
};

export default function ReviewsPage() {
  return <SectionPlaceholder title="Reviews" />;
}
