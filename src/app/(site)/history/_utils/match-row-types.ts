/** Everything a History row shows before it is opened. Plain data (server -> client). */
export interface MatchRowData {
  id: number;
  heroName: string;
  heroSlug: string;
  won: boolean;
  ranked: boolean;
  kills: number;
  deaths: number;
  assists: number;
  gpm: number;
  durationMinutes: number;
  ago: string;
  /** 6 entries; null is an empty slot. */
  itemImages: (string | null)[];
}
