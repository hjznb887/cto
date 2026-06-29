// ============================================================
// Tests: SQLite / In-Memory Persistence Layer
// ============================================================

import { describe, it, expect, beforeEach } from "vitest";
import { InMemoryStore } from "../persistence";
import type { AlertConfig } from "../types";

describe("InMemoryStore", () => {
  let store: InMemoryStore;

  beforeEach(() => {
    store = new InMemoryStore();
  });

  // ---- Watchlist Tests ----

  describe("watchlist", () => {
    it("should start empty", () => {
      expect(store.getWatchlist()).toEqual([]);
    });

    it("should add an item to the watchlist", () => {
      const item = store.addToWatchlist({
        symbol: "AAPL",
        name: "Apple Inc.",
        exchange: "US",
      });

      expect(item.symbol).toBe("AAPL");
      expect(item.name).toBe("Apple Inc.");
      expect(item.exchange).toBe("US");
      expect(item.id).toBeTruthy();
      expect(item.addedAt).toBeTruthy();
      expect(item.order).toBe(0);
    });

    it("should prevent duplicate symbols", () => {
      store.addToWatchlist({ symbol: "AAPL", name: "Apple Inc.", exchange: "US" });
      expect(() => {
        store.addToWatchlist({ symbol: "AAPL", name: "Apple Inc.", exchange: "US" });
      }).toThrow("already in the watchlist");
    });

    it("should remove an item from the watchlist", () => {
      const item = store.addToWatchlist({
        symbol: "AAPL",
        name: "Apple Inc.",
        exchange: "US",
      });
      expect(store.getWatchlist()).toHaveLength(1);

      const removed = store.removeFromWatchlist(item.id);
      expect(removed).toBe(true);
      expect(store.getWatchlist()).toHaveLength(0);
    });

    it("should return false when removing non-existent item", () => {
      expect(store.removeFromWatchlist("non-existent")).toBe(false);
    });

    it("should check if symbol is in watchlist", () => {
      expect(store.isInWatchlist("AAPL")).toBe(false);
      store.addToWatchlist({ symbol: "AAPL", name: "Apple Inc.", exchange: "US" });
      expect(store.isInWatchlist("AAPL")).toBe(true);
      // Case insensitive
      expect(store.isInWatchlist("aapl")).toBe(true);
    });

    it("should reorder watchlist items", () => {
      const a = store.addToWatchlist({ symbol: "AAPL", name: "Apple", exchange: "US" });
      const b = store.addToWatchlist({ symbol: "MSFT", name: "Microsoft", exchange: "US" });
      const c = store.addToWatchlist({ symbol: "GOOGL", name: "Alphabet", exchange: "US" });

      const reordered = store.reorderWatchlist([c.id, a.id, b.id]);
      expect(reordered[0].id).toBe(c.id);
      expect(reordered[1].id).toBe(a.id);
      expect(reordered[2].id).toBe(b.id);
    });

    it("should list items in order", () => {
      store.addToWatchlist({ symbol: "B", name: "B", exchange: "US" });
      store.addToWatchlist({ symbol: "A", name: "A", exchange: "US" });
      store.addToWatchlist({ symbol: "C", name: "C", exchange: "US" });

      const items = store.getWatchlist();
      expect(items[0].order).toBe(0);
      expect(items[1].order).toBe(1);
      expect(items[2].order).toBe(2);
    });
  });

  // ---- Alert Tests ----

  describe("alerts", () => {
    it("should start with no alerts", () => {
      expect(store.getAlerts()).toEqual([]);
    });

    it("should create an alert", () => {
      const alert = store.createAlert({
        symbol: "AAPL",
        conditionType: "GREATER_THAN",
        threshold: 200,
        enabled: true,
      });

      expect(alert.symbol).toBe("AAPL");
      expect(alert.conditionType).toBe("GREATER_THAN");
      expect(alert.threshold).toBe(200);
      expect(alert.enabled).toBe(true);
      expect(alert.id).toBeTruthy();
      expect(alert.createdAt).toBeTruthy();
      expect(alert.lastTriggeredAt).toBeUndefined();
    });

    it("should create an alert with label", () => {
      const alert = store.createAlert({
        symbol: "MSFT",
        conditionType: "LESS_THAN",
        threshold: 400,
        label: "MSFT Dip Alert",
        enabled: true,
      });
      expect(alert.label).toBe("MSFT Dip Alert");
    });

    it("should get alerts for a specific symbol", () => {
      store.createAlert({ symbol: "AAPL", conditionType: "GREATER_THAN", threshold: 200, enabled: true });
      store.createAlert({ symbol: "AAPL", conditionType: "LESS_THAN", threshold: 150, enabled: true });
      store.createAlert({ symbol: "MSFT", conditionType: "GREATER_THAN", threshold: 500, enabled: true });

      const aaplAlerts = store.getAlertsForSymbol("AAPL");
      expect(aaplAlerts).toHaveLength(2);

      const msftAlerts = store.getAlertsForSymbol("MSFT");
      expect(msftAlerts).toHaveLength(1);
    });

    it("should update an existing alert", () => {
      const alert = store.createAlert({
        symbol: "AAPL",
        conditionType: "GREATER_THAN",
        threshold: 200,
        enabled: true,
      });

      const updated = store.updateAlert(alert.id, { threshold: 250, enabled: false });
      expect(updated).not.toBeNull();
      expect(updated!.threshold).toBe(250);
      expect(updated!.enabled).toBe(false);
      expect(updated!.symbol).toBe("AAPL"); // unchanged
    });

    it("should return null when updating non-existent alert", () => {
      const result = store.updateAlert("no-such-id", { enabled: false });
      expect(result).toBeNull();
    });

    it("should delete an alert", () => {
      const alert = store.createAlert({
        symbol: "AAPL",
        conditionType: "GREATER_THAN",
        threshold: 200,
        enabled: true,
      });
      expect(store.getAlerts()).toHaveLength(1);

      const deleted = store.deleteAlert(alert.id);
      expect(deleted).toBe(true);
      expect(store.getAlerts()).toHaveLength(0);
    });

    it("should return false when deleting non-existent alert", () => {
      expect(store.deleteAlert("no-such-id")).toBe(false);
    });

    it("should mark alert as triggered", () => {
      const alert = store.createAlert({
        symbol: "AAPL",
        conditionType: "GREATER_THAN",
        threshold: 200,
        enabled: true,
      });

      const triggered = store.markAlertTriggered(alert.id);
      expect(triggered).not.toBeNull();
      expect(triggered!.lastTriggeredAt).toBeTruthy();
    });
  });

  // ---- Preferences Tests ----

  describe("preferences", () => {
    it("should return default preferences", () => {
      const prefs = store.getPreferences();
      expect(prefs.theme).toBe("system");
      expect(prefs.notificationsEnabled).toBe(true);
      expect(prefs.refreshIntervalMs).toBe(60_000);
      expect(prefs.defaultTimeframe).toBe("1M");
    });

    it("should update preferences partially", () => {
      const updated = store.updatePreferences({
        theme: "dark",
        notificationsEnabled: false,
      });

      expect(updated.theme).toBe("dark");
      expect(updated.notificationsEnabled).toBe(false);
      expect(updated.refreshIntervalMs).toBe(60_000); // unchanged
    });

    it("should persist preferences across reads", () => {
      store.updatePreferences({ theme: "dark" });
      const prefs = store.getPreferences();
      expect(prefs.theme).toBe("dark");
    });
  });

  // ---- Schema Version ----

  describe("schema version", () => {
    it("should report version 1", () => {
      expect(store.getSchemaVersion()).toBe(1);
    });

    it("should run migrations without error", () => {
      expect(() => store.runMigrations()).not.toThrow();
    });
  });
});