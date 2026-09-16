// ============================================================
// StockAll — 腾讯行情数据源
//
// 为什么选腾讯：免费、无需注册、无需 API Key、国内直连（不需要代理），
// 同时覆盖 A 股 / 港股 / 美股，且返回中文名。
//
// ⚠️ 关于搜索：腾讯的搜索接口 smartbox.gtimg.cn **不返回 CORS 头**，
// 浏览器会直接拦掉（实测 net::ERR_FAILED），前端拿不到任何数据。
// 因此搜索改为「本地代码表匹配 + 行情接口取真实价格」。
// 表内没有的股票，用户仍可直接输入代码查询。
//
// 可用端点（均带 Access-Control-Allow-Origin: *）：
//   1. 行情  https://qt.gtimg.cn/q=<codes>&fmt=json
//   2. K线   https://web.ifzq.gtimg.cn/appstock/app/fqkline/get?param=<code>,day,,,<n>,qfq
//
// 编码：行情接口返回 GBK，必须按 gb18030 解码，否则中文名会乱码。
// ============================================================

import type { Stock, StockSearchResult, StockDetail, PricePoint } from '../../types/stock';
import type { MarketDataSource, Timeframe } from './types';
import { TIMEFRAME_SHAPE } from './types';
import { matchSeeds } from './seeds';
import { proxyText, hasProxy, resolveProxyPort } from './proxyClient';

const QUOTE_URL = 'https://qt.gtimg.cn/q=';
const KLINE_URL = 'https://web.ifzq.gtimg.cn/appstock/app/fqkline/get';
const SEARCH_URL = 'https://smartbox.gtimg.cn/s3/';

const HEADERS: Record<string, string> = {
  // 接口对来源有校验，缺少 Referer 可能被拒
  Referer: 'https://gu.qq.com/',
};

/**
 * 把响应字节解码成文本。
 * 腾讯行情接口返回 GBK，按 UTF-8 解码中文会乱码。
 * 解码器可注入，便于测试用 UTF-8 构造夹具。
 */
export type ByteDecoder = (bytes: ArrayBuffer) => string;

const gb18030Decoder: ByteDecoder = (bytes) => new TextDecoder('gb18030').decode(bytes);

/** 带超时的文本请求，避免悬挂导致界面一直转圈。 */
async function fetchText(url: string, timeoutMs = 8000, decode: ByteDecoder = gb18030Decoder): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { headers: HEADERS, signal: controller.signal });
    if (!res.ok) throw new Error(`腾讯接口返回 HTTP ${res.status}`);
    return decode(await res.arrayBuffer());
  } finally {
    clearTimeout(timer);
  }
}

function num(v: unknown): number {
  const n = parseFloat(String(v ?? ''));
  return Number.isFinite(n) ? n : 0;
}

/**
 * 腾讯搜索接口把中文名编码成 \uXXXX 转义（纯 ASCII），
 * 需要显式还原才能得到可读的中文名。
 */
function decodeUnicodeEscapes(s: string): string {
  return s.replace(/\\u([0-9a-fA-F]{4})/g, (_, hex) =>
    String.fromCharCode(parseInt(hex, 16)),
  );
}

/**
 * 由界面代码推断腾讯查询用的完整代码。
 *
 * ⚠️ 大小写敏感：腾讯的美股代码必须是大写（usAAPL），
 * 写成 usaapl 会返回 pv_none_match（空数据）。A股/港股前缀为小写。
 */
export function toTencentCode(symbol: string): string {
  const s = symbol.trim();

  // 已带前缀：前缀小写，其余部分保持原样（美股需要大写）
  const m = /^(sh|sz|hk|us)(.+)$/i.exec(s);
  if (m) {
    const prefix = m[1].toLowerCase();
    const rest = m[2];
    return prefix === 'us' ? prefix + rest.toUpperCase() : prefix + rest;
  }

  if (/^\d{6}$/.test(s)) return (s.startsWith('6') ? 'sh' : 'sz') + s;
  if (/^\d{5}$/.test(s)) return 'hk' + s;
  // 美股：代码必须大写
  return 'us' + s.toUpperCase();
}

/** 从腾讯返回的原始记录里取市场前缀。 */
function marketOf(code: string): string {
  return code.slice(0, 2).toUpperCase();
}

/**
 * 行情接口的 JSON 结构：
 *   { "sh600519": ["1","贵州茅台","600519","1272.75", ... ] }
 * 字段索引见 FIELDS 常量。
 */
interface QuoteRow {
  [code: string]: string[];
}

// 字段索引（A 股与美股字段数不同，但以下索引一致）
const F = {
  name: 1,
  code: 2,
  price: 3,
  prevClose: 4,
  open: 5,
  change: 31,
  changePercent: 32,
  high: 33,
  low: 34,
  volume: 36,
} as const;

/** 把一行行情记录转成 StockDetail。 */
function rowToDetail(code: string, row: string[]): StockDetail | undefined {
  if (!Array.isArray(row) || row.length < 35) return undefined;

  const price = num(row[F.price]);
  if (!price) return undefined;

  const rawCode = String(row[F.code] ?? '');
  const bare = rawCode.split('.')[0] || code.replace(/^(sh|sz|hk|us)/i, '');

  return {
    symbol: bare.toUpperCase(),
    name: String(row[F.name] ?? bare),
    price,
    change: num(row[F.change]),
    changePercent: num(row[F.changePercent]),
    exchange: marketOf(code),
    open: num(row[F.open]),
    close: num(row[F.prevClose]),
    high: num(row[F.high]),
    low: num(row[F.low]),
    volume: num(row[F.volume] ?? row[6]),
    // 行情接口不提供市值/行业/简介，留空避免界面出错
    marketCap: 0,
    sector: '',
    description: '',
  };
}

/** 把一行行情记录转成自选列表用的 Stock。 */
function rowToStock(code: string, row: string[]): Stock | undefined {
  const d = rowToDetail(code, row);
  if (!d) return undefined;
  return {
    symbol: d.symbol,
    name: d.name,
    price: d.price,
    change: d.change,
    changePercent: d.changePercent,
    exchange: d.exchange,
  };
}

export class TencentDataSource implements MarketDataSource {
  readonly id = 'tencent' as const;
  readonly label = '腾讯行情';

  /** 简单缓存，避免同一标的短时间内重复请求。 */
  private quoteCache = new Map<string, { at: number; data: StockDetail }>();
  private readonly cacheTtlMs = 30_000;
  /** 搜索结果也缓存：本地表匹配 + 行情验证一次要发一批请求。 */
  private searchCache = new Map<string, { at: number; data: StockSearchResult[] }>();

  private decode: ByteDecoder;

  constructor(decode: ByteDecoder = gb18030Decoder) {
    this.decode = decode;
  }

  /** 有 fetch 才能用；Node 测试环境会自动跳过并回落到离线源。 */
  isAvailable(): boolean {
    return typeof fetch === 'function' && typeof AbortController === 'function';
  }

  /** 批量取行情原始记录。 */
  private async quoteRows(codes: string[]): Promise<QuoteRow> {
    if (codes.length === 0) return {};
    const url = `${QUOTE_URL}${codes.join(',')}&fmt=json`;
    const text = await fetchText(url, 8000, this.decode);
    try {
      const parsed = JSON.parse(text) as QuoteRow;
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
      return {};
    }
  }

  // ------------------------------------------------------------
  // 搜索：优先走本地代理（全市场），拿不到再退回内置表
  // ------------------------------------------------------------
  async search(query: string): Promise<StockSearchResult[]> {
    const q = query.trim();
    if (!q) return [];

    const cached = this.searchCache.get(q.toLowerCase());
    if (cached && Date.now() - cached.at < this.cacheTtlMs) return cached.data;

    // ① 代理可用 → 走腾讯官方搜索，覆盖全市场
    const viaProxy = await this.searchViaProxy(q);
    if (viaProxy.length > 0) {
      this.searchCache.set(q.toLowerCase(), { at: Date.now(), data: viaProxy });
      return viaProxy;
    }

    // ② 退回内置表 + 行情验证
    const local = await this.searchViaLocalTable(q);
    this.searchCache.set(q.toLowerCase(), { at: Date.now(), data: local });
    return local;
  }

  /** 经本地代理调用腾讯搜索接口，覆盖全市场。 */
  private async searchViaProxy(q: string): Promise<StockSearchResult[]> {
    await resolveProxyPort();
    if (!hasProxy()) return [];

    const url = `${SEARCH_URL}?v=2&q=${encodeURIComponent(q)}&t=all`;
    const text = await proxyText(url);
    if (!text) return [];

    const eq = text.indexOf('="');
    if (eq === -1) return [];
    const payload = text.slice(eq + 2).replace(/"[\s;]*$/, '');
    if (!payload) return [];

    const out: StockSearchResult[] = [];
    for (const entry of payload.split('^')) {
      const parts = entry.split('~');
      if (parts.length < 5) continue;
      const [market, code, name, , kind] = parts as [string, string, string, string, string];
      // 只保留可交易股票，过滤基金/指数/债券
      if (!/^GP/.test(kind)) continue;

      const prefix = market.toLowerCase();
      const bare = code.split('.')[0];
      out.push({
        symbol: bare.toUpperCase(),
        name: decodeUnicodeEscapes(name),
        exchange: prefix.toUpperCase(),
      });
      if (out.length >= 20) break;
    }
    return out;
  }

  /** 退回内置股票表，再用行情接口补真实名称。 */
  private async searchViaLocalTable(q: string): Promise<StockSearchResult[]> {
    const seeds = matchSeeds(q);
    const out: StockSearchResult[] = [];

    if (seeds.length > 0) {
      const rows = await this.quoteRows(seeds.map((s) => s.code));
      for (const seed of seeds) {
        const row = rows[seed.code];
        if (!row) continue;
        const d = rowToDetail(seed.code, row);
        if (!d) continue;
        out.push({ symbol: d.symbol, name: d.name, exchange: d.exchange });
      }
    }

    // 内置表没命中，但输入像代码 → 直接查一次
    if (out.length === 0) {
      const code = toTencentCode(q);
      const rows = await this.quoteRows([code]);
      const row = rows[code];
      if (row) {
        const d = rowToDetail(code, row);
        if (d) out.push({ symbol: d.symbol, name: d.name, exchange: d.exchange });
      }
    }
    return out;
  }

  // ------------------------------------------------------------
  // 实时行情
  // ------------------------------------------------------------
  async getDetails(symbol: string): Promise<StockDetail | undefined> {
    const code = toTencentCode(symbol);
    const cached = this.quoteCache.get(code);
    if (cached && Date.now() - cached.at < this.cacheTtlMs) return cached.data;

    const rows = await this.quoteRows([code]);
    const row = rows[code];
    if (!row) return undefined;

    const detail = rowToDetail(code, row);
    if (detail) this.quoteCache.set(code, { at: Date.now(), data: detail });
    return detail;
  }

  // ------------------------------------------------------------
  // 默认自选（首次打开时展示）
  // ------------------------------------------------------------
  async getDefaultWatchlist(): Promise<Stock[]> {
    const seeds = ['sh600519', 'hk00700', 'usAAPL'];
    const rows = await this.quoteRows(seeds);

    const out: Stock[] = [];
    for (const code of seeds) {
      const row = rows[code];
      if (!row) continue;
      const stock = rowToStock(code, row);
      if (stock) out.push(stock);
    }
    return out;
  }

  // ------------------------------------------------------------
  // 历史 K 线
  // ------------------------------------------------------------
  async getHistory(symbol: string, timeframe: Timeframe): Promise<PricePoint[]> {
    const code = toTencentCode(symbol);
    const { count } = TIMEFRAME_SHAPE[timeframe];

    const url = `${KLINE_URL}?param=${code},day,,,${count},qfq`;
    const text = await fetchText(url, 8000, this.decode);

    let json: { data?: Record<string, { qfqday?: string[][]; day?: string[][] }> };
    try {
      json = JSON.parse(text);
    } catch {
      return [];
    }

    const entry = json.data?.[code];
    if (!entry) return [];
    const rows = entry.qfqday ?? entry.day ?? [];

    // 每行：[日期, 开, 收, 高, 低, 成交量]
    return rows.map((r) => ({ time: r[0], price: num(r[2]) }));
  }
}
