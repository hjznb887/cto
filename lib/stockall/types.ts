// ============================================================
// StockAll — Shared TypeScript Types
// ============================================================

/** Supported stock exchanges */
export type ExchangeCode = "US" | "HK" | "JP" | "EU" | "LSE" | "TSE" | "KR" | "AU" | "SG" | "CN";

/** Exchange metadata */
export interface ExchangeInfo {
  code: ExchangeCode;
  name: string;
  country: string;
  currency: string;
  suffix?: string; // e.g. ".T" for Tokyo, ".HK" for Hong Kong
}

/** Stock quote (real-time / latest) */
export interface StockQuote {
  symbol: string;
  name: string;
  exchange: ExchangeCode;
  price: number;
  change: number;
  changePercent: number;
  high: number;
  low: number;
  open: number;
  previousClose: number;
  volume: number;
  timestamp: string; // ISO-8601
}

/** Historical data point */
export interface HistoricalDataPoint {
  date: string; // YYYY-MM-DD
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

/** Timeframe for historical data */
export type Timeframe = "1D" | "1W" | "1M" | "3M" | "1Y" | "5Y";

/** Search result */
export interface StockSearchResult {
  symbol: string;
  name: string;
  exchange: ExchangeCode;
  type: "Common Stock" | "ETF" | "Index" | "Mutual Fund" | "ADR" | "REIT";
}

/** Stock service configuration */
export interface StockServiceConfig {
  alphaVantageApiKey?: string;
  cacheTTLMs: number; // time-to-live for in-memory cache in ms
  rateLimitPerMin: number;
}

/** Alert condition types */
export type AlertConditionType = "GREATER_THAN" | "LESS_THAN" | "CROSSES_ABOVE" | "CROSSES_BELOW" | "PERCENT_CHANGE";

/** Alert configuration */
export interface AlertConfig {
  id: string;
  symbol: string;
  conditionType: AlertConditionType;
  threshold: number;
  label?: string;
  enabled: boolean;
  createdAt: string;
  lastTriggeredAt?: string;
}

/** Watchlist item */
export interface WatchlistItem {
  id: string;
  symbol: string;
  name: string;
  exchange: ExchangeCode;
  addedAt: string;
  order: number;
}

/** User preferences */
export interface UserPreferences {
  theme: "light" | "dark" | "system";
  defaultTimeframe: Timeframe;
  apiKey?: string;
  notificationsEnabled: boolean;
  quietHoursStart?: string; // HH:mm
  quietHoursEnd?: string;   // HH:mm
  refreshIntervalMs: number;
}