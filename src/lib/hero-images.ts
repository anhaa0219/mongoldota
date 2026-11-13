const CDN = "https://cdn.cloudflare.steamstatic.com/apps/dota2";

/** Small landscape hero portrait (256×144). */
export function heroPortrait(slug: string) {
  return `${CDN}/images/dota_react/heroes/${slug}.png`;
}

/** Official transparent hero render, used as background when no art is uploaded. */
export function heroRender(slug: string) {
  return `${CDN}/videos/dota_react/heroes/renders/${slug}.png`;
}

/** File types checked, in order, for uploaded art in /public/heroes/<slug>.<ext>. */
export const UPLOADED_HERO_ART_EXTS = ["jpg", "jpeg", "png", "webp"] as const;

/**
 * Per-hero framing for uploaded art. `flip` mirrors the image so the hero sits on
 * the right, away from the text; `focus` is the CSS object-position to keep in view.
 */
export const heroArtFraming: Record<string, { flip?: boolean; focus?: string }> = {
  ursa: { flip: true, focus: "0% 30%" },
};
