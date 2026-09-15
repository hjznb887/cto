// ============================================================
// StockAll — Data source registry
//
// Holds the ordered list of available providers and picks the active
// one. The first source whose `isAvailable()` returns true wins, with
// the deterministic mock source always registered last as the safety
// net, so the app never ends up with nothing to display.
//
// Adding a provider (Tencent, Sina, Finnhub, ...) is a one-line
// registration here — no UI changes required.
// ============================================================

import type { MarketDataSource, SourceId } from './types';
import { MockDataSource } from './mock';
import { TencentDataSource } from './tencent';

const registry: MarketDataSource[] = [];

/** 回退源：永远存在、永远可用。 */
const fallback = new MockDataSource();

/**
 * 默认注册的实时数据源。
 * 按优先级排列——腾讯在最前，离线 demo 源只作兜底
 * （由 getActiveSource 在没有可用实时源时选用）。
 */
registerSource(new TencentDataSource());

export function registerSource(source: MarketDataSource, options: { priority?: boolean } = {}): void {
  const existing = registry.findIndex((s) => s.id === source.id);
  if (existing !== -1) registry.splice(existing, 1);
  if (options.priority) {
    registry.unshift(source);
  } else {
    registry.push(source);
  }
}

export function unregisterSource(id: SourceId): void {
  const i = registry.findIndex((s) => s.id === id);
  if (i !== -1) registry.splice(i, 1);
}

/** All registered sources, in resolution order. */
export function listSources(): MarketDataSource[] {
  return [...registry];
}

/** The active source: first available provider, else the offline fallback. */
export function getActiveSource(): MarketDataSource {
  return registry.find((s) => s.isAvailable()) ?? fallback;
}

/** Always-available offline source. Useful for tests and error paths. */
export function getFallbackSource(): MarketDataSource {
  return fallback;
}

/** Test helper: clear everything except the built-in fallback. */
export function resetSources(): void {
  registry.length = 0;
}
