import { describe, it, expect } from 'vitest';
import { pctColorClass, pctColor, formatPct, currencyOf, formatPrice, formatAmount } from './format';

/**
 * 这些函数定义了全局一致的显示约定。
 * 之前的 bug 正是「同一个应用里两套约定」——所以这里重点锁死约定本身。
 */

describe('涨跌配色（中国习惯：红涨绿跌）', () => {
  it('上涨用红色', () => {
    expect(pctColorClass(1.2)).toContain('red');
    expect(pctColor(1.2)).toBe('#E5484D');
  });

  it('下跌用绿色', () => {
    expect(pctColorClass(-1.2)).toContain('emerald');
    expect(pctColor(-1.2)).toBe('#2E9E6B');
  });

  it('平盘用中性灰', () => {
    expect(pctColorClass(0)).toContain('slate');
    expect(pctColor(0)).toBe('#94A3B8');
  });

  it('零的边界：0.01 视为上涨，-0.01 视为下跌', () => {
    expect(pctColor(0.01)).toBe('#E5484D');
    expect(pctColor(-0.01)).toBe('#2E9E6B');
  });

  it('涨跌色互不相同（防止手滑写成同一个）', () => {
    expect(pctColor(1)).not.toBe(pctColor(-1));
  });
});

describe('涨跌幅格式', () => {
  it('正数补 + 号', () => {
    expect(formatPct(1.2)).toBe('+1.20%');
  });

  it('负数自带 - 号，不重复补', () => {
    expect(formatPct(-1.2)).toBe('-1.20%');
  });

  it('零显示为 0.00%', () => {
    expect(formatPct(0)).toBe('0.00%');
  });

  it('统一两位小数', () => {
    expect(formatPct(1.239)).toBe('+1.24%');
  });
});

describe('货币符号', () => {
  it('沪市深市用人民币符号', () => {
    expect(currencyOf('SH')).toBe('¥');
    expect(currencyOf('SZ')).toBe('¥');
  });

  it('港股用 HK$', () => {
    expect(currencyOf('HK')).toBe('HK$');
  });

  it('美股与未知交易所用 $', () => {
    expect(currencyOf('US')).toBe('$');
    expect(currencyOf('NASDAQ')).toBe('$');
    expect(currencyOf(undefined)).toBe('$');
    expect(currencyOf('')).toBe('$');
  });

  it('大小写不敏感', () => {
    expect(currencyOf('sh')).toBe('¥');
    expect(currencyOf('hk')).toBe('HK$');
  });

  it('价格带正确符号（修复前的 bug：全部显示 $）', () => {
    expect(formatPrice(1258.7, 'SH')).toBe('¥1258.70');
    expect(formatPrice(433.6, 'HK')).toBe('HK$433.60');
    expect(formatPrice(331.34, 'US')).toBe('$331.34');
  });

  it('总是两位小数', () => {
    expect(formatPrice(6, 'SH')).toBe('¥6.00');
  });
});

describe('大额数字折算', () => {
  it('亿级用「亿」', () => {
    expect(formatAmount(2840941996)).toBe('28.4 亿');
  });

  it('万级用「万」', () => {
    expect(formatAmount(88864)).toBe('8.9 万');
  });

  it('小额原样显示', () => {
    expect(formatAmount(1234)).toBe('1234');
  });

  it('零与负数不崩溃', () => {
    expect(formatAmount(0)).toBe('0');
    expect(formatAmount(-1e8)).toBe('-1.0 亿');
  });
});
