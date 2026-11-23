/** Small text helpers for building RAG records. Pure. */

/** One line: HTML tags and entities removed, whitespace collapsed. */
export function flat(text: string): string {
  return text
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\\"/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

/** At most `max` characters, cut at a word with "…". */
export function clip(text: string, max: number): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1).replace(/\s\S*$/, "")}…`;
}

/** A value OpenDota sends as a string, number or list of levels ("15/25/35"); "" for anything else. */
export function valueText(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number") return String(value);
  if (Array.isArray(value)) return value.map(valueText).filter(Boolean).join("/");
  return "";
}

/** Lines grouped into chunks of at most `max` characters (a longer line is clipped into its own chunk). */
export function chunkLines(lines: string[], max: number): string[] {
  const chunks: string[] = [];
  let current = "";
  for (const line of lines) {
    const next = current ? `${current}; ${line}` : line;
    if (next.length <= max) {
      current = next;
      continue;
    }
    if (current) chunks.push(current);
    current = clip(line, max);
  }
  if (current) chunks.push(current);
  return chunks;
}

/** "7_42b" -> "7.42b" */
export function patchName(patch: string): string {
  return patch.replace(/_/g, ".");
}
