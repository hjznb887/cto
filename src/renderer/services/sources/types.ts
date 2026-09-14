// ============================================================
// StockAll — Data source adapter contract
//
// Every market-data backend implements this interface. The UI never
// talks to a provider directly; it goes through the active adapter.
//
// Why bother: the only realistically free sources are unofficial
// endpoints (Tencent qt.gtimg.cn, Sina hq.sinajs.cn) whose response
// formats can change without notice. Keeping every provider behind
// one interface means swapping sources is a one-file change, and a
// failure in one provider does not require touching the UI.
// ============================================================

import type { Stock, StockSearchResult, StockDetail, PricePoint } from '../../types/stock';

export type Timeframe = '1D' | '1W' | '1M' | '3M' | '1Y' | '5Y';

/** Identifies which backend produced a result — surfaced for debugging. */
export type SourceId = 'mock' | 'tencent' | 'sina' | 'finnhub';

export interface MarketDataSource {
  /** Stable identifier for this provider. */
  readonly id: SourceId;

  /** Human-readable name shown in the UI / diagnostics. */
  readonly label: string;

  /**
   * True when this source is usable in the current environment
   * (e.g. a provider requiring an API key returns false without one).
   */
  isAvailable(): boolean;

  search(query: string): Promise<StockSearchResult[]>;

  /** Returns undefined when the symbol is unknown to this provider. */
  getDetails(symbol: string): Promise<StockDetail | undefined>;

  /** Default watchlist contents for a fresh install. */
  getDefaultWatchlist(): Promise<Stock[]>;

  getHistory(symbol: string, timeframe: Timeframe): Promise<PricePoint[]>;
}

/** Number of points and sampling interval for each timeframe. */
export const TIMEFRAME_SHAPE: Record<Timeframe, { count: number; stepMs: number }> = {
  '1D': { count: 24, stepMs: 60 * 60 * 1000 },          // hourly
  '1W': { count: 7, stepMs: 24 * 60 * 60 * 1000 },
  '1M': { count: 30, stepMs: 24 * 60 * 60 * 1000 },
  '3M': { count: 90, stepMs: 24 * 60 * 60 * 1000 },
  '1Y': { count: 52, stepMs: 7 * 24 * 60 * 60 * 1000 }, // weekly
  '5Y': { count: 60, stepMs: 30 * 24 * 60 * 60 * 1000 },// monthly
};
