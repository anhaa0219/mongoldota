/** Where to scroll the section links on phones so the active link is in view. Pure. */

/**
 * The `scrollLeft` that centres `link` in `nav`, clamped to the scrollable range.
 * Null when the row does not overflow (nothing to scroll).
 */
export function navScrollLeft(link: { offsetLeft: number; offsetWidth: number }, nav: { clientWidth: number; scrollWidth: number }): number | null {
  const maxScroll = nav.scrollWidth - nav.clientWidth;
  if (maxScroll <= 0) return null;
  const centred = link.offsetLeft + link.offsetWidth / 2 - nav.clientWidth / 2;
  return Math.min(maxScroll, Math.max(0, centred));
}
