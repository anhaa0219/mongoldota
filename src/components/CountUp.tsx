import type { CSSProperties } from "react";

/**
 * A whole number that counts up from zero when it appears. Pure CSS (see .count-up in globals.css):
 * no JavaScript runs, and the real text stays in the page for screen readers.
 */
export function CountUp({ value, suffix = "" }: { value: number; suffix?: string }) {
  const whole = Math.round(value);
  return (
    <>
      <span className="sr-only">{`${whole}${suffix}`}</span>
      <span aria-hidden="true" className="count-up" data-suffix={suffix} style={{ "--count": whole } as CSSProperties} />
    </>
  );
}
