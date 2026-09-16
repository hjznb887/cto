// ============================================================
// StockAll — 行情显示格式
//
// 这里集中定义两件容易做错、且必须全局一致的事：
//
//   1. 涨跌配色 —— A 股习惯是「红涨绿跌」，与欧美相反。
//      此前 StockList / StockDetail 用了欧美习惯（绿涨红跌），
//      而 MarketFlow 用了中国习惯，同一应用内自相矛盾。
//
//   2. 货币符号 —— 之前一律写死 $，导致贵州茅台显示成 $1258.70、
//      腾讯控股显示成 $433.60，实际应是 ¥ 和 HK$。
// ============================================================

/** 涨跌对应的 Tailwind 文字色类（中国习惯：红涨绿跌）。 */
export function pctColorClass(v: number): string {
  if (v > 0) return 'text-red-400';
  if (v < 0) return 'text-emerald-400';
  return 'text-slate-400';
}

/** 涨跌对应的色值，供不便使用 class 的内联样式场景。 */
export function pctColor(v: number): string {
  if (v > 0) return '#E5484D';
  if (v < 0) return '#2E9E6B';
  return '#94A3B8';
}

/** 涨跌幅文本，正数补 + 号。 */
export function formatPct(v: number): string {
  return `${v > 0 ? '+' : ''}${v.toFixed(2)}%`;
}

/**
 * 按交易所推断货币符号。
 * 腾讯返回 SH / SZ / HK / US；离线源返回 NASDAQ 等。
 * 认不出来时退回 $，不显示错误符号。
 */
export function currencyOf(exchange: string | undefined): string {
  const e = (exchange ?? '').toUpperCase();
  if (e === 'SH' || e === 'SZ' || e === 'CN') return '¥';
  if (e === 'HK') return 'HK$';
  return '$';
}

/** 带货币符号的价格。 */
export function formatPrice(price: number, exchange?: string): string {
  return `${currencyOf(exchange)}${price.toFixed(2)}`;
}

/**
 * 大额数字折算，避免一长串零。
 * 用于成交额、市值等。中文语境用「亿/万」。
 */
export function formatAmount(v: number): string {
  const abs = Math.abs(v);
  if (abs >= 1e8) return `${(v / 1e8).toFixed(1)} 亿`;
  if (abs >= 1e4) return `${(v / 1e4).toFixed(1)} 万`;
  return v.toFixed(0);
}
