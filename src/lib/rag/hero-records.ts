/** Hero knowledge records from OpenDota's game constants: abilities, talents, facets and Aghanim's. Pure. */

import { z } from "zod";
import type { RagRecord } from "@/types/rag";
import { clip, flat, valueText } from "./rag-text";

const HERO_PREFIX = "npc_dota_hero_";
const MAX_TEXT = 700;
/** OpenDota talent levels 1-4 are unlocked at hero levels 10, 15, 20 and 25. */
const TALENT_HERO_LEVEL = [10, 15, 20, 25];

export const heroAbilitiesSchema = z.record(
  z.string(),
  z.object({
    abilities: z.array(z.string()).default([]),
    talents: z.array(z.object({ name: z.string(), level: z.number() })).default([]),
    facets: z.array(z.object({ name: z.string(), title: z.string().optional(), description: z.string().optional(), deprecated: z.unknown().optional() })).default([]),
  }),
);

export const abilitiesSchema = z.record(
  z.string(),
  z.object({
    dname: z.string().optional(),
    desc: z.string().optional(),
    behavior: z.unknown().optional(),
    dmg_type: z.unknown().optional(),
    bkbpierce: z.unknown().optional(),
    attrib: z.array(z.object({ header: z.string().optional(), value: z.unknown(), generated: z.boolean().optional() })).optional(),
    cd: z.unknown().optional(),
    mc: z.unknown().optional(),
  }),
);

export const aghsSchema = z.array(
  z.object({
    hero_name: z.string(),
    has_scepter: z.boolean().optional(),
    scepter_desc: z.string().optional(),
    has_shard: z.boolean().optional(),
    shard_desc: z.string().optional(),
  }),
);

type RawHeroAbilities = z.infer<typeof heroAbilitiesSchema>;
type RawAbilities = z.infer<typeof abilitiesSchema>;
type RawAbility = RawAbilities[string];
type RawAghs = z.infer<typeof aghsSchema>[number];

const slugOf = (heroKey: string) => heroKey.replace(HERO_PREFIX, "");
/** Talent and facet names can carry "{s:value}" placeholders the game fills in; they read as noise. */
const noPlaceholders = (text: string) => flat(text.replace(/\{s:[^}]*\}/g, ""));

function isShownAbility(key: string, ability: RawAbility | undefined): ability is RawAbility & { dname: string } {
  if (!ability?.dname || key.startsWith("generic")) return false;
  return ![ability.behavior].flat().includes("Hidden");
}

function abilityText(heroName: string, ability: RawAbility & { dname: string }): string {
  const traits = [valueText(ability.dmg_type), ability.bkbpierce ? `pierces BKB: ${valueText(ability.bkbpierce)}` : ""].filter(Boolean);
  const values = (ability.attrib ?? [])
    .filter((attrib) => !attrib.generated && attrib.header && valueText(attrib.value))
    .map((attrib) => `${flat(attrib.header ?? "")} ${valueText(attrib.value)}`);
  const cooldown = valueText(ability.cd);
  const mana = valueText(ability.mc);
  const parts = [
    `${heroName} — ${ability.dname}${traits.length > 0 ? ` (${traits.join(", ")})` : ""}: ${flat(ability.desc ?? "")}`,
    values.join("; "),
    cooldown ? `Cooldown: ${cooldown}.` : "",
    mana ? `Mana: ${mana}.` : "",
  ];
  return clip(parts.filter(Boolean).join(" "), MAX_TEXT);
}

function talentText(heroName: string, talents: { name: string; level: number }[], abilities: RawAbilities): string | null {
  const levels = TALENT_HERO_LEVEL.map((heroLevel, index) => {
    const names = talents.filter((talent) => talent.level === index + 1).map((talent) => noPlaceholders(abilities[talent.name]?.dname ?? ""));
    const shown = names.filter(Boolean);
    return shown.length > 0 ? `level ${heroLevel}: ${shown.join(" or ")}` : "";
  }).filter(Boolean);
  return levels.length > 0 ? clip(`${heroName} talents — ${levels.join("; ")}`, MAX_TEXT) : null;
}

function aghsText(heroName: string, aghs: RawAghs): string | null {
  const parts = [
    aghs.has_scepter && aghs.scepter_desc ? `Aghanim's Scepter: ${flat(aghs.scepter_desc)}` : "",
    aghs.has_shard && aghs.shard_desc ? `Aghanim's Shard: ${flat(aghs.shard_desc)}` : "",
  ].filter(Boolean);
  return parts.length > 0 ? clip(`${heroName} — ${parts.join(" ")}`, MAX_TEXT) : null;
}

export function heroRecords(input: { heroAbilities: RawHeroAbilities; abilities: RawAbilities; aghs: RawAghs[]; heroNames: Map<string, string> }): RagRecord[] {
  const { heroAbilities, abilities, aghs, heroNames } = input;
  const records: RagRecord[] = [];

  for (const [heroKey, entry] of Object.entries(heroAbilities)) {
    const hero = slugOf(heroKey);
    const heroName = heroNames.get(hero);
    if (!heroName) continue;
    for (const key of entry.abilities) {
      const ability = abilities[key];
      if (isShownAbility(key, ability)) records.push({ id: `ability:${key}`, text: abilityText(heroName, ability), source: "ability", hero });
    }
    const talents = talentText(heroName, entry.talents, abilities);
    if (talents) records.push({ id: `talent:${hero}`, text: talents, source: "talent", hero });
    for (const facet of entry.facets) {
      if (facet.deprecated || !facet.title || !facet.description) continue;
      const text = clip(`${heroName} facet — ${noPlaceholders(facet.title)}: ${noPlaceholders(facet.description)}`, MAX_TEXT);
      records.push({ id: `facet:${hero}:${facet.name}`, text, source: "facet", hero });
    }
  }

  for (const entry of aghs) {
    const hero = slugOf(entry.hero_name);
    const heroName = heroNames.get(hero);
    const text = heroName ? aghsText(heroName, entry) : null;
    if (text) records.push({ id: `aghs:${hero}`, text, source: "aghs", hero });
  }
  return records;
}
