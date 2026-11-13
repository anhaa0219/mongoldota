import type { StaticImageData } from "next/image";
import ursaArt from "../../public/heroes/ursa.jpg";

const CDN = "https://cdn.cloudflare.steamstatic.com/apps/dota2";

/** Small landscape hero portrait (256×144). */
export function heroPortrait(slug: string) {
  return `${CDN}/images/dota_react/heroes/${slug}.png`;
}

/** Official transparent hero render, used as background when no art is uploaded. */
export function heroRender(slug: string) {
  return `${CDN}/videos/dota_react/heroes/renders/${slug}.png`;
}

/**
 * Official animated hero render (transparent background), same framing as heroRender.
 * WebM (VP9 alpha) for Chrome/Firefox, QuickTime (HEVC alpha) for Safari.
 */
export function heroAnimation(slug: string) {
  const base = `${CDN}/videos/dota_react/heroes/renders/${slug}`;
  return { webm: `${base}.webm`, mov: `${base}.mov` };
}

/**
 * Uploaded background art, per hero slug. Imported (not looked up on disk) so Next
 * fingerprints the file and a replaced image always shows up.
 * `flip` mirrors the image so the hero sits on the right, away from the text;
 * `focus` is the CSS object-position to keep in view.
 * To add art: drop the file in /public/heroes and add an entry here.
 */
export type HeroArt = { image: StaticImageData; flip?: boolean; focus?: string };

export const uploadedHeroArt: Record<string, HeroArt> = {
  ursa: { image: ursaArt, flip: true, focus: "40% 30%" },
};
