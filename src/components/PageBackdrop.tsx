import Image from "next/image";
import { heroAnimation, heroRender, uploadedHeroArt } from "@/lib/hero-images";
import { player } from "@/lib/player-stats";

/**
 * Where the hero stands. Phones: across the bottom. Desktop: the right half of the
 * frame, below the top nav (7rem), so it never sits behind the nav or the stat cards.
 */
const heroStageClass =
  "absolute bottom-0 right-0 h-[65%] w-full object-contain object-bottom lg:h-[calc(100%-7rem)] lg:w-[50%] lg:object-right-bottom";

/**
 * Fills the whole app frame (behind the glass sidebar and nav too).
 * Plain by default; `showHero` (Stats page) shows the player's best hero animated
 * in front of an ambient backdrop (uploaded art when present, else a glow of the render).
 */
export function PageBackdrop({ showHero = false }: { showHero?: boolean }) {
  if (!showHero) {
    return <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 bg-ink" />;
  }

  const slug = player.bestHero.slug;
  const art = uploadedHeroArt[slug];
  const render = heroRender(slug);
  const animation = heroAnimation(slug);

  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden bg-ink">
      {/* Ambient layer */}
      {art ? (
        <Image
          src={art.image}
          alt=""
          fill
          priority
          placeholder="blur"
          sizes="100vw"
          style={{ objectPosition: art.focus ?? "center" }}
          className={`object-cover opacity-45 blur-md ${art.flip ? "-scale-x-110 scale-y-110" : "scale-110"}`}
        />
      ) : (
        <Image src={render} alt="" fill priority sizes="100vw" className="scale-125 object-cover opacity-50 blur-3xl" />
      )}

      {/* Animated hero; Safari picks the .mov, other browsers skip it for the .webm */}
      <video
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        poster={render}
        className={`${heroStageClass} motion-reduce:hidden`}
      >
        <source src={animation.mov} type="video/quicktime" />
        <source src={animation.webm} type="video/webm" />
      </video>
      {/* Still render for visitors who prefer reduced motion */}
      <Image src={render} alt="" width={1440} height={1440} className={`${heroStageClass} hidden motion-reduce:block`} />

      {/* Darken the left side so text stays readable */}
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgb(6_14_24/0.88)_0%,rgb(6_14_24/0.55)_40%,rgb(6_14_24/0.05)_75%)]" />
    </div>
  );
}
