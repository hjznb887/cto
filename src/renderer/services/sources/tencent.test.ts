import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { TencentDataSource, toTencentCode } from './tencent';
import { matchSeeds, looksLikeCode, STOCK_SEEDS } from './seeds';
import { resetProxyState } from './proxyClient';

/**
 * 用抓取保存的真实响应样本验证解析逻辑，不发起网络请求。
 * 接口一旦改格式，这里会失败并指出是哪个端点变了。
 */

// 真实响应样本（2026-09-15 抓取）
const QUOTE_JSON = JSON.stringify({
  sh600519: [
    '1', '贵州茅台', '600519', '1272.75', '1277.96', '1281.00', '13762', '6586', '7175',
    '1272.75', '3', '1272.73', '9', '1272.72', '3', '1272.70', '3', '1272.68', '1',
    '1272.78', '1', '1272.79', '1', '1272.93', '3', '1272.98', '1', '1273.00', '4', '',
    '20260915161458', '-5.21', '-0.41', '1284.50', '1271.28', '1272.75/13', '13762', '175692',
  ],
});

const KLINE_JSON = JSON.stringify({
  code: 0,
  data: {
    sh600519: {
      qfqday: [
        ['2026-08-04', '1350.060', '1328.360', '1350.940', '1328.360', '37450.000'],
        ['2026-08-05', '1328.360', '1306.450', '1333.800', '1303.500', '42689.000'],
      ],
    },
  },
});

/**
 * 构造响应。真实接口返回 GBK 字节，这里是 UTF-8，
 * 因此配套用 utf8 解码器（生产走 gb18030，位置等价）。
 */
function mockFetch(text: string) {
  const buf = new TextEncoder().encode(text);
  return vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    arrayBuffer: async () => buf.buffer,
  });
}

const utf8Decoder = (bytes: ArrayBuffer) => new TextDecoder('utf-8').decode(bytes);
const makeSource = () => new TencentDataSource(utf8Decoder);

beforeEach(() => {
  // 每个用例都从「无代理」开始：
  // 否则测试间会互相污染（前一个用例起的代理服务会被后一个探测到）。
  resetProxyState();
  vi.spyOn(globalThis, 'fetch').mockImplementation(() => Promise.reject(new Error('no proxy')));
});

afterEach(() => {
  vi.restoreAllMocks();
  resetProxyState();
});

describe('代码转换 toTencentCode', () => {
  it('6 开头按沪市，其余 6 位按深市', () => {
    expect(toTencentCode('600519')).toBe('sh600519');
    expect(toTencentCode('000858')).toBe('sz000858');
  });

  it('5 位数字按港股', () => {
    expect(toTencentCode('00700')).toBe('hk00700');
  });

  it('字母按美股', () => {
    expect(toTencentCode('AAPL')).toBe('usAAPL');
    expect(toTencentCode('aapl')).toBe('usAAPL');
  });

  it('已带前缀的保持不变', () => {
    expect(toTencentCode('sh600519')).toBe('sh600519');
    expect(toTencentCode('usTSLA')).toBe('usTSLA');
  });
});

describe('本地代码表', () => {
  it('按中文名匹配', () => {
    expect(matchSeeds('茅台')[0].code).toBe('sh600519');
  });

  it('按代码匹配（含省略市场前缀）', () => {
    expect(matchSeeds('600519').some((s) => s.code === 'sh600519')).toBe(true);
    expect(matchSeeds('sh600519').some((s) => s.code === 'sh600519')).toBe(true);
  });

  it('按拼音首字母匹配', () => {
    expect(matchSeeds('gzmt').some((s) => s.code === 'sh600519')).toBe(true);
  });

  it('按英文别名匹配', () => {
    expect(matchSeeds('apple').some((s) => s.code === 'usAAPL')).toBe(true);
  });

  it('大小写不敏感', () => {
    expect(matchSeeds('APPLE').length).toBe(matchSeeds('apple').length);
  });

  it('空查询返回空', () => {
    expect(matchSeeds('')).toEqual([]);
    expect(matchSeeds('   ')).toEqual([]);
  });

  it('无匹配时返回空而不是报错', () => {
    expect(matchSeeds('zzzzzzzz')).toEqual([]);
  });

  it('尊重数量上限', () => {
    expect(matchSeeds('a', 3).length).toBeLessThanOrEqual(3);
  });

  it('代码表内没有重复代码', () => {
    const codes = STOCK_SEEDS.map((s) => s.code);
    expect(new Set(codes).size).toBe(codes.length);
  });

  it('looksLikeCode 能识别各类代码', () => {
    expect(looksLikeCode('600519')).toBe(true);
    expect(looksLikeCode('00700')).toBe(true);
    expect(looksLikeCode('AAPL')).toBe(true);
    expect(looksLikeCode('sh600519')).toBe(true);
    expect(looksLikeCode('贵州茅台')).toBe(false);
  });
});

describe('行情解析', () => {
  it('从真实样本解出完整字段', async () => {
    vi.stubGlobal('fetch', mockFetch(QUOTE_JSON));
    const d = await makeSource().getDetails('sh600519');

    expect(d).toBeDefined();
    expect(d!.name).toBe('贵州茅台');
    expect(d!.price).toBe(1272.75);
    expect(d!.close).toBe(1277.96);
    expect(d!.open).toBe(1281.0);
    expect(d!.high).toBe(1284.5);
    expect(d!.low).toBe(1271.28);
    expect(d!.change).toBeCloseTo(-5.21, 2);
    expect(d!.changePercent).toBeCloseTo(-0.41, 2);
    expect(d!.exchange).toBe('SH');
  });

  it('同一标的 30 秒内走缓存', async () => {
    const spy = mockFetch(QUOTE_JSON);
    vi.stubGlobal('fetch', spy);
    const src = makeSource();
    await src.getDetails('sh600519');
    await src.getDetails('sh600519');
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('字段缺失时返回 undefined 而不是崩溃', async () => {
    vi.stubGlobal('fetch', mockFetch(JSON.stringify({ sh600519: ['1', 'x'] })));
    await expect(makeSource().getDetails('sh600519')).resolves.toBeUndefined();
  });

  it('响应不是合法 JSON 时返回 undefined', async () => {
    vi.stubGlobal('fetch', mockFetch('not json at all'));
    await expect(makeSource().getDetails('sh600519')).resolves.toBeUndefined();
  });

  it('HTTP 错误会抛出，交由上层降级', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 503 }));
    await expect(makeSource().getDetails('sh600519')).rejects.toThrow(/503/);
  });
});

describe('搜索（本地表 + 行情验证）', () => {
  it('命中本地表并返回行情接口给出的名称', async () => {
    vi.stubGlobal('fetch', mockFetch(QUOTE_JSON));
    const out = await makeSource().search('茅台');
    expect(out.length).toBeGreaterThan(0);
    expect(out[0].symbol).toBe('600519');
    expect(out[0].name).toBe('贵州茅台');
  });

  it('本地表未命中但输入像代码时，直接查一次', async () => {
    vi.stubGlobal('fetch', mockFetch(QUOTE_JSON));
    const out = await makeSource().search('sh600519');
    expect(out.some((r) => r.symbol === '600519')).toBe(true);
  });

  it('完全查不到时返回空数组', async () => {
    vi.stubGlobal('fetch', mockFetch(JSON.stringify({})));
    await expect(makeSource().search('zzzzzzzz')).resolves.toEqual([]);
  });

  it('空查询不发请求', async () => {
    const spy = mockFetch(QUOTE_JSON);
    vi.stubGlobal('fetch', spy);
    expect(await makeSource().search('  ')).toEqual([]);
    expect(spy).not.toHaveBeenCalled();
  });

  it('无代理时退回本地表，并用行情接口校验代码', async () => {
    const spy = mockFetch(QUOTE_JSON);
    vi.stubGlobal('fetch', spy);
    const out = await makeSource().search('茅台');
    // 代理不可用时不应静默返回空——本地表须兜住
    expect(out.length).toBeGreaterThan(0);
    expect(String(spy.mock.calls[0][0])).toContain('sh600519');
  });
});

describe('历史K线', () => {
  it('按 [日期,开,收,高,低,量] 取日期与收盘价', async () => {
    vi.stubGlobal('fetch', mockFetch(KLINE_JSON));
    expect(await makeSource().getHistory('sh600519', '1M')).toEqual([
      { time: '2026-08-04', price: 1328.36 },
      { time: '2026-08-05', price: 1306.45 },
    ]);
  });

  it('数据缺失返回空数组', async () => {
    vi.stubGlobal('fetch', mockFetch(JSON.stringify({ code: 0, data: {} })));
    await expect(makeSource().getHistory('sh600519', '1M')).resolves.toEqual([]);
  });

  it('响应非 JSON 时返回空数组', async () => {
    vi.stubGlobal('fetch', mockFetch('<html>error</html>'));
    await expect(makeSource().getHistory('sh600519', '1M')).resolves.toEqual([]);
  });
});

describe('默认自选', () => {
  it('取回可用的股票', async () => {
    vi.stubGlobal('fetch', mockFetch(QUOTE_JSON));
    const wl = await makeSource().getDefaultWatchlist();
    // 样本里只有 sh600519，另外两支取不到应被跳过
    expect(wl.length).toBe(1);
    expect(wl[0].name).toBe('贵州茅台');
  });

  it('全部取不到时返回空数组', async () => {
    vi.stubGlobal('fetch', mockFetch(JSON.stringify({})));
    expect(await makeSource().getDefaultWatchlist()).toEqual([]);
  });
});

describe('可用性', () => {
  it('有 fetch 时报告可用', () => {
    expect(makeSource().isAvailable()).toBe(true);
  });

  it('标识正确', () => {
    const src = makeSource();
    expect(src.id).toBe('tencent');
    expect(src.label).toBe('腾讯行情');
  });
});
