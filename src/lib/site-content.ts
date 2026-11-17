import type { NavItem } from "@/types/game";

/** All the words on the site live here. Change them freely. */
export const site = {
  logoText: "MD",
  gameTitle: "MongolDota",
  tagline: "Dota 2 match analysis: your stats, hero picks and lane predictions.",
};

export const navItems: NavItem[] = [
  { label: "Stats", href: "/" },
  { label: "Draft", href: "/draft" },
  { label: "Live Coach", href: "/live" },
  { label: "Trending Heroes", href: "/heroes" },
  { label: "History", href: "/history" },
];
