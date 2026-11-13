/** Mock player profile. Replace with real data from the player's matches. */

export interface MatchRecord {
  label: string;
  value: string;
  hero: { slug: string; name: string };
}

export const player = {
  bestHero: { slug: "ursa", name: "Ursa", matches: 37, winRate: 64.9 },
  role: { position: 1, name: "Carry", share: 62 },
  last100: {
    wins: 57,
    losses: 43,
    /** Most recent first. */
    recent: ["W", "W", "L", "W", "W", "W", "L", "L", "W", "W"] as ("W" | "L")[],
  },
  records: [
    { label: "Most net worth", value: "41,280", hero: { slug: "ursa", name: "Ursa" } },
    { label: "Most kills", value: "27", hero: { slug: "ursa", name: "Ursa" } },
    { label: "Most deaths", value: "16", hero: { slug: "antimage", name: "Anti-Mage" } },
    { label: "Most assists", value: "34", hero: { slug: "earthshaker", name: "Earthshaker" } },
  ] satisfies MatchRecord[],
  averages: [
    { label: "Kills", value: "9.4" },
    { label: "Deaths", value: "5.1" },
    { label: "Assists", value: "8.2" },
    { label: "GPM", value: "612" },
    { label: "XPM", value: "688" },
    { label: "Last hits", value: "287" },
  ],
};
