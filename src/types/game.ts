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

export type Side = "radiant" | "dire";
