import { existsSync } from "node:fs";
import path from "node:path";
import Image from "next/image";
import { heroArtFraming, heroRender, UPLOADED_HERO_ART_EXTS } from "@/lib/hero-images";
import { player } from "@/lib/player-stats";

/** Finds /public/heroes/<slug>.<ext> if you uploaded art for that hero. */
function uploadedArt(slug: string) {
  for (const ext of UPLOADED_HERO_ART_EXTS) {
    const file = `/heroes/${slug}.${ext}`;
    if (existsSync(path.join(process.cwd(), "public", file))) return file;
  }
  return null;
}

/**
 * Fills the whole app frame (behind the glass sidebar and nav too).
 * Plain by default; `showHero` (Stats page) shows the player's best hero,
 * using uploaded art when present, otherwise the official render.
 */
export function PageBackdrop({ showHero = false }: { showHero?: boolean }) {
  if (!showHero) {
    return <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 bg-ink" />;
  }

  const slug = player.bestHero.slug;
  const art = uploadedArt(slug);
  const framing = heroArtFraming[slug] ?? {};

  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden bg-ink">
      {art ? (
        <Image
          src={art}
          alt=""
          fill
          priority
          sizes="100vw"
          style={{ objectPosition: framing.focus ?? "center" }}
          className={`object-cover ${framing.flip ? "-scale-x-100" : ""}`}
        />
      ) : (
        <>
          <Image src={heroRender(slug)} alt="" fill priority sizes="100vw" className="scale-125 object-cover opacity-50 blur-3xl" />
          <Image src={heroRender(slug)} alt="" fill priority sizes="100vw" className="object-cover object-[70%_20%]" />
        </>
      )}
      {/* Darken the left side so text stays readable */}
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgb(6_14_24/0.88)_0%,rgb(6_14_24/0.55)_40%,rgb(6_14_24/0.05)_75%)]" />
    </div>
  );
}
