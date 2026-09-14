// ============================================================
// StockAll — Deterministic pseudo-random source
//
// Why this exists: `Math.random()` produced a different price on every
// call, so the UI jittered on each render and the historical chart
// changed shape every time the window repainted.
//
// This module derives values from a stable seed instead (symbol + date),
// so the same input always yields the same output — across renders,
// reloads and app restarts. Values still look natural, they are just
// reproducible.
// ============================================================

/** FNV-1a style string hash. Fast, stable, no dependencies. */
export function hashString(input: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/**
 * Deterministic float in [0, 1) derived from a seed string.
 * Two calls with the same seed always return the same value.
 */
export function seededUnit(seed: string): number {
  const h = hashString(seed);
  // Mix the bits so nearby seeds do not produce near-identical output.
  let x = h ^ (h >>> 15);
  x = Math.imul(x, 0x2545f491);
  x ^= x >>> 13;
  return (x >>> 0) / 0x100000000;
}

/** Deterministic float in [min, max). */
export function seededRange(seed: string, min: number, max: number): number {
  return min + seededUnit(seed) * (max - min);
}

/** Deterministic integer in [min, max]. */
export function seededInt(seed: string, min: number, max: number): number {
  return Math.floor(seededRange(seed, min, max + 1));
}

/**
 * Deterministic value in [-1, 1] — used to build a random-walk series
 * that looks like price action but never changes between runs.
 */
export function seededSigned(seed: string): number {
  return seededUnit(seed) * 2 - 1;
}

/** Today's date as YYYY-MM-DD, used to bucket daily values. */
export function todayKey(date: Date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

/**
 * Stable price for a symbol on a given day.
 * Same symbol + same day => same base price.
 */
export function seededBasePrice(symbol: string, fallback: number, day: string = todayKey()): number {
  const drift = seededSigned(`base:${symbol}:${day}`);
  // Keep the day-to-day move within +/-1.5% of the reference price.
  return fallback * (1 + drift * 0.015);
}
