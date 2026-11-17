import { HeroArtImage } from "@/components/HeroArtImage";

/** The colour of the two soft glows behind a page. */
export type BackdropTone = "ember" | "duel" | "live" | "steel";

const toneClass: Record<BackdropTone, string> = {
  ember: "",
  duel: "ambient-duel",
  live: "ambient-live",
  steel: "ambient-steel",
};

/**
 * Fills the whole app frame (behind the glass sidebar and nav too).
 * Without `heroSlug`: soft glows in the page's `tone` over a faint dot grid.
 * With `heroSlug` (Stats page): the hero's painted art from public/heroes, or nothing extra when there is no image for that hero.
 */
export function PageBackdrop({ heroSlug, tone = "ember" }: { heroSlug?: string; tone?: BackdropTone }) {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden bg-ink">
      {heroSlug ? (
        <HeroArtImage key={heroSlug} heroSlug={heroSlug} />
      ) : (
        <div className={`ambient absolute inset-0 ${toneClass[tone]}`}>
          <div className="ambient-grid absolute inset-0" />
        </div>
      )}
    </div>
  );
}
