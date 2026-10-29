import type { Market } from "@/lib/settings";

// Search distances as the market writes them (Settings → Documents → Market).
// Sources are always asked in kilometres; only the labels change.

/** Whether a market measures distances in miles. */
export const usesMiles = (market: Market) => market === "US";

const KM_PER_MILE = 1.609344;

/**
 * A search radius as the market writes it: "25 km", or "15 mi" in the US,
 * rounded to a friendly number (10 km → 5 mi, 25 → 15, 50 → 30, 100 → 60,
 * 200 → 125).
 */
export function distanceLabel(km: number, market: Market): string {
  if (!usesMiles(market)) return `${km} km`;
  const miles = km / KM_PER_MILE;
  const step = miles < 20 ? 5 : miles < 100 ? 10 : 25;
  return `${Math.max(step, Math.round(miles / step) * step)} mi`;
}
