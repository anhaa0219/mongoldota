/** SVG line paths on a shared value scale (match page charts). Pure. */

export interface ValueRange {
  min: number;
  max: number;
}

const round = (value: number) => Math.round(value * 10) / 10;

/** The range covering every series, always including 0 (charts keep a zero line). */
export function valueRange(series: number[][]): ValueRange {
  const values = series.flat();
  return { min: Math.min(0, ...values), max: Math.max(0, ...values) };
}

/**
 * Open SVG polyline for `values` on `range`. `points` is the x-axis length (defaults to this series'
 * length) so shorter series line up with longer ones. "" when there is nothing to draw.
 */
export function linePath(values: number[], width: number, height: number, range: ValueRange, points = values.length): string {
  const span = range.max - range.min;
  if (values.length < 2 || points < 2 || span <= 0) return "";
  return values
    .map((value, index) => {
      const x = round((index / (points - 1)) * width);
      const y = round(height - ((value - range.min) / span) * height);
      return `${index === 0 ? "M" : "L"}${x},${y}`;
    })
    .join(" ");
}
