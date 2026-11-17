"use client";

import Image from "next/image";
import { useState } from "react";
import { heroArtFraming, heroArtPath } from "@/lib/hero-images";

/** The hero's painted art over the plain backdrop. Hides itself when public/heroes has no file for this hero. */
export function HeroArtImage({ heroSlug }: { heroSlug: string }) {
  const [isMissing, setIsMissing] = useState(false);
  if (isMissing) return null;

  const framing = heroArtFraming[heroSlug] ?? {};
  return (
    <>
      <Image
        src={heroArtPath(heroSlug)}
        alt=""
        fill
        priority
        sizes="100vw"
        onError={() => setIsMissing(true)}
        style={{ objectPosition: framing.focus ?? "center" }}
        className={`hero-art object-cover opacity-70 ${framing.flip ? "-scale-x-100" : ""}`}
      />
      {/* Darken the left side so text stays readable */}
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgb(6_14_24/0.92)_0%,rgb(6_14_24/0.65)_45%,rgb(6_14_24/0.1)_80%)]" />
    </>
  );
}
