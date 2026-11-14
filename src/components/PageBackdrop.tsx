import Image from "next/image";
import { heroRender } from "@/lib/hero-images";

/**
 * Where the hero stands. Phones: across the bottom. Desktop: the right half of the
 * frame, below the top nav (7rem), so it never sits behind the nav or the stat cards.
 */
const heroStageClass =
  "absolute bottom-0 right-0 h-[65%] w-full object-contain object-bottom opacity-85 lg:h-[calc(100%-7rem)] lg:w-[50%] lg:object-right-bottom";

/**
 * Fills the whole app frame (behind the glass sidebar and nav too).
 * Plain by default; with `heroSlug` (Stats page) the player's most played hero stands on the right.
 */
export function PageBackdrop({ heroSlug }: { heroSlug?: string }) {
  if (!heroSlug) {
    return <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 bg-ink" />;
  }

  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden bg-ink">
      <Image src={heroRender(heroSlug)} alt="" width={1440} height={1440} priority className={heroStageClass} />

      {/* Darken the left side so text stays readable */}
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgb(6_14_24/0.88)_0%,rgb(6_14_24/0.55)_40%,rgb(6_14_24/0.05)_75%)]" />
    </div>
  );
}
