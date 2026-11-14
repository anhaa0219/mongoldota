import type { StaticImageData } from "next/image";
import ursaArt from "../../public/heroes/ursa.jpg";

const CDN = "https://cdn.cloudflare.steamstatic.com/apps/dota2";

/** Small landscape hero portrait (256×144). */
export function heroPortrait(slug: string) {
  return `${CDN}/images/dota_react/heroes/${slug}.png`;
}

/**
 * Painted background art for the Stats page, per hero slug (Valve's CDN has none).
 * `flip` mirrors the image so the hero sits on the right, away from the text;
 * `focus` is the CSS object-position to keep in view.
 * To add art: save the image as public/heroes/<slug>.jpg (slug as in the hero's portrait URL,
 * e.g. "antimage", "axe"), import it below and add an entry. Heroes without art get a plain background.
 */
export type HeroArt = { image: StaticImageData; flip?: boolean; focus?: string };

export const heroArt: Partial<Record<string, HeroArt>> = {
  ursa: { image: ursaArt, flip: true, focus: "40% 30%" },
};
