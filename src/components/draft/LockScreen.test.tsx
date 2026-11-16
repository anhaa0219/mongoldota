import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { LockScreen } from "@/components/draft/LockScreen";
import type { DraftHero } from "@/types/draft";

const hero = (id: number, name: string, roles: string[]): DraftHero => ({ id, name, slug: name.toLowerCase(), winRate: 50, roles });
const viper = hero(47, "Viper", ["Carry", "Durable", "Initiator", "Disabler"]);
const sf = hero(11, "Shadow Fiend", ["Carry", "Nuker"]);
const axe = hero(2, "Axe", ["Initiator", "Durable"]);
const heroById = new Map([viper, sf, axe].map((entry) => [entry.id, entry]));
const draft = { radiant: [47, null, null, null, null], dire: [11, 2, null, null, null] };

describe("LockScreen", () => {
  it("guesses positions and shows the lane: an off laner faces the enemy safe lane", () => {
    const noop = () => undefined;
    const html = renderToStaticMarkup(<LockScreen draft={draft} heroById={heroById} mySide="radiant" onSideChange={noop} onUnlock={noop} />);
    // Viper alone on the team is chosen automatically and guessed pos 3; SF guessed pos 1, Axe pos 3.
    expect(html).toContain("Off lane");
    const lane = html.slice(html.indexOf('aria-label="Your lane"'), html.indexOf('aria-label="Enemy team"'));
    expect(lane).toContain("Shadow Fiend");
    expect(lane).not.toContain(">Axe<");
    expect(html).toContain("Get advice");
  });
});
