// ============================================================
// StockAll — Stock service façade
//
// The UI imports these functions and knows nothing about providers.
// Internally every call is routed through the active adapter from the
// registry, and a failure in a live provider degrades to the offline
// mock source instead of surfacing an error to the user.
// ============================================================

import { Stock, StockSearchResult, StockDetail, PricePoint } from '../types/stock';
import { getActiveSource, getFallbackSource } from './sources/registry';
import type { Timeframe } from './sources/types';

export type { Timeframe };

/**
 * Run a provider call, falling back to the offline source on failure.
 * A dead endpoint must never leave the UI empty or throwing.
 */
async function withFallback<T>(
  call: (source: ReturnType<typeof getActiveSource>) => Promise<T>,
  empty: T,
): Promise<T> {
  const active = getActiveSource();
  try {
    return await call(active);
  } catch (err) {
    console.warn(`[stockService] source "${active.id}" failed, using fallback`, err);
    try {
      return await call(getFallbackSource());
    } catch {
      return empty;
    }
  }
}

export const searchStocks = (query: string): Promise<StockSearchResult[]> =>
  withFallback((s) => s.search(query), []);

export const getStockDetails = (symbol: string): Promise<StockDetail | undefined> =>
  withFallback((s) => s.getDetails(symbol), undefined);

export const getWatchlistStocks = (): Promise<Stock[]> =>
  withFallback((s) => s.getDefaultWatchlist(), []);

export const getHistoricalData = (symbol: string, timeframe: Timeframe): Promise<PricePoint[]> =>
  withFallback((s) => s.getHistory(symbol, timeframe), []);
