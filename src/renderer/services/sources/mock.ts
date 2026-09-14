// ============================================================
// StockAll — Mock data source (deterministic)
//
// Serves realistic-looking data with no network access and no API key.
// All randomness is seeded, so values are stable across renders and
// restarts: the watchlist no longer jitters and the chart no longer
// reshapes itself on every repaint.
//
// This is also the fallback when a live provider fails, so the app
// stays usable offline.
// ============================================================

import type { Stock, StockSearchResult, StockDetail, PricePoint } from '../../types/stock';
import type { MarketDataSource, Timeframe } from './types';
import { TIMEFRAME_SHAPE } from './types';
import { seededSigned, seededRange, todayKey, hashString } from '../random';

interface SeedStock {
  symbol: string;
  name: string;
  exchange: string;
  price: number;
  marketCap: number;
  sector: string;
  description: string;
}

const SEED_STOCKS: SeedStock[] = [
  {
    symbol: 'AAPL', name: 'Apple Inc.', exchange: 'NASDAQ', price: 175.50,
    marketCap: 2800000000000, sector: 'Technology',
    description: 'Apple Inc. designs, manufactures, and markets smartphones, personal computers, tablets, wearables, and accessories worldwide.',
  },
  {
    symbol: 'GOOGL', name: 'Alphabet Inc.', exchange: 'NASDAQ', price: 140.20,
    marketCap: 1750000000000, sector: 'Communication Services',
    description: 'Alphabet Inc. offers various products and platforms in the United States, Europe, the Middle East, Africa, the Asia-Pacific, Canada, and Latin America.',
  },
  {
    symbol: 'MSFT', name: 'Microsoft Corporation', exchange: 'NASDAQ', price: 330.10,
    marketCap: 2450000000000, sector: 'Technology',
    description: 'Microsoft Corporation develops, licenses, and supports software, services, devices, and solutions worldwide.',
  },
  {
    symbol: 'AMZN', name: 'Amazon.com Inc.', exchange: 'NASDAQ', price: 130.45,
    marketCap: 1350000000000, sector: 'Consumer Cyclical',
    description: 'Amazon.com, Inc. engages in the retail sale of consumer products and subscriptions in North America and internationally.',
  },
  {
    symbol: 'TSLA', name: 'Tesla Inc.', exchange: 'NASDAQ', price: 240.50,
    marketCap: 760000000000, sector: 'Consumer Cyclical',
    description: 'Tesla, Inc. designs, develops, manufactures, leases, and sells electric vehicles, and energy generation and storage systems in the United States, China, and internationally.',
  },
];

/** Simulated network latency, kept short so the UI is not sluggish in tests. */
const LATENCY_MS = 120;

function delay(ms = LATENCY_MS): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Build a full detail record for a seed stock on a given day.
 * Deterministic: identical inputs always produce identical output.
 */
function buildDetail(seed: SeedStock, day: string): StockDetail {
  const key = `${seed.symbol}:${day}`;
  const changePercent = seededRange(`${key}:pct`, -2.5, 2.5);
  const price = round2(seed.price * (1 + changePercent / 100));
  const previousClose = round2(seed.price);
  const change = round2(price - previousClose);

  const open = round2(previousClose * (1 + seededRange(`${key}:open`, -0.008, 0.008)));
  const high = round2(Math.max(price, open) * (1 + seededRange(`${key}:high`, 0, 0.012)));
  const low = round2(Math.min(price, open) * (1 - seededRange(`${key}:low`, 0, 0.012)));
  const volume = Math.round(seed.price * seededRange(`${key}:vol`, 100000, 400000));

  return {
    symbol: seed.symbol,
    name: seed.name,
    price,
    change,
    changePercent: round2(changePercent),
    exchange: seed.exchange,
    open,
    close: previousClose,
    high,
    low,
    volume,
    marketCap: seed.marketCap,
    sector: seed.sector,
    description: seed.description,
  };
}

/**
 * Random-walk series anchored to the symbol's reference price.
 * The walk is seeded per symbol+timeframe, so the same chart is
 * produced on every call.
 */
function buildHistory(seed: SeedStock, timeframe: Timeframe, now: Date): PricePoint[] {
  const { count, stepMs } = TIMEFRAME_SHAPE[timeframe];
  const key = `${seed.symbol}:${timeframe}`;
  const points: PricePoint[] = [];

  let price = seed.price * (1 + seededSigned(`${key}:start`) * 0.05);

  for (let i = count; i >= 0; i--) {
    const t = new Date(now.getTime() - i * stepMs);
    const step = seededSigned(`${key}:${i}`);
    // +/-0.9% per step keeps the series plausible without wild swings.
    price = price * (1 + step * 0.009);

    points.push({
      time: timeframe === '1D'
        ? t.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        : t.toLocaleDateString(),
      price: round2(price),
    });
  }

  return points;
}

export class MockDataSource implements MarketDataSource {
  readonly id = 'mock' as const;
  readonly label = 'Demo data (offline)';

  private now: () => Date;

  constructor(now: () => Date = () => new Date()) {
    this.now = now;
  }

  isAvailable(): boolean {
    return true;
  }

  async search(query: string): Promise<StockSearchResult[]> {
    await delay();
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return SEED_STOCKS
      .filter((s) => s.symbol.toLowerCase().includes(q) || s.name.toLowerCase().includes(q))
      .map(({ symbol, name, exchange }) => ({ symbol, name, exchange }));
  }

  async getDetails(symbol: string): Promise<StockDetail | undefined> {
    await delay();
    const seed = SEED_STOCKS.find((s) => s.symbol.toUpperCase() === symbol.toUpperCase());
    if (!seed) return undefined;
    return buildDetail(seed, todayKey(this.now()));
  }

  async getDefaultWatchlist(): Promise<Stock[]> {
    await delay();
    const day = todayKey(this.now());
    return SEED_STOCKS.slice(0, 3).map((seed) => {
      const d = buildDetail(seed, day);
      return {
        symbol: d.symbol,
        name: d.name,
        price: d.price,
        change: d.change,
        changePercent: d.changePercent,
        exchange: d.exchange,
      };
    });
  }

  async getHistory(symbol: string, timeframe: Timeframe): Promise<PricePoint[]> {
    await delay();
    const seed = SEED_STOCKS.find((s) => s.symbol.toUpperCase() === symbol.toUpperCase());
    if (!seed) return [];
    return buildHistory(seed, timeframe, this.now());
  }

  /** Exposed for tests: stable per-symbol demo entities. */
  static readonly symbols = SEED_STOCKS.map((s) => s.symbol);

  /** Exposed for tests: a deterministic digest of the seed table. */
  static seedDigest(): number {
    return hashString(SEED_STOCKS.map((s) => `${s.symbol}:${s.price}`).join('|'));
  }
}
