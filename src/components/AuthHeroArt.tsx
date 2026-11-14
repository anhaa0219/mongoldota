import Image from "next/image";
import { heroRender } from "@/lib/hero-images";
import { getLinkedAccountId } from "@/lib/linked-account";
import { getHeroIndex } from "@/lib/opendota-heroes";
import { getRecentMatches } from "@/lib/opendota-matches";
import { summarize } from "@/lib/player-summary";

/**
 * Sign-in screen art: the visitor's most played hero, when a Steam cookie remains from an
 * earlier visit. Stands in the gap between the copy and the Clerk card (desktop), low behind
 * the copy (phones). Renders nothing without a cookie, matches, or a known hero. Reads cookies.
 */
export async function AuthHeroArt() {
  const accountId = await getLinkedAccountId();
  if (!accountId) return null;

  const [matches, heroes] = await Promise.all([getRecentMatches(accountId), getHeroIndex()]);
  const slug = matches ? summarize(matches, heroes)?.mostPlayed.hero.slug : undefined;
  if (!slug) return null;

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-[70%] lg:inset-x-auto lg:left-1/2 lg:h-full lg:w-[42%] lg:-translate-x-1/2"
    >
      <Image
        src={heroRender(slug)}
        alt=""
        fill
        priority
        sizes="(min-width: 1024px) 42vw, 100vw"
        className="object-contain object-bottom opacity-40 lg:opacity-90"
      />
    </div>
  );
}
