/** Item and patch-note knowledge records from OpenDota's game constants. Pure. */

import { z } from "zod";
import type { RagRecord } from "@/types/rag";
import { chunkLines, clip, flat, patchName, valueText } from "./rag-text";

const MAX_TEXT = 700;
const PATCH_CHUNK = 600;

export const itemsSchema = z.record(
  z.string(),
  z.object({
    dname: z.string().optional(),
    cost: z.number().nullable().optional(),
    abilities: z.array(z.object({ type: z.string().optional(), title: z.string().optional(), description: z.string().optional() })).optional(),
    attrib: z.array(z.object({ display: z.string().optional(), value: z.unknown() })).optional(),
    cd: z.unknown().optional(),
    mc: z.unknown().optional(),
    components: z.array(z.string()).nullable().optional(),
    notes: z.string().optional(),
  }),
);

export const patchNotesSchema = z.record(
  z.string(),
  z.object({
    general: z.unknown().optional(),
    items: z.record(z.string(), z.unknown()).optional(),
    heroes: z.record(z.string(), z.unknown()).optional(),
  }),
);

type RawItems = z.infer<typeof itemsSchema>;
type RawItem = RawItems[string];
type RawPatchNotes = z.infer<typeof patchNotesSchema>;

function itemText(item: RawItem & { dname: string }, itemNames: Map<string, string>): string {
  const cost = item.cost ? ` (${item.cost} gold)` : "";
  const actives = (item.abilities ?? []).map((ability) => `${ability.title ?? ""}${ability.type ? ` (${ability.type})` : ""}: ${flat(ability.description ?? "")}`);
  const stats = (item.attrib ?? []).flatMap((attrib) => (attrib.display ? [flat(attrib.display.replace("{value}", valueText(attrib.value)))] : []));
  const parts = [
    `${item.dname}${cost}:`,
    actives.join(" "),
    stats.join(", "),
    valueText(item.cd) ? `Cooldown: ${valueText(item.cd)}.` : "",
    valueText(item.mc) ? `Mana: ${valueText(item.mc)}.` : "",
    item.components?.length ? `Built from: ${item.components.map((key) => itemNames.get(key) ?? key).join(", ")}.` : "",
    item.notes ? flat(item.notes) : "",
  ];
  return clip(parts.filter(Boolean).join(" "), MAX_TEXT);
}

export function itemNamesOf(items: RawItems): Map<string, string> {
  return new Map(Object.entries(items).flatMap(([key, item]) => (item.dname ? [[key, item.dname] as const] : [])));
}

export function itemRecords(items: RawItems): RagRecord[] {
  const names = itemNamesOf(items);
  return Object.entries(items).flatMap(([key, item]) => {
    if (!item.dname || key.startsWith("recipe_")) return [];
    return [{ id: `item:${key}`, text: itemText({ ...item, dname: item.dname }, names), source: "item" as const, item: key }];
  });
}

/** Every non-empty line in a patch entry, whatever its nesting (lists, or lists per ability). */
function patchLines(value: unknown): string[] {
  if (typeof value === "string") {
    const line = flat(value);
    return line ? [line] : [];
  }
  if (Array.isArray(value)) return value.flatMap(patchLines);
  if (value && typeof value === "object") return Object.values(value).flatMap(patchLines);
  return [];
}

/** The newest patch (e.g. "7_42") and its letter patches ("7_42b", ...). */
export function currentPatches(patchNotes: RawPatchNotes): string[] {
  const keys = Object.keys(patchNotes);
  const newest = keys.map((key) => key.replace(/[a-z]+$/, "")).sort((a, b) => b.localeCompare(a, undefined, { numeric: true }))[0];
  return newest ? keys.filter((key) => key.replace(/[a-z]+$/, "") === newest).sort() : [];
}

function chunkRecords(base: Omit<RagRecord, "id" | "text">, idPrefix: string, title: string, lines: string[]): RagRecord[] {
  return chunkLines(lines, PATCH_CHUNK - title.length).map((chunk, index) => ({ ...base, id: `${idPrefix}:${index}`, text: `${title} ${chunk}` }));
}

export function patchRecords(patchNotes: RawPatchNotes, patches: string[], heroNames: Map<string, string>, itemNames: Map<string, string>): RagRecord[] {
  return patches.flatMap((patch) => {
    const notes = patchNotes[patch];
    if (!notes) return [];
    const label = `Patch ${patchName(patch)}`;
    const general = [patchLines(notes.general)];
    const heroes = Object.entries(notes.heroes ?? {}).flatMap(([hero, value]) => {
      const heroName = heroNames.get(hero);
      if (!heroName) {
        general.push(patchLines(value));
        return [];
      }
      return chunkRecords({ source: "patch", hero, patch }, `patch:${patch}:${hero}`, `${label} — ${heroName}:`, patchLines(value));
    });
    const items = Object.entries(notes.items ?? {}).flatMap(([item, value]) => {
      const itemName = itemNames.get(item);
      if (!itemName) {
        general.push(patchLines(value));
        return [];
      }
      return chunkRecords({ source: "patch", item, patch }, `patch:${patch}:${item}`, `${label} — ${itemName}:`, patchLines(value));
    });
    const rules = chunkRecords({ source: "general", patch }, `general:${patch}`, `${label} — general changes:`, general.flat());
    return [...heroes, ...items, ...rules];
  });
}
