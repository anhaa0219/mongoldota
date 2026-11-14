import type { GameLocation, NavItem } from "@/types/game";

/**
 * All the words on the site live here. Change them freely.
 * Images: put files in /public/images and set the path (leave empty for placeholders).
 */
export const site = {
  logoText: "MD",
  gameTitle: "MongolDota",
  tagline: "Dota 2 match analysis: your stats, hero picks and lane predictions.",
};

export const navItems: NavItem[] = [
  { label: "Stats", href: "/" },
  { label: "Hero Pick", href: "/characters" },
  { label: "Location", href: "/location" },
  { label: "Trending Heroes", href: "/heroes" },
  { label: "History", href: "/history" },
];

export const locations: GameLocation[] = [
  {
    regionId: "M3",
    name: "Old Mill",
    type: "Abandoned village",
    country: "Northreach",
    region: "Ashen Vale",
    position: "North of the Ashen Vale",
  },
  {
    regionId: "M2",
    name: "Stone Ford",
    type: "River crossing",
    country: "Northreach",
    region: "Ashen Vale",
    position: "East of the Old Mill",
  },
  {
    regionId: "M5",
    name: "Crow Hill",
    type: "Watchtower ruins",
    country: "Northreach",
    region: "High Moor",
    position: "Top of the northern ridge",
  },
  {
    regionId: "M8",
    name: "Marrow Fen",
    type: "Swamp",
    country: "Dunmark",
    region: "Grey Marshes",
    position: "Edge of the eastern marsh",
  },
  {
    regionId: "M9",
    name: "Kingsroad Inn",
    type: "Tavern",
    country: "Dunmark",
    region: "Middle Lands",
    position: "Crossroads of the old trade road",
  },
  {
    regionId: "M4",
    name: "Hollow Wood",
    type: "Haunted forest",
    country: "Northreach",
    region: "Ashen Vale",
    position: "South of the Old Mill",
  },
  {
    regionId: "M10",
    name: "Saltgate",
    type: "Port town",
    country: "Westerhold",
    region: "Coastline",
    position: "Mouth of the Silver River",
  },
  {
    regionId: "M11",
    name: "Ember Keep",
    type: "Castle",
    country: "Westerhold",
    region: "Red Plains",
    position: "Centre of the Red Plains",
  },
  {
    regionId: "M12",
    name: "Frostpeak",
    type: "Mountain pass",
    country: "Dunmark",
    region: "Iron Teeth",
    position: "Far south-east border",
  },
];
