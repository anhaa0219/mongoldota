import type { Metadata } from "next";
import { SectionPlaceholder } from "@/components/SectionPlaceholder";
import { site } from "@/lib/site-content";

export const metadata: Metadata = {
  title: `Location · ${site.gameTitle}`,
};

export default function LocationPage() {
  return <SectionPlaceholder title="Location" />;
}
