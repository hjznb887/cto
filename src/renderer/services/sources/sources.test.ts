import { describe, it, expect, beforeEach } from 'vitest';
import { MockDataSource } from './mock';
import { registerSource, resetSources, getActiveSource, getFallbackSource, listSources } from './registry';
import type { MarketDataSource } from './types';

// Freeze "now" so every assertion is reproducible.
const FIXED_NOW = () => new Date('2026-09-14T15:30:00Z');

describe('MockDataSource — determinism', () => {
  let source: MockDataSource;

  beforeEach(() => {
    source = new MockDataSource(FIXED_NOW);
  });

  it('returns the same quote for repeated calls', async () => {
    const a = await source.getDetails('AAPL');
    const b = await source.getDetails('AAPL');
    expect(a).toEqual(b);
  });

  it('returns the same price across separate instances', async () => {
    const first = await new MockDataSource(FIXED_NOW).getDetails('AAPL');
    const second = await new MockDataSource(FIXED_NOW).getDetails('AAPL');
    expect(first?.price).toBe(second?.price);
  });

  it('does not jitter — 50 calls yield one distinct price', async () => {
    const prices = await Promise.all(
      Array.from({ length: 50 }, () => source.getDetails('AAPL').then((d) => d?.price)),
    );
    expect(new Set(prices).size).toBe(1);
  });

  it('returns an identical history series on every call', async () => {
    const a = await source.getHistory('AAPL', '1M');
    const b = await source.getHistory('AAPL', '1M');
    expect(a).toEqual(b);
  });

  it('gives different symbols different data', async () => {
    const aapl = await source.getDetails('AAPL');
    const msft = await source.getDetails('MSFT');
    expect(aapl?.price).not.toBe(msft?.price);
  });

  it('changes when the day changes', async () => {
    const today = await new MockDataSource(FIXED_NOW).getDetails('AAPL');
    const tomorrow = await new MockDataSource(() => new Date('2026-09-15T15:30:00Z')).getDetails('AAPL');
    expect(today?.price).not.toBe(tomorrow?.price);
  });

  it('is case-insensitive on symbols', async () => {
    const upper = await source.getDetails('AAPL');
    const lower = await source.getDetails('aapl');
    expect(upper).toEqual(lower);
  });
});

describe('MockDataSource — data integrity', () => {
  let source: MockDataSource;

  beforeEach(() => {
    source = new MockDataSource(FIXED_NOW);
  });

  it('produces a coherent OHLC set', async () => {
    const d = await source.getDetails('AAPL');
    expect(d).toBeDefined();
    expect(d!.high).toBeGreaterThanOrEqual(Math.max(d!.open, d!.price));
    expect(d!.low).toBeLessThanOrEqual(Math.min(d!.open, d!.price));
    expect(d!.volume).toBeGreaterThan(0);
  });

  it('reports change consistent with price and previous close', async () => {
    const d = await source.getDetails('AAPL');
    expect(d!.change).toBeCloseTo(d!.price - d!.close, 2);
  });

  it('returns undefined for an unknown symbol', async () => {
    expect(await source.getDetails('ZZZZ')).toBeUndefined();
  });

  it('returns an empty history for an unknown symbol', async () => {
    expect(await source.getHistory('ZZZZ', '1M')).toEqual([]);
  });

  it('honours the timeframe point counts', async () => {
    expect((await source.getHistory('AAPL', '1W')).length).toBe(8);
    expect((await source.getHistory('AAPL', '1M')).length).toBe(31);
    expect((await source.getHistory('AAPL', '1Y')).length).toBe(53);
  });

  it('keeps every historical price positive', async () => {
    const pts = await source.getHistory('AAPL', '5Y');
    expect(pts.every((p) => p.price > 0)).toBe(true);
  });

  it('produces a watchlist of three stocks', async () => {
    const wl = await source.getDefaultWatchlist();
    expect(wl).toHaveLength(3);
    expect(wl.map((s) => s.symbol)).toEqual(['AAPL', 'GOOGL', 'MSFT']);
  });

  it('searches by symbol and by name', async () => {
    expect((await source.search('AAPL')).map((r) => r.symbol)).toContain('AAPL');
    expect((await source.search('apple')).map((r) => r.symbol)).toContain('AAPL');
  });

  it('returns nothing for an empty query', async () => {
    expect(await source.search('')).toEqual([]);
    expect(await source.search('   ')).toEqual([]);
  });

  it('always reports itself available', () => {
    expect(source.isAvailable()).toBe(true);
  });
});

describe('registry', () => {
  const fakeSource = (id: string, available: boolean): MarketDataSource => ({
    id: id as MarketDataSource['id'],
    label: `fake-${id}`,
    isAvailable: () => available,
    search: async () => [],
    getDetails: async () => undefined,
    getDefaultWatchlist: async () => [],
    getHistory: async () => [],
  });

  beforeEach(() => {
    resetSources();
  });

  it('falls back to the offline source when nothing is registered', () => {
    expect(getActiveSource().id).toBe('mock');
  });

  it('selects the first available source', () => {
    registerSource(fakeSource('finnhub', true));
    expect(getActiveSource().id).toBe('finnhub');
  });

  it('skips unavailable sources', () => {
    registerSource(fakeSource('finnhub', false));
    registerSource(fakeSource('tencent', true));
    expect(getActiveSource().id).toBe('tencent');
  });

  it('prefers a priority registration', () => {
    registerSource(fakeSource('finnhub', true));
    registerSource(fakeSource('tencent', true), { priority: true });
    expect(getActiveSource().id).toBe('tencent');
  });

  it('falls back when every registered source is unavailable', () => {
    registerSource(fakeSource('finnhub', false));
    registerSource(fakeSource('tencent', false));
    expect(getActiveSource().id).toBe('mock');
  });

  it('replaces a source registered twice', () => {
    registerSource(fakeSource('finnhub', false));
    registerSource(fakeSource('finnhub', true));
    expect(listSources().filter((s) => s.id === 'finnhub')).toHaveLength(1);
    expect(getActiveSource().id).toBe('finnhub');
  });

  it('always exposes an offline fallback', () => {
    expect(getFallbackSource().isAvailable()).toBe(true);
  });
});
