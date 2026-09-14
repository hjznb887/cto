import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  loadWatchlist,
  saveWatchlist,
  clearWatchlistStorage,
  loadAlerts,
  saveAlerts,
} from './persistence';
import type { Stock } from '../types/stock';

const sample: Stock[] = [
  { symbol: 'AAPL', name: 'Apple Inc.', price: 175.5, change: 1.2, changePercent: 0.69, exchange: 'NASDAQ' },
  { symbol: 'MSFT', name: 'Microsoft', price: 330.1, change: 2.1, changePercent: 0.64, exchange: 'NASDAQ' },
];

describe('watchlist persistence', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns an empty list when nothing has been saved', () => {
    expect(loadWatchlist()).toEqual([]);
  });

  it('round-trips a watchlist through storage', () => {
    saveWatchlist(sample);
    // loadWatchlist strips the internal `order` field, so callers get
    // exactly the Stock shape they handed in.
    expect(loadWatchlist()).toEqual(sample);
  });

  it('preserves insertion order', () => {
    saveWatchlist(sample);
    const loaded = loadWatchlist();
    expect(loaded.map((s) => s.symbol)).toEqual(['AAPL', 'MSFT']);
  });

  it('clears stored data', () => {
    saveWatchlist(sample);
    clearWatchlistStorage();
    expect(loadWatchlist()).toEqual([]);
  });

  it('survives a corrupt payload instead of throwing', () => {
    localStorage.setItem('stockall_watchlist', '{not valid json');
    expect(() => loadWatchlist()).not.toThrow();
    expect(loadWatchlist()).toEqual([]);
  });

  it('ignores a non-array payload', () => {
    localStorage.setItem('stockall_watchlist', JSON.stringify({ oops: true }));
    expect(loadWatchlist()).toEqual([]);
  });

  it('does not throw when storage rejects writes (quota exceeded)', () => {
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });
    expect(() => saveWatchlist(sample)).not.toThrow();
    spy.mockRestore();
  });
});

describe('alert persistence', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns an empty list when nothing has been saved', () => {
    expect(loadAlerts()).toEqual([]);
  });

  it('round-trips alerts through storage', () => {
    const alerts = [{ id: 'a1', symbol: 'AAPL', active: true }];
    saveAlerts(alerts);
    expect(loadAlerts()).toEqual(alerts);
  });

  it('survives a corrupt payload', () => {
    localStorage.setItem('stockall_alerts', '[[[');
    expect(loadAlerts()).toEqual([]);
  });
});
