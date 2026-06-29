// ============================================================
// StockAll — SQLite Persistence Layer
// Schema for: watchlists, alert configurations, user preferences
// CRUD operations + migration system
// ============================================================

import type {
  WatchlistItem,
  AlertConfig,
  AlertConditionType,
  UserPreferences,
  Timeframe,
  ExchangeCode,
} from "./types";

// ============================================================
// In-Memory Store (Fallback when SQLite isn't available)
// ============================================================

/**
 * Simple in-memory database implementation.
 * Used as a fallback when better-sqlite3 is not available
 * (e.g., in the browser, Next.js serverless, or test environments).
 * In production Electron app, this is replaced by the SQLite implementation.
 */
export interface PersistenceStore {
  // Watchlists
  getWatchlist(): WatchlistItem[];
  addToWatchlist(item: Omit<WatchlistItem, "id" | "addedAt" | "order">): WatchlistItem;
  removeFromWatchlist(id: string): boolean;
  reorderWatchlist(orderedIds: string[]): WatchlistItem[];
  isInWatchlist(symbol: string): boolean;

  // Alerts
  getAlerts(): AlertConfig[];
  getAlertsForSymbol(symbol: string): AlertConfig[];
  createAlert(alert: Omit<AlertConfig, "id" | "createdAt" | "lastTriggeredAt">): AlertConfig;
  updateAlert(id: string, updates: Partial<AlertConfig>): AlertConfig | null;
  deleteAlert(id: string): boolean;
  markAlertTriggered(id: string): AlertConfig | null;

  // Preferences
  getPreferences(): UserPreferences;
  updatePreferences(updates: Partial<UserPreferences>): UserPreferences;

  // Migrations
  getSchemaVersion(): number;
  runMigrations(): void;
}

// ============================================================
// In-Memory Implementation
// ============================================================

const DEFAULT_PREFERENCES: UserPreferences = {
  theme: "system",
  defaultTimeframe: "1M",
  notificationsEnabled: true,
  refreshIntervalMs: 60_000,
};

let nextId = 1;
function generateId(): string {
  return `sa_${Date.now()}_${nextId++}`;
}

export class InMemoryStore implements PersistenceStore {
  private watchlist: WatchlistItem[] = [];
  private alerts: AlertConfig[] = [];
  private preferences: UserPreferences = { ...DEFAULT_PREFERENCES };
  private schemaVersion = 1;

  // ---- Watchlist CRUD ----

  getWatchlist(): WatchlistItem[] {
    return [...this.watchlist].sort((a, b) => a.order - b.order);
  }

  addToWatchlist(item: Omit<WatchlistItem, "id" | "addedAt" | "order">): WatchlistItem {
    if (this.isInWatchlist(item.symbol)) {
      throw new Error(`Symbol ${item.symbol} is already in the watchlist`);
    }
    const newItem: WatchlistItem = {
      ...item,
      id: generateId(),
      addedAt: new Date().toISOString(),
      order: this.watchlist.length,
    };
    this.watchlist.push(newItem);
    return newItem;
  }

  removeFromWatchlist(id: string): boolean {
    const index = this.watchlist.findIndex((w) => w.id === id);
    if (index === -1) return false;
    this.watchlist.splice(index, 1);
    // Re-order remaining items
    this.watchlist.forEach((item, i) => {
      item.order = i;
    });
    return true;
  }

  reorderWatchlist(orderedIds: string[]): WatchlistItem[] {
    const reordered: WatchlistItem[] = [];
    for (let i = 0; i < orderedIds.length; i++) {
      const item = this.watchlist.find((w) => w.id === orderedIds[i]);
      if (item) {
        item.order = i;
        reordered.push(item);
      }
    }
    // Add any items not in orderedIds at the end
    const remaining = this.watchlist.filter((w) => !orderedIds.includes(w.id));
    remaining.forEach((item) => {
      item.order = reordered.length;
      reordered.push(item);
    });
    this.watchlist = reordered;
    return [...this.watchlist];
  }

  isInWatchlist(symbol: string): boolean {
    return this.watchlist.some((w) => w.symbol.toUpperCase() === symbol.toUpperCase());
  }

  // ---- Alert CRUD ----

  getAlerts(): AlertConfig[] {
    return [...this.alerts];
  }

  getAlertsForSymbol(symbol: string): AlertConfig[] {
    return this.alerts.filter(
      (a) => a.symbol.toUpperCase() === symbol.toUpperCase(),
    );
  }

  createAlert(alert: Omit<AlertConfig, "id" | "createdAt" | "lastTriggeredAt">): AlertConfig {
    const newAlert: AlertConfig = {
      ...alert,
      id: generateId(),
      createdAt: new Date().toISOString(),
    };
    this.alerts.push(newAlert);
    return newAlert;
  }

  updateAlert(id: string, updates: Partial<AlertConfig>): AlertConfig | null {
    const index = this.alerts.findIndex((a) => a.id === id);
    if (index === -1) return null;
    this.alerts[index] = { ...this.alerts[index], ...updates, id };
    return this.alerts[index];
  }

  deleteAlert(id: string): boolean {
    const index = this.alerts.findIndex((a) => a.id === id);
    if (index === -1) return false;
    this.alerts.splice(index, 1);
    return true;
  }

  markAlertTriggered(id: string): AlertConfig | null {
    return this.updateAlert(id, { lastTriggeredAt: new Date().toISOString() });
  }

  // ---- Preferences ----

  getPreferences(): UserPreferences {
    return { ...this.preferences };
  }

  updatePreferences(updates: Partial<UserPreferences>): UserPreferences {
    this.preferences = { ...this.preferences, ...updates };
    return this.getPreferences();
  }

  // ---- Migration ----

  getSchemaVersion(): number {
    return this.schemaVersion;
  }

  runMigrations(): void {
    // In-memory store is always at latest version
    this.schemaVersion = 1;
  }
}

// ============================================================
// SQLite Implementation (for Electron main process)
// ============================================================

/**
 * SQLite-backed persistence store.
 * Uses better-sqlite3 for synchronous SQLite access.
 * Only available in Node.js / Electron main process.
 */
export class SQLiteStore implements PersistenceStore {
  private db: import("better-sqlite3").Database | null = null;
  private dbPath: string;

  constructor(dbPath?: string) {
    this.dbPath = dbPath || ":memory:";
    this.init();
  }

  private init(): void {
    try {
      // Dynamic import so it doesn't break browser builds
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const Database = require("better-sqlite3");
      this.db = new Database(this.dbPath);
      this.db.pragma("journal_mode = WAL");
      this.runMigrations();
    } catch {
      console.warn(
        "better-sqlite3 not available. Falling back to in-memory store.",
      );
    }
  }

  // ---- Schema Setup ----

  runMigrations(): void {
    if (!this.db) return;
    const currentVersion = this.getSchemaVersion();

    if (currentVersion < 1) {
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS schema_version (
          version INTEGER PRIMARY KEY,
          applied_at TEXT NOT NULL DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS watchlist (
          id TEXT PRIMARY KEY,
          symbol TEXT NOT NULL UNIQUE,
          name TEXT NOT NULL,
          exchange TEXT NOT NULL,
          added_at TEXT NOT NULL,
          sort_order INTEGER NOT NULL DEFAULT 0
        );

        CREATE TABLE IF NOT EXISTS alerts (
          id TEXT PRIMARY KEY,
          symbol TEXT NOT NULL,
          condition_type TEXT NOT NULL,
          threshold REAL NOT NULL,
          label TEXT,
          enabled INTEGER NOT NULL DEFAULT 1,
          created_at TEXT NOT NULL,
          last_triggered_at TEXT
        );

        CREATE TABLE IF NOT EXISTS preferences (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL
        );

        CREATE INDEX IF NOT EXISTS idx_alerts_symbol ON alerts(symbol);
        CREATE INDEX IF NOT EXISTS idx_watchlist_symbol ON watchlist(symbol);

        INSERT OR REPLACE INTO schema_version (version) VALUES (1);
      `);
    }

    // Future migrations go here as else-if blocks
    // if (currentVersion < 2) { ... }
  }

  getSchemaVersion(): number {
    if (!this.db) return 1;
    try {
      const row = this.db
        .prepare("SELECT version FROM schema_version ORDER BY version DESC LIMIT 1")
        .get() as { version: number } | undefined;
      return row?.version ?? 0;
    } catch {
      return 0;
    }
  }

  // ---- Watchlist CRUD ----

  getWatchlist(): WatchlistItem[] {
    if (!this.db) return new InMemoryStore().getWatchlist();
    const rows = this.db
      .prepare("SELECT * FROM watchlist ORDER BY sort_order ASC")
      .all() as Array<{
        id: string;
        symbol: string;
        name: string;
        exchange: string;
        added_at: string;
        sort_order: number;
      }>;
    return rows.map((r) => ({
      id: r.id,
      symbol: r.symbol,
      name: r.name,
      exchange: r.exchange as ExchangeCode,
      addedAt: r.added_at,
      order: r.sort_order,
    }));
  }

  addToWatchlist(item: Omit<WatchlistItem, "id" | "addedAt" | "order">): WatchlistItem {
    if (!this.db) return new InMemoryStore().addToWatchlist(item);
    if (this.isInWatchlist(item.symbol)) {
      throw new Error(`Symbol ${item.symbol} is already in the watchlist`);
    }
    const id = generateId();
    const addedAt = new Date().toISOString();
    const maxOrder = this.db
      .prepare("SELECT COALESCE(MAX(sort_order), -1) + 1 AS next_order FROM watchlist")
      .get() as { next_order: number };

    this.db
      .prepare(
        "INSERT INTO watchlist (id, symbol, name, exchange, added_at, sort_order) VALUES (?, ?, ?, ?, ?, ?)",
      )
      .run(id, item.symbol, item.name, item.exchange, addedAt, maxOrder.next_order);

    return { id, symbol: item.symbol, name: item.name, exchange: item.exchange, addedAt, order: maxOrder.next_order };
  }

  removeFromWatchlist(id: string): boolean {
    if (!this.db) return new InMemoryStore().removeFromWatchlist(id);
    const result = this.db.prepare("DELETE FROM watchlist WHERE id = ?").run(id);
    return result.changes > 0;
  }

  reorderWatchlist(orderedIds: string[]): WatchlistItem[] {
    if (!this.db) return new InMemoryStore().reorderWatchlist(orderedIds);
    const updateStmt = this.db.prepare("UPDATE watchlist SET sort_order = ? WHERE id = ?");
    const transaction = this.db.transaction(() => {
      for (let i = 0; i < orderedIds.length; i++) {
        updateStmt.run(i, orderedIds[i]);
      }
    });
    transaction();
    return this.getWatchlist();
  }

  isInWatchlist(symbol: string): boolean {
    if (!this.db) return new InMemoryStore().isInWatchlist(symbol);
    const row = this.db
      .prepare("SELECT 1 FROM watchlist WHERE UPPER(symbol) = UPPER(?)")
      .get(symbol);
    return !!row;
  }

  // ---- Alert CRUD ----

  getAlerts(): AlertConfig[] {
    if (!this.db) return new InMemoryStore().getAlerts();
    const rows = this.db
      .prepare(
        "SELECT id, symbol, condition_type, threshold, label, enabled, created_at, last_triggered_at FROM alerts ORDER BY created_at DESC",
      )
      .all() as Array<{
        id: string;
        symbol: string;
        condition_type: string;
        threshold: number;
        label: string | null;
        enabled: number;
        created_at: string;
        last_triggered_at: string | null;
      }>;
    return rows.map((r) => ({
      id: r.id,
      symbol: r.symbol,
      conditionType: r.condition_type as AlertConditionType,
      threshold: r.threshold,
      label: r.label || undefined,
      enabled: r.enabled === 1,
      createdAt: r.created_at,
      lastTriggeredAt: r.last_triggered_at || undefined,
    }));
  }

  getAlertsForSymbol(symbol: string): AlertConfig[] {
    return this.getAlerts().filter(
      (a) => a.symbol.toUpperCase() === symbol.toUpperCase(),
    );
  }

  createAlert(alert: Omit<AlertConfig, "id" | "createdAt" | "lastTriggeredAt">): AlertConfig {
    if (!this.db) return new InMemoryStore().createAlert(alert);
    const id = generateId();
    const createdAt = new Date().toISOString();
    this.db
      .prepare(
        "INSERT INTO alerts (id, symbol, condition_type, threshold, label, enabled, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
      )
      .run(id, alert.symbol, alert.conditionType, alert.threshold, alert.label || null, alert.enabled ? 1 : 0, createdAt);
    return {
      id,
      symbol: alert.symbol,
      conditionType: alert.conditionType,
      threshold: alert.threshold,
      label: alert.label,
      enabled: alert.enabled,
      createdAt,
    };
  }

  updateAlert(id: string, updates: Partial<AlertConfig>): AlertConfig | null {
    if (!this.db) return new InMemoryStore().updateAlert(id, updates);
    const existing = this.db.prepare("SELECT * FROM alerts WHERE id = ?").get(id) as Record<string, unknown> | undefined;
    if (!existing) return null;

    const fields: string[] = [];
    const values: unknown[] = [];

    if (updates.symbol !== undefined) { fields.push("symbol = ?"); values.push(updates.symbol); }
    if (updates.conditionType !== undefined) { fields.push("condition_type = ?"); values.push(updates.conditionType); }
    if (updates.threshold !== undefined) { fields.push("threshold = ?"); values.push(updates.threshold); }
    if (updates.label !== undefined) { fields.push("label = ?"); values.push(updates.label); }
    if (updates.enabled !== undefined) { fields.push("enabled = ?"); values.push(updates.enabled ? 1 : 0); }
    if (updates.lastTriggeredAt !== undefined) { fields.push("last_triggered_at = ?"); values.push(updates.lastTriggeredAt); }

    if (fields.length > 0) {
      values.push(id);
      this.db.prepare(`UPDATE alerts SET ${fields.join(", ")} WHERE id = ?`).run(...values);
    }

    return this.getAlerts().find((a) => a.id === id) || null;
  }

  deleteAlert(id: string): boolean {
    if (!this.db) return new InMemoryStore().deleteAlert(id);
    const result = this.db.prepare("DELETE FROM alerts WHERE id = ?").run(id);
    return result.changes > 0;
  }

  markAlertTriggered(id: string): AlertConfig | null {
    return this.updateAlert(id, { lastTriggeredAt: new Date().toISOString() });
  }

  // ---- Preferences ----

  getPreferences(): UserPreferences {
    if (!this.db) return new InMemoryStore().getPreferences();
    const rows = this.db.prepare("SELECT key, value FROM preferences").all() as Array<{
      key: string;
      value: string;
    }>;
    const prefs: Record<string, unknown> = {};
    for (const row of rows) {
      try {
        prefs[row.key] = JSON.parse(row.value);
      } catch {
        prefs[row.key] = row.value;
      }
    }
    return { ...DEFAULT_PREFERENCES, ...prefs } as UserPreferences;
  }

  updatePreferences(updates: Partial<UserPreferences>): UserPreferences {
    if (!this.db) return new InMemoryStore().updatePreferences(updates);
    const upsert = this.db.prepare(
      "INSERT OR REPLACE INTO preferences (key, value) VALUES (?, ?)",
    );
    const transaction = this.db.transaction(() => {
      for (const [key, value] of Object.entries(updates)) {
        upsert.run(key, JSON.stringify(value));
      }
    });
    transaction();
    return this.getPreferences();
  }
}

// ============================================================
// Factory
// ============================================================

let _defaultStore: PersistenceStore | null = null;

/**
 * Get the default persistence store.
 * - In Node.js/Electron: SQLiteStore
 * - In browser/fallback: InMemoryStore
 */
export function getStore(dbPath?: string): PersistenceStore {
  if (!_defaultStore) {
    try {
      _defaultStore = new SQLiteStore(dbPath);
    } catch {
      _defaultStore = new InMemoryStore();
    }
  }
  return _defaultStore;
}

export function resetStore(): void {
  if (_defaultStore instanceof SQLiteStore) {
    _defaultStore = null;
  } else {
    _defaultStore = null;
  }
}

export { InMemoryStore as MemoryStore };