/** Splitting a list into pages. Pages are numbered from 1. Pure. */

export function pageCount(total: number, pageSize: number): number {
  return Math.max(1, Math.ceil(total / pageSize));
}

/** Keeps a page number inside 1..pageCount. */
export function clampPage(page: number, total: number, pageSize: number): number {
  return Math.min(Math.max(1, Math.floor(page)), pageCount(total, pageSize));
}

export function pageItems<T>(items: T[], page: number, pageSize: number): T[] {
  const start = (clampPage(page, items.length, pageSize) - 1) * pageSize;
  return items.slice(start, start + pageSize);
}

/** Page buttons to show: first, last, and the current page's neighbours, with null for a "…" gap. */
export function pageButtons(page: number, pages: number): (number | null)[] {
  const wanted = new Set([1, pages, page - 1, page, page + 1].filter((entry) => entry >= 1 && entry <= pages));
  const sorted = [...wanted].sort((a, b) => a - b);
  return sorted.flatMap((entry, index) => (index > 0 && entry - sorted[index - 1] > 1 ? [null, entry] : [entry]));
}
