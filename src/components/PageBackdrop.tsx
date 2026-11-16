import { HeroArtImage } from "@/components/HeroArtImage";

/**
 * Fills the whole app frame (behind the glass sidebar and nav too).
 * Plain by default; with `heroSlug` (Stats page) the hero's painted art from public/heroes fills the frame,
 * or it stays plain when there is no image for that hero.
 */
export function PageBackdrop({ heroSlug }: { heroSlug?: string }) {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden bg-ink">
      {heroSlug && <HeroArtImage key={heroSlug} heroSlug={heroSlug} />}
    </div>
  );
}
