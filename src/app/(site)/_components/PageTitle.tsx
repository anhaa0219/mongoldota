"use client";

import { useWords } from "@/lib/i18n/use-words";
import type { NavId } from "@/types/game";

/**
 * A page's big metal title, named like its nav link. A client component so pages can show it outside
 * their Suspense boundaries: the words come from the layout's provider, never from cookies in the page.
 */
export function PageTitle({ id }: { id: NavId }) {
  const words = useWords();
  return <h1 className="title-metal font-display text-[3.5rem] uppercase leading-none lg:text-[5rem]">{words.shell.nav[id]}</h1>;
}
