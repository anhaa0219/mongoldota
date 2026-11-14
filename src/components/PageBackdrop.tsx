import Image from "next/image";
import { heroArt } from "@/lib/hero-images";

/**
 * Fills the whole app frame (behind the glass sidebar and nav too).
 * Plain by default; with `heroSlug` (Stats page) the hero's painted art fills the frame
 * when the project has art for that hero (see heroArt), otherwise it stays plain.
 */
export function PageBackdrop({ heroSlug }: { heroSlug?: string }) {
  const art = heroSlug ? heroArt[heroSlug] : undefined;
  if (!art) {
    return <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 bg-ink" />;
  }

  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden bg-ink">
      <Image
        src={art.image}
        alt=""
        fill
        priority
        placeholder="blur"
        sizes="100vw"
        style={{ objectPosition: art.focus ?? "center" }}
        className={`object-cover opacity-70 ${art.flip ? "-scale-x-100" : ""}`}
      />
      {/* Darken the left side so text stays readable */}
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgb(6_14_24/0.92)_0%,rgb(6_14_24/0.65)_45%,rgb(6_14_24/0.1)_80%)]" />
    </div>
  );
}
