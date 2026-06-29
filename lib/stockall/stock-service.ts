// ============================================================
// StockAll — Stock Data Fetching Service
// Supports Alpha Vantage (free tier) with fallback strategies.
// Features: global exchanges, rate limiting, caching, search.
// ============================================================

import type {
  StockQuote,
  StockSearchResult,
  HistoricalDataPoint,
  Timeframe,
  StockServiceConfig,
  ExchangeCode,
} from "./types";

// ---- Default configuration ----
const DEFAULT_CONFIG: StockServiceConfig = {
  cacheTTLMs: 60_000, // 1 minute
  rateLimitPerMin: 5,  // Alpha Vantage free tier: 5 calls/min
};

// ---- In-memory cache ----
interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

class MemoryCache {
  private store = new Map<string, CacheEntry<unknown>>();
  private ttl: number;

  constructor(ttlMs: number) {
    this.ttl = ttlMs;
  }

  get<T>(key: string): T | null {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }
    return entry.data as T;
  }

  set<T>(key: string, data: T): void {
    this.store.set(key, { data, expiresAt: Date.now() + this.ttl });
  }

  invalidate(key: string): void {
    this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }
}

// ---- Rate limiter ----
class RateLimiter {
  private timestamps: number[] = [];
  private maxPerMin: number;

  constructor(maxPerMin: number) {
    this.maxPerMin = maxPerMin;
  }

  /** Returns true if the call is allowed */
  tryCall(): boolean {
    const now = Date.now();
    // Remove timestamps older than 1 minute
    this.timestamps = this.timestamps.filter((t) => now - t < 60_000);
    if (this.timestamps.length >= this.maxPerMin) {
      return false;
    }
    this.timestamps.push(now);
    return true;
  }

  /** Milliseconds until next available slot */
  msUntilAvailable(): number {
    if (this.timestamps.length < this.maxPerMin) return 0;
    const oldest = this.timestamps[0];
    return Math.max(0, 60_000 - (Date.now() - oldest));
  }
}

// ---- Exchange registry ----
const EXCHANGES: Record<ExchangeCode, { suffix: string; currency: string }> = {
  US: { suffix: "", currency: "USD" },
  HK: { suffix: ".HK", currency: "HKD" },
  JP: { suffix: ".T", currency: "JPY" },
  EU: { suffix: ".PA", currency: "EUR" },   // Euronext Paris as default EU
  LSE: { suffix: ".L", currency: "GBP" },
  TSE: { suffix: ".T", currency: "JPY" },
  KR: { suffix: ".KS", currency: "KRW" },
  AU: { suffix: ".AX", currency: "AUD" },
  SG: { suffix: ".SI", currency: "SGD" },
  CN: { suffix: ".SS", currency: "CNY" },
};

// ---- Alpha Vantage API helpers ----
const ALPHA_VANTAGE_BASE = "https://www.alphavantage.co/query";

interface AlphaVantageQuote {
  "Global Quote": {
    "01. symbol": string;
    "02. open": string;
    "03. high": string;
    "04. low": string;
    "05. price": string;
    "06. volume": string;
    "07. latest trading day": string;
    "08. previous close": string;
    "09. change": string;
    "10. change percent": string;
  };
}

interface AlphaVantageSearch {
  bestMatches: Array<{
    "1. symbol": string;
    "2. name": string;
    "3. type": string;
    "4. region": string;
    "5. marketOpen": string;
    "6. marketClose": string;
    "7. timezone": string;
    "8. currency": string;
    "9. matchScore": string;
  }>;
}

interface AlphaVantageDaily {
  "Time Series (Daily)": Record<string, {
    "1. open": string;
    "2. high": string;
    "3. low": string;
    "4. close": string;
    "5. volume": string;
  }>;
}

// ---- Main StockService class ----
export class StockService {
  private cache: MemoryCache;
  private rateLimiter: RateLimiter;
  private config: StockServiceConfig;
  private apiKey: string;

  constructor(config?: Partial<StockServiceConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.cache = new MemoryCache(this.config.cacheTTLMs);
    this.rateLimiter = new RateLimiter(this.config.rateLimitPerMin);
    this.apiKey = this.config.alphaVantageApiKey || "";
  }

  /** Update the API key at runtime */
  setApiKey(key: string): void {
    this.apiKey = key;
  }

  /** Get the configured API key (for persistence) */
  getApiKey(): string {
    return this.apiKey;
  }

  /** Check if an API key is configured */
  hasApiKey(): boolean {
    return this.apiKey.length > 0;
  }

  // ----------------------------------------------------------
  // Fetch real-time quote for a single symbol
  // ----------------------------------------------------------
  async fetchQuote(symbol: string, exchange?: ExchangeCode): Promise<StockQuote> {
    const cacheKey = `quote:${symbol}:${exchange || "US"}`;
    const cached = this.cache.get<StockQuote>(cacheKey);
    if (cached) return cached;

    // Determine the full ticker symbol
    const fullSymbol = exchange && exchange !== "US"
      ? `${symbol}${EXCHANGES[exchange]?.suffix || ""}`
      : symbol;

    if (this.apiKey) {
      try {
        const data = await this.callAlphaVantage<AlphaVantageQuote>("GLOBAL_QUOTE", {
          symbol: fullSymbol,
        });

        const quote = data["Global Quote"];
        if (quote && quote["05. price"]) {
          const result: StockQuote = {
            symbol: quote["01. symbol"],
            name: quote["01. symbol"],
            exchange: exchange || "US",
            price: parseFloat(quote["05. price"]),
            change: parseFloat(quote["09. change"]),
            changePercent: parseFloat(quote["10. change percent"].replace("%", "")),
            high: parseFloat(quote["03. high"]),
            low: parseFloat(quote["04. low"]),
            open: parseFloat(quote["02. open"]),
            previousClose: parseFloat(quote["08. previous close"]),
            volume: parseInt(quote["06. volume"], 10),
            timestamp: quote["07. latest trading day"],
          };
          this.cache.set(cacheKey, result);
          return result;
        }
      } catch {
        // Fall through to mock data
      }
    }

    // Return demo/mock data when no API key or API call fails
    return this.generateMockQuote(symbol, exchange || "US");
  }

  // ----------------------------------------------------------
  // Fetch historical data
  // ----------------------------------------------------------
  async fetchHistorical(
    symbol: string,
    timeframe: Timeframe,
    exchange?: ExchangeCode,
  ): Promise<HistoricalDataPoint[]> {
    const cacheKey = `hist:${symbol}:${timeframe}:${exchange || "US"}`;
    const cached = this.cache.get<HistoricalDataPoint[]>(cacheKey);
    if (cached) return cached;

    if (this.apiKey) {
      try {
        const data = await this.callAlphaVantage<AlphaVantageDaily>("TIME_SERIES_DAILY", {
          symbol: exchange && exchange !== "US"
            ? `${symbol}${EXCHANGES[exchange]?.suffix || ""}`
            : symbol,
        });

        const series = data["Time Series (Daily)"];
        if (series) {
          const entries = Object.entries(series);
          const limit = this.getDataPointLimit(timeframe);
          const points: HistoricalDataPoint[] = entries.slice(0, limit).map(([date, vals]) => ({
            date,
            open: parseFloat(vals["1. open"]),
            high: parseFloat(vals["2. high"]),
            low: parseFloat(vals["3. low"]),
            close: parseFloat(vals["4. close"]),
            volume: parseInt(vals["5. volume"], 10),
          }));
          this.cache.set(cacheKey, points);
          return points;
        }
      } catch {
        // Fall through to mock
      }
    }

    return this.generateMockHistorical(symbol, timeframe);
  }

  // ----------------------------------------------------------
  // Search stocks by ticker or company name
  // ----------------------------------------------------------
  async search(query: string): Promise<StockSearchResult[]> {
    if (!query || query.trim().length < 1) return [];

    const cacheKey = `search:${query.toLowerCase()}`;
    const cached = this.cache.get<StockSearchResult[]>(cacheKey);
    if (cached) return cached;

    if (this.apiKey) {
      try {
        const data = await this.callAlphaVantage<AlphaVantageSearch>("SYMBOL_SEARCH", {
          keywords: query,
        });

        const matches = data.bestMatches || [];
        const results: StockSearchResult[] = matches.map((m) => ({
          symbol: m["1. symbol"],
          name: m["2. name"],
          exchange: this.mapRegionToExchange(m["4. region"]),
          type: this.mapStockType(m["3. type"]),
        }));

        this.cache.set(cacheKey, results);
        return results;
      } catch {
        // Fall through to mock
      }
    }

    return this.generateMockSearch(query);
  }

  // ----------------------------------------------------------
  // Clear caches
  // ----------------------------------------------------------
  clearCache(): void {
    this.cache.clear();
  }

  invalidateQuote(symbol: string, exchange?: ExchangeCode): void {
    this.cache.invalidate(`quote:${symbol}:${exchange || "US"}`);
  }

  /** Check if we can make an API call */
  canMakeAPICall(): boolean {
    return this.rateLimiter.tryCall();
  }

  /** Time until next API call slot */
  msUntilNextCall(): number {
    return this.rateLimiter.msUntilAvailable();
  }

  // ----------------------------------------------------------
  // Private helpers
  // ----------------------------------------------------------

  private async callAlphaVantage<T>(functionName: string, params: Record<string, string>): Promise<T> {
    if (!this.rateLimiter.tryCall()) {
      const waitMs = this.rateLimiter.msUntilAvailable();
      throw new Error(`Rate limited. Try again in ${Math.ceil(waitMs / 1000)}s`);
    }

    const url = new URL(ALPHA_VANTAGE_BASE);
    url.searchParams.set("function", functionName);
    url.searchParams.set("apikey", this.apiKey);
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value);
    }

    const response = await fetch(url.toString());
    if (!response.ok) {
      throw new Error(`Alpha Vantage API error: ${response.status} ${response.statusText}`);
    }

    const data = (await response.json()) as T;
    return data;
  }

  private getDataPointLimit(timeframe: Timeframe): number {
    switch (timeframe) {
      case "1D": return 1;
      case "1W": return 5;
      case "1M": return 22;
      case "3M": return 66;
      case "1Y": return 252;
      case "5Y": return 1260;
    }
  }

  private mapRegionToExchange(region: string): ExchangeCode {
    const upper = region.toUpperCase();
    if (upper.includes("US") || upper.includes("NASDAQ") || upper.includes("NYSE")) return "US";
    if (upper.includes("HONG") || upper.includes("HKEX")) return "HK";
    if (upper.includes("JAPAN") || upper.includes("TOKYO") || upper.includes("TSE")) return "JP";
    if (upper.includes("EURO") || upper.includes("PARIS") || upper.includes("EURONEXT")) return "EU";
    if (upper.includes("LONDON") || upper.includes("LSE")) return "LSE";
    if (upper.includes("KOREA") || upper.includes("KOSPI")) return "KR";
    if (upper.includes("AUSTRALIA") || upper.includes("ASX")) return "AU";
    if (upper.includes("SINGAPORE") || upper.includes("SGX")) return "SG";
    if (upper.includes("CHINA") || upper.includes("SHANGHAI") || upper.includes("SHENZHEN")) return "CN";
    return "US";
  }

  private mapStockType(type: string): StockSearchResult["type"] {
    const upper = type.toUpperCase();
    if (upper.includes("ETF")) return "ETF";
    if (upper.includes("INDEX")) return "Index";
    if (upper.includes("MUTUAL")) return "Mutual Fund";
    if (upper.includes("ADR")) return "ADR";
    if (upper.includes("REIT")) return "REIT";
    return "Common Stock";
  }

  // ----------------------------------------------------------
  // Mock / demo data generators for development & fallback
  // ----------------------------------------------------------

  private generateMockQuote(symbol: string, exchange: ExchangeCode): StockQuote {
    const basePrice = this.getMockBasePrice(symbol);
    const change = (Math.random() - 0.5) * basePrice * 0.04;
    return {
      symbol,
      name: symbol,
      exchange,
      price: basePrice + change,
      change,
      changePercent: (change / basePrice) * 100,
      high: basePrice * 1.02,
      low: basePrice * 0.98,
      open: basePrice,
      previousClose: basePrice,
      volume: Math.floor(Math.random() * 10_000_000) + 100_000,
      timestamp: new Date().toISOString(),
    };
  }

  private generateMockHistorical(_symbol: string, timeframe: Timeframe): HistoricalDataPoint[] {
    const count = this.getDataPointLimit(timeframe);
    const points: HistoricalDataPoint[] = [];
    let price = 100 + Math.random() * 200;
    const now = new Date();

    for (let i = count - 1; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const change = (Math.random() - 0.48) * price * 0.03;
      price = Math.max(1, price + change);
      points.push({
        date: date.toISOString().split("T")[0],
        open: price - change * 0.5,
        high: price + Math.random() * price * 0.01,
        low: price - Math.random() * price * 0.01,
        close: price,
        volume: Math.floor(Math.random() * 10_000_000) + 100_000,
      });
    }
    return points;
  }

  private generateMockSearch(query: string): StockSearchResult[] {
    const mocks: StockSearchResult[] = [
      { symbol: "AAPL", name: "Apple Inc.", exchange: "US", type: "Common Stock" },
      { symbol: "MSFT", name: "Microsoft Corporation", exchange: "US", type: "Common Stock" },
      { symbol: "GOOGL", name: "Alphabet Inc.", exchange: "US", type: "Common Stock" },
      { symbol: "AMZN", name: "Amazon.com Inc.", exchange: "US", type: "Common Stock" },
      { symbol: "0700.HK", name: "Tencent Holdings Ltd.", exchange: "HK", type: "Common Stock" },
      { symbol: "9988.HK", name: "Alibaba Group Holding Ltd.", exchange: "HK", type: "Common Stock" },
      { symbol: "7203.T", name: "Toyota Motor Corporation", exchange: "JP", type: "Common Stock" },
      { symbol: "SIE.DE", name: "Siemens AG", exchange: "EU", type: "Common Stock" },
      { symbol: "TSLA", name: "Tesla Inc.", exchange: "US", type: "Common Stock" },
      { symbol: "NVDA", name: "NVIDIA Corporation", exchange: "US", type: "Common Stock" },
      { symbol: "SPY", name: "SPDR S&P 500 ETF Trust", exchange: "US", type: "ETF" },
      { symbol: "QQQ", name: "Invesco QQQ Trust", exchange: "US", type: "ETF" },
      { symbol: "V", name: "Visa Inc.", exchange: "US", type: "Common Stock" },
      { symbol: "JPM", name: "JPMorgan Chase & Co.", exchange: "US", type: "Common Stock" },
      { symbol: "005930.KS", name: "Samsung Electronics Co., Ltd.", exchange: "KR", type: "Common Stock" },
    ];

    const lower = query.toLowerCase();
    const results = mocks.filter(
      (m) =>
        m.symbol.toLowerCase().includes(lower) ||
        m.name.toLowerCase().includes(lower),
    );
    return results.slice(0, 8);
  }

  private getMockBasePrice(symbol: string): number {
    const prices: Record<string, number> = {
      AAPL: 178, MSFT: 420, GOOGL: 175, AMZN: 185,
      TSLA: 245, NVDA: 880, META: 505, JPM: 198,
      V: 285, SPY: 525, QQQ: 445,
    };
    const upper = symbol.split(".")[0].toUpperCase();
    return prices[upper] || 50 + Math.random() * 200;
  }
}

/** Singleton instance (lazy) */
let _defaultService: StockService | null = null;

export function getStockService(config?: Partial<StockServiceConfig>): StockService {
  if (!_defaultService) {
    _defaultService = new StockService(config);
  }
  return _defaultService;
}

export function resetStockService(): void {
  _defaultService = null;
}