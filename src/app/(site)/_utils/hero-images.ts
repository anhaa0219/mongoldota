const CDN = "https://cdn.cloudflare.steamstatic.com/apps/dota2";

/** Small landscape hero portrait (256×144). */
export function heroPortrait(slug: string) {
  return `${CDN}/images/dota_react/heroes/${slug}.png`;
}

/**
 * Painted background art for the Stats page (Valve's CDN has none): public/heroes/<slug>.jpg.
 * The slug is the one in the hero's portrait URL, e.g. "puck", "antimage", "nevermore" (Shadow Fiend).
 * Heroes without a file get a plain background.
 */
export function heroArtPath(slug: string) {
  return `/heroes/${slug}.jpg`;
}

/**
 * Optional framing per hero. `flip` mirrors the image so the hero sits on the right, away from the
 * text; `focus` is the CSS object-position to keep in view. Heroes not listed are centred, unflipped.
 */
export type HeroArtFraming = { flip?: boolean; focus?: string };

export const heroArtFraming: Partial<Record<string, HeroArtFraming>> = {
  ursa: { flip: true, focus: "40% 30%" },
};
