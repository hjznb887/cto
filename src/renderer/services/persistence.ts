// ============================================================
// StockAll — Browser-persisted store
// Wraps the in-memory store with localStorage persistence so the
// watchlist survives a reload. In Electron the renderer is a
// browser context, so localStorage is available and stable
// across restarts (it lives in the app's user-data dir).
// ============================================================

import type { Stock } from '../types/stock';

const STORAGE_KEY = 'stockall_watchlist';
const ALERTS_KEY = 'stockall_alerts';

/** Shape stored on disk — mirrors the UI's Stock plus an insertion order. */
interface StoredStock extends Stock {
  order: number;
}

function readJson<T>(key: string, fallback: T): T {
  if (typeof localStorage === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    // Corrupt payload: fall back rather than crash the app.
    return fallback;
  }
}

function writeJson(key: string, value: unknown): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Quota or private-mode failure: persistence degrades silently,
    // the in-memory state is still correct.
  }
}

// ---- Watchlist ----

/**
 * Load the saved watchlist.
 * Returns plain `Stock` objects — the internal `order` field is used only
 * for sequencing and stripped on the way out, so callers get exactly the
 * type they expect.
 */
export function loadWatchlist(): Stock[] {
  const stored = readJson<StoredStock[]>(STORAGE_KEY, []);
  if (!Array.isArray(stored)) return [];
  return [...stored]
    .sort((a, b) => a.order - b.order)
    .map((item): Stock => ({
      symbol: item.symbol,
      name: item.name,
      price: item.price,
      change: item.change,
      changePercent: item.changePercent,
      exchange: item.exchange,
    }));
}

export function saveWatchlist(stocks: Stock[]): void {
  const ordered: StoredStock[] = stocks.map((s, i) => ({ ...s, order: i }));
  writeJson(STORAGE_KEY, ordered);
}

export function clearWatchlistStorage(): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.removeItem(STORAGE_KEY);
}

// ---- Alerts ----

export function loadAlerts<T>(): T[] {
  const stored = readJson<T[]>(ALERTS_KEY, []);
  return Array.isArray(stored) ? stored : [];
}

export function saveAlerts<T>(alerts: T[]): void {
  writeJson(ALERTS_KEY, alerts);
}
