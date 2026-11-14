const CDN = "https://cdn.cloudflare.steamstatic.com/apps/dota2";

/** Small landscape hero portrait (256×144). */
export function heroPortrait(slug: string) {
  return `${CDN}/images/dota_react/heroes/${slug}.png`;
}

/** Official transparent hero render (1440×1440), used as page background art. */
export function heroRender(slug: string) {
  return `${CDN}/videos/dota_react/heroes/renders/${slug}.png`;
}
