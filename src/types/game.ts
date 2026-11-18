export type NavId = "stats" | "draft" | "live" | "heroes" | "history";

/** A section link; its label is `words.shell.nav[id]`. */
export interface NavItem {
  id: NavId;
  href: string;
}

export type Side = "radiant" | "dire";
