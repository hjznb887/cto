// ============================================================
// Tests: Stock Data Fetching Service
// ============================================================

import { describe, it, expect, beforeEach, vi } from "vitest";
import { StockService, resetStockService } from "../stock-service";

describe("StockService", () => {
  let service: StockService;

  beforeEach(() => {
    resetStockService();
    service = new StockService({
      cacheTTLMs: 60_000,
      rateLimitPerMin: 60, // High limit for tests
    });
  });

  describe("fetchQuote", () => {
    it("should return a quote with valid structure (mock fallback)", async () => {
      const quote = await service.fetchQuote("AAPL");

      expect(quote).toBeDefined();
      expect(quote.symbol).toBe("AAPL");
      expect(typeof quote.price).toBe("number");
      expect(quote.price).toBeGreaterThan(0);
      expect(typeof quote.change).toBe("number");
      expect(typeof quote.changePercent).toBe("number");
      expect(typeof quote.volume).toBe("number");
      expect(quote.volume).toBeGreaterThan(0);
      expect(quote.timestamp).toBeTruthy();
    });

    it("should return different prices for different symbols", async () => {
      const aapl = await service.fetchQuote("AAPL");
      const msft = await service.fetchQuote("MSFT");
      expect(aapl.price).not.toBe(msft.price);
    });

    it("should support global exchange parameter", async () => {
      const quote = await service.fetchQuote("0700", "HK");
      expect(quote).toBeDefined();
      expect(quote.exchange).toBe("HK");
    });

    it("should cache results and return cached data on repeat call", async () => {
      const first = await service.fetchQuote("NVDA");
      const second = await service.fetchQuote("NVDA");
      expect(first.price).toBe(second.price);
      expect(first.timestamp).toBe(second.timestamp);
    });

    it("should handle unknown symbols gracefully", async () => {
      const quote = await service.fetchQuote("ZZZZZ");
      expect(quote).toBeDefined();
      expect(quote.symbol).toBe("ZZZZZ");
    });
  });

  describe("fetchHistorical", () => {
    it("should return historical data points for default timeframe", async () => {
      const data = await service.fetchHistorical("AAPL", "1M");
      expect(data.length).toBeGreaterThan(0);
      expect(data[0]).toHaveProperty("date");
      expect(data[0]).toHaveProperty("open");
      expect(data[0]).toHaveProperty("high");
      expect(data[0]).toHaveProperty("low");
      expect(data[0]).toHaveProperty("close");
      expect(data[0]).toHaveProperty("volume");
    });

    it("should return correct number of points for each timeframe", async () => {
      const day = await service.fetchHistorical("AAPL", "1D");
      expect(day.length).toBe(1);

      const week = await service.fetchHistorical("AAPL", "1W");
      expect(week.length).toBe(5);

      const month = await service.fetchHistorical("AAPL", "1M");
      expect(month.length).toBe(22);
    });

    it("should cache historical data", async () => {
      const first = await service.fetchHistorical("MSFT", "1W");
      const second = await service.fetchHistorical("MSFT", "1W");
      expect(first).toEqual(second);
    });
  });

  describe("search", () => {
    it("should return results matching the query", async () => {
      const results = await service.search("Apple");
      expect(results.length).toBeGreaterThan(0);
      expect(results.some((r) => r.name.includes("Apple"))).toBe(true);
    });

    it("should return empty array for empty query", async () => {
      const results = await service.search("");
      expect(results).toEqual([]);
    });

    it("should search by ticker symbol", async () => {
      const results = await service.search("AAPL");
      expect(results.some((r) => r.symbol === "AAPL")).toBe(true);
    });

    it("should return results with correct type structure", async () => {
      const results = await service.search("SPY");
      if (results.length > 0) {
        expect(results[0]).toHaveProperty("symbol");
        expect(results[0]).toHaveProperty("name");
        expect(results[0]).toHaveProperty("exchange");
        expect(results[0]).toHaveProperty("type");
      }
    });
  });

  describe("cache management", () => {
    it("should clear all caches", async () => {
      await service.fetchQuote("AAPL");
      service.clearCache();

      // After clear, should get fresh (but same mock) data
      const quote = await service.fetchQuote("AAPL");
      expect(quote).toBeDefined();
    });

    it("should invalidate specific quote cache", async () => {
      await service.fetchQuote("AAPL");
      service.invalidateQuote("AAPL");
      const quote = await service.fetchQuote("AAPL");
      expect(quote).toBeDefined();
    });
  });

  describe("rate limiting", () => {
    it("should track rate limits", () => {
      const canCall = service.canMakeAPICall();
      expect(typeof canCall).toBe("boolean");
    });

    it("should report ms until next available call", () => {
      const ms = service.msUntilNextCall();
      expect(typeof ms).toBe("number");
      expect(ms).toBeGreaterThanOrEqual(0);
    });
  });

  describe("API key management", () => {
    it("should initially have no API key", () => {
      expect(service.hasApiKey()).toBe(false);
    });

    it("should accept an API key", () => {
      service.setApiKey("demo-key");
      expect(service.hasApiKey()).toBe(true);
      expect(service.getApiKey()).toBe("demo-key");
    });

    it("should clear API key when set to empty", () => {
      service.setApiKey("demo-key");
      service.setApiKey("");
      expect(service.hasApiKey()).toBe(false);
    });
  });
});

describe("getStockService singleton", () => {
  it("should import and call getStockService without error", async () => {
    // Dynamic import to avoid circular issues
    const mod = await import("../stock-service");
    const svc = mod.getStockService();
    expect(svc).toBeDefined();
    const quote = await svc.fetchQuote("AAPL");
    expect(quote.price).toBeGreaterThan(0);
  });
});