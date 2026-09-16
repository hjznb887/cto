// ============================================================
// StockAll — 市场资金流向
//
// 回答「钱在往哪走」。分三个维度，全部基于硬数据：
//
//   1. 涨跌分布   — 多少家在涨、多少家在跌（市场情绪）
//   2. 板块轮动   — 行业/概念/地域的涨跌幅排行（钱从哪流向哪）
//   3. 成交额排行 — 钱实际砸在哪些股票上
//
// ⚠️ 刻意不做「主力资金净流入」这类指标。
// 它们由第三方用「大单」金额估算，各平台口径不同，
// 同一支股票在不同平台可能给出相反结论。宁可少做，不做误导。
//
// 数据来源：腾讯行情（免费、无需 Key）
//   - 板块排行  proxy.finance.qq.com/ifzqgtimg/appstock/app/mktHs/rank
//   - 个股行情  qt.gtimg.cn
// ============================================================

import { proxyText, hasProxy, resolveProxyPort } from './sources/proxyClient';

const SECTOR_URL = 'https://proxy.finance.qq.com/ifzqgtimg/appstock/app/mktHs/rank';
const QUOTE_URL = 'https://qt.gtimg.cn/q=';

/** 板块类型。腾讯的 t 参数：01=行业 02=概念 03=地域。 */
export type SectorKind = 'industry' | 'concept' | 'region';

const SECTOR_TYPE: Record<SectorKind, string> = {
  industry: '01',
  concept: '02',
  region: '03',
};

export interface SectorRow {
  /** 板块名称 */
  name: string;
  /** 板块代码 */
  code: string;
  /** 当前点位 */
  index: number;
  /** 涨跌幅（%） */
  changePercent: number;
  /** 5 日涨跌幅（%） */
  changePercent5: number;
  /** 20 日涨跌幅（%） */
  changePercent20: number;
  /** 领涨股 */
  leader: {
    code: string;
    name: string;
    price: number;
    changePercent: number;
  } | null;
}

export interface MarketBreadth {
  /** 上涨家数 */
  up: number;
  /** 下跌家数 */
  down: number;
  /** 平盘家数 */
  flat: number;
  /** 统计样本总数 */
  total: number;
  /** 上涨占比（0-1） */
  upRatio: number;
}

export interface TurnoverRow {
  symbol: string;
  name: string;
  price: number;
  changePercent: number;
  /** 成交额（元） */
  amount: number;
}

function num(v: unknown): number {
  const n = parseFloat(String(v ?? ''));
  return Number.isFinite(n) ? n : 0;
}

/** 腾讯返回的 JSON 里中文是 \uXXXX 转义，需还原。 */
function decodeUnicodeEscapes(s: string): string {
  return s.replace(/\\u([0-9a-fA-F]{4})/g, (_, hex) =>
    String.fromCharCode(parseInt(hex, 16)),
  );
}

/**
 * 拉取板块排行。
 *
 * 注意：这个接口**必须经本地代理**——它不带 CORS 头，
 * 浏览器直连会被拦。没有代理时返回空数组（调用方负责提示）。
 */
export async function fetchSectorRanking(
  kind: SectorKind,
  limit = 20,
): Promise<SectorRow[]> {
  await resolveProxyPort();
  if (!hasProxy()) return [];

  const url = `${SECTOR_URL}?l=${limit}&p=1&t=${SECTOR_TYPE[kind]}/averatio&o=0`;
  const text = await proxyText(url);
  if (!text) return [];

  let json: { code?: number; data?: Record<string, unknown>[] };
  try {
    json = JSON.parse(text);
  } catch {
    return [];
  }

  if (json.code !== 0 || !Array.isArray(json.data)) return [];

  return json.data.map((d) => {
    const leaderCode = String(d.nzg_code ?? '');
    return {
      name: decodeUnicodeEscapes(String(d.bd_name ?? '')),
      code: String(d.bd_code ?? ''),
      index: num(d.bd_zxj),
      changePercent: num(d.bd_zdf),
      changePercent5: num(d.bd_zdf5),
      changePercent20: num(d.bd_zdf20),
      leader: leaderCode
        ? {
            code: leaderCode.toUpperCase().replace(/^(SH|SZ|HK|US)/, ''),
            name: decodeUnicodeEscapes(String(d.nzg_name ?? '')),
            price: num(d.nzg_zxj),
            changePercent: num(d.nzg_zdf),
          }
        : null,
    };
  });
}

/** 从行情接口批量取个股数据（内部复用）。 */
async function fetchQuotes(codes: string[]): Promise<Record<string, string[]>> {
  if (codes.length === 0) return {};
  const url = `${QUOTE_URL}${codes.join(',')}&fmt=json`;
  const text = await proxyText(url);
  if (!text) return {};
  try {
    const parsed = JSON.parse(text);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

/**
 * 沪深主要指数的成分股代码。
 *
 * 说明：这里用的是一份规模较大的代表性股票池，而不是「全部 A 股」。
 * 拉全市场（5000+ 支）需要几十次分批请求 + 限流处理，
 * 每次刷新要几十秒，对桌面小工具来说不划算。
 * 这里用约 300 支高流动性股票代表市场整体，口径在界面上会标明。
 */
const BREADTH_UNIVERSE: string[] = [
  // 沪市主板
  'sh600519', 'sh601398', 'sh601857', 'sh600036', 'sh601318', 'sh600030', 'sh600887',
  'sh601888', 'sh600276', 'sh601012', 'sh600585', 'sh601166', 'sh600900', 'sh601899',
  'sh600028', 'sh601088', 'sh600009', 'sh601668', 'sh601288', 'sh600104', 'sh603288',
  'sh688981', 'sh688111', 'sh600000', 'sh600016', 'sh600048', 'sh600050', 'sh600089',
  'sh600111', 'sh600150', 'sh600188', 'sh600196', 'sh600309', 'sh600346', 'sh600362',
  'sh600406', 'sh600438', 'sh600436', 'sh600460', 'sh600482', 'sh600515', 'sh600570',
  'sh600588', 'sh600606', 'sh600690', 'sh600745', 'sh600760', 'sh600795', 'sh600809',
  'sh600837', 'sh600893', 'sh600926', 'sh600941', 'sh600958', 'sh601006', 'sh601009',
  'sh601066', 'sh601111', 'sh601138', 'sh601169', 'sh601186', 'sh601211', 'sh601225',
  'sh601229', 'sh601336', 'sh601390', 'sh601601', 'sh601618', 'sh601628', 'sh601633',
  'sh601688', 'sh601728', 'sh601766', 'sh601788', 'sh601818', 'sh601838', 'sh601865',
  'sh601877', 'sh601878', 'sh601881', 'sh601985', 'sh601988', 'sh601989', 'sh601998',
  'sh603019', 'sh603259', 'sh603260', 'sh603501', 'sh603799', 'sh603806', 'sh603833',
  'sh603986', 'sh603993', 'sh688008', 'sh688012', 'sh688036', 'sh688041', 'sh688169',
  'sh688187', 'sh688223', 'sh688256', 'sh688271', 'sh688303', 'sh688363', 'sh688396',
  'sh688599', 'sh688981', 'sh688041',
  // 深市主板 + 创业板
  'sz000858', 'sz000001', 'sz000002', 'sz000333', 'sz000651', 'sz002415', 'sz300750',
  'sz002594', 'sz000725', 'sz300059', 'sz002230', 'sz300124', 'sz002304', 'sz000568',
  'sz002714', 'sz300760', 'sz000063', 'sz000100', 'sz000157', 'sz000166', 'sz000338',
  'sz000425', 'sz000538', 'sz000596', 'sz000625', 'sz000661', 'sz000708', 'sz000768',
  'sz000776', 'sz000786', 'sz000792', 'sz000800', 'sz000876', 'sz000895', 'sz000938',
  'sz000963', 'sz000977', 'sz000983', 'sz001289', 'sz001979', 'sz002001', 'sz002007',
  'sz002027', 'sz002049', 'sz002050', 'sz002074', 'sz002129', 'sz002142', 'sz002179',
  'sz002180', 'sz002202', 'sz002236', 'sz002241', 'sz002252', 'sz002271', 'sz002311',
  'sz002352', 'sz002371', 'sz002410', 'sz002460', 'sz002466', 'sz002475', 'sz002493',
  'sz002555', 'sz002601', 'sz002602', 'sz002648', 'sz002709', 'sz002736', 'sz002812',
  'sz002821', 'sz002841', 'sz002916', 'sz002920', 'sz002938', 'sz002945', 'sz300014',
  'sz300015', 'sz300033', 'sz300122', 'sz300142', 'sz300223', 'sz300274', 'sz300308',
  'sz300316', 'sz300347', 'sz300408', 'sz300413', 'sz300433', 'sz300442', 'sz300450',
  'sz300454', 'sz300496', 'sz300498', 'sz300502', 'sz300628', 'sz300661', 'sz300751',
  'sz300759', 'sz300782', 'sz300896', 'sz300919', 'sz300957', 'sz300979', 'sz300999',
  'sz301269',
];

/**
 * 计算市场涨跌分布。
 *
 * 分批请求避免 URL 过长与限流。每批 60 支。
 */
export async function fetchMarketBreadth(): Promise<MarketBreadth> {
  const BATCH = 60;
  let up = 0;
  let down = 0;
  let flat = 0;

  for (let i = 0; i < BREADTH_UNIVERSE.length; i += BATCH) {
    const batch = BREADTH_UNIVERSE.slice(i, i + BATCH);
    const rows = await fetchQuotes(batch);
    for (const code of batch) {
      const row = rows[code];
      if (!Array.isArray(row) || row.length < 33) continue;
      const pct = num(row[32]);
      if (pct > 0) up += 1;
      else if (pct < 0) down += 1;
      else flat += 1;
    }
  }

  const total = up + down + flat;
  return { up, down, flat, total, upRatio: total > 0 ? up / total : 0 };
}

/** 成交额排行：从同一股票池里按成交额排序取前 N。 */
export async function fetchTopTurnover(limit = 20): Promise<TurnoverRow[]> {
  const BATCH = 60;
  const all: TurnoverRow[] = [];

  for (let i = 0; i < BREADTH_UNIVERSE.length; i += BATCH) {
    const batch = BREADTH_UNIVERSE.slice(i, i + BATCH);
    const rows = await fetchQuotes(batch);
    for (const code of batch) {
      const row = rows[code];
      if (!Array.isArray(row) || row.length < 37) continue;

      // 成交额字段随市场不同而位置不同，这里统一从 [35] 的
      // "价格/成交量/成交额" 组合字段里取第三段，取不到再回退。
      let amount = 0;
      const combo = String(row[35] ?? '');
      const parts = combo.split('/');
      if (parts.length >= 3) amount = num(parts[2]);
      if (!amount) amount = num(row[37]);

      if (amount <= 0) continue;

      all.push({
        symbol: String(row[2] ?? code).split('.')[0].toUpperCase(),
        name: String(row[1] ?? ''),
        price: num(row[3]),
        changePercent: num(row[32]),
        amount,
      });
    }
  }

  return all.sort((a, b) => b.amount - a.amount).slice(0, limit);
}

/** 供界面显示的统计口径说明——避免用户误以为覆盖了全市场。 */
export const BREADTH_SCOPE_NOTE =
  `基于 ${BREADTH_UNIVERSE.length} 支高流动性股票统计，非全市场 5000+ 支`;
