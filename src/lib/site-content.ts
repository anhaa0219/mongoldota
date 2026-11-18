import type { NavItem } from "@/types/game";

/** The site name and section routes. Visible wording lives in src/lib/i18n; `tagline` here is the English page description. */
export const site = {
  logoText: "MD",
  gameTitle: "MongolDota",
  tagline: "Dota 2 match analysis: your stats, hero picks and lane predictions.",
};

export const navItems: NavItem[] = [
  { id: "stats", href: "/" },
  { id: "draft", href: "/draft" },
  { id: "live", href: "/live" },
  { id: "heroes", href: "/heroes" },
  { id: "history", href: "/history" },
];
