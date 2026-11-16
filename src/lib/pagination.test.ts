import { describe, expect, it } from "vitest";
import { clampPage, pageButtons, pageCount, pageItems } from "@/lib/pagination";

const items = Array.from({ length: 23 }, (_, index) => index + 1);

describe("pagination", () => {
  it("counts pages, at least one", () => {
    expect(pageCount(100, 10)).toBe(10);
    expect(pageCount(23, 10)).toBe(3);
    expect(pageCount(0, 10)).toBe(1);
  });

  it("slices a page and clamps out-of-range pages", () => {
    expect(pageItems(items, 1, 10)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(pageItems(items, 3, 10)).toEqual([21, 22, 23]);
    expect(clampPage(99, 23, 10)).toBe(3);
    expect(clampPage(0, 23, 10)).toBe(1);
  });

  it("shows first, last and neighbours with gaps", () => {
    expect(pageButtons(1, 10)).toEqual([1, 2, null, 10]);
    expect(pageButtons(5, 10)).toEqual([1, null, 4, 5, 6, null, 10]);
    expect(pageButtons(2, 3)).toEqual([1, 2, 3]);
  });
});
