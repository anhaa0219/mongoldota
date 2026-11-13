export interface NavItem {
  label: string;
  href: string;
}

export interface GameLocation {
  regionId: string;
  name: string;
  type: string;
  country: string;
  region: string;
  position: string;
}

export interface MapRegion {
  id: string;
  path: string;
  labelX: number;
  labelY: number;
  markerX: number;
  markerY: number;
}

export interface CharacterStat {
  label: string;
  value: number;
  max: number;
}

export type Side = "radiant" | "dire";

export type PortraitShape = "bust" | "hood";

export interface GameCharacter {
  id: string;
  shortName: string;
  fullName: string;
  /** Dota position 1–5 (1 = carry … 5 = hard support). */
  position?: 1 | 2 | 3 | 4 | 5;
  role?: string;
  side?: Side;
  /** Laning strength 0–100, used by the lane winner calculator. */
  laning?: number;
  /** Short laning tips shown in the card. */
  laningTips: string[];
  stats: CharacterStat[];
  /** Path under /public or an allowed remote URL. Leave empty to show the placeholder. */
  portrait?: string;
  placeholderShape: PortraitShape;
  placeholderTint: string;
}
