import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  fetchSectorRanking,
  fetchMarketBreadth,
  fetchTopTurnover,
  BREADTH_SCOPE_NOTE,
} from './marketFlow';
import { resetProxyState } from './sources/proxyClient';

/**
 * marketFlow 的数据全部来自本地代理（板块）或行情接口（个股）。
 * 这里用抓取保存的真实响应样本验证解析，不发起网络请求。
 */

const SECTOR_JSON = JSON.stringify({
  code: 0,
  msg: 'ok',
  data: [
    {
      bd_name: '\\u901a\\u4fe1\\u8bbe\\u5907',
      bd_code: 'pt01801102',
      bd_zxj: '9964.96',
      bd_zd: '484.66',
      bd_zdf: '5.11',
      bd_zs: '0.09',
      nzg_code: 'sz300548',
      nzg_name: '\\u957f\\u82af\\u535a\\u521b',
      nzg_zxj: '233.23',
      nzg_zd: '26.53',
      nzg_zdf: '12.84',
      bd_zdf5: '1.53',
      bd_zdf20: '5.47',
    },
    {
      bd_name: '\\u534a\\u5bfc\\u4f53',
      bd_code: 'pt01801081',
      bd_zxj: '9669.56',
      bd_zdf: '4.28',
      nzg_name: '\\u6709\\u7814\\u7845',
      nzg_code: 'sh688432',
      nzg_zxj: '54.06',
      nzg_zdf: '20.00',
      bd_zdf5: '2.36',
      bd_zdf20: '-2.60',
    },
  ],
});

/** 构造一行行情：字段索引与生产代码一致。 */
function quoteRow(code: string, name: string, price: number, pct: number, amount: number): string[] {
  const row: string[] = new Array(40).fill('');
  row[1] = name;
  row[2] = code;
  row[3] = String(price);
  row[4] = '100';
  row[5] = '100';
  row[32] = String(pct);
  row[35] = `${price}/1000/${amount}`;
  row[36] = '1000';
  return row;
}

const QUOTE_JSON = JSON.stringify({
  sh600519: quoteRow('600519', '贵州茅台', 1259.36, -1.05, 2840941996),
  sz000858: quoteRow('000858', '五粮液', 69.29, -0.59, 888640851),
  sh601398: quoteRow('601398', '工商银行', 6.12, 0.83, 5000000000),
});

/** 让代理探测成功，并把 fetch 指向夹具。 */
function stubProxyWith(json: string) {
  resetProxyState();
  vi.stubGlobal('fetch', vi.fn().mockImplementation(async (url: string) => {
    if (String(url).includes('/proxy?url=')) {
      return {
        ok: true,
        status: 200,
        arrayBuffer: async () => new TextEncoder().encode(json).buffer,
      };
    }
    // 端口探测
    return { ok: true, status: 200, arrayBuffer: async () => new ArrayBuffer(0) };
  }));
}

afterEach(() => {
  vi.restoreAllMocks();
  resetProxyState();
});

beforeEach(() => {
  resetProxyState();
});

describe('板块排行解析', () => {
  it('解出名称、涨跌幅与领涨股', async () => {
    stubProxyWith(SECTOR_JSON);
    const rows = await fetchSectorRanking('industry', 20);

    expect(rows.length).toBe(2);
    expect(rows[0].name).toBe('通信设备');
    expect(rows[0].changePercent).toBeCloseTo(5.11, 2);
    expect(rows[0].changePercent5).toBeCloseTo(1.53, 2);
    expect(rows[0].changePercent20).toBeCloseTo(5.47, 2);
    expect(rows[0].leader?.name).toBe('长芯博创');
    expect(rows[0].leader?.changePercent).toBeCloseTo(12.84, 2);
  });

  it('领涨股代码去掉市场前缀', async () => {
    stubProxyWith(SECTOR_JSON);
    const rows = await fetchSectorRanking('industry', 20);
    expect(rows[0].leader?.code).toBe('300548');
  });

  it('接口返回错误码时返回空数组', async () => {
    stubProxyWith(JSON.stringify({ code: -1, msg: 'TYPE_ERROR', data: [] }));
    expect(await fetchSectorRanking('industry', 20)).toEqual([]);
  });

  it('响应非 JSON 时返回空数组而不抛错', async () => {
    stubProxyWith('<html>err</html>');
    expect(await fetchSectorRanking('industry', 20)).toEqual([]);
  });

  it('无代理时返回空数组（由界面提示）', async () => {
    resetProxyState();
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('no proxy')));
    expect(await fetchSectorRanking('industry', 20)).toEqual([]);
  });

  it('三种板块类型都能请求', async () => {
    for (const kind of ['industry', 'concept', 'region'] as const) {
      stubProxyWith(SECTOR_JSON);
      const rows = await fetchSectorRanking(kind, 5);
      expect(rows.length).toBe(2);
    }
  });
});

describe('涨跌分布', () => {
  it('正确统计上涨与下跌家数', async () => {
    stubProxyWith(QUOTE_JSON);
    const b = await fetchMarketBreadth();
    // 夹具里 1 涨 2 跌
    expect(b.up).toBe(1);
    expect(b.down).toBe(2);
    expect(b.total).toBe(3);
    expect(b.upRatio).toBeCloseTo(1 / 3, 3);
  });

  it('全部数据缺失时不会崩溃，总数归零', async () => {
    stubProxyWith(JSON.stringify({}));
    const b = await fetchMarketBreadth();
    expect(b.total).toBe(0);
    expect(b.upRatio).toBe(0);
  });
});

describe('成交额排行', () => {
  it('按成交额降序排列', async () => {
    stubProxyWith(QUOTE_JSON);
    const top = await fetchTopTurnover(10);
    expect(top.length).toBeGreaterThan(0);
    for (let i = 1; i < top.length; i++) {
      expect(top[i - 1].amount).toBeGreaterThanOrEqual(top[i].amount);
    }
  });

  it('成交额取自组合字段的第三段', async () => {
    stubProxyWith(QUOTE_JSON);
    const top = await fetchTopTurnover(10);
    const icbc = top.find((r) => r.symbol === '601398');
    expect(icbc?.amount).toBe(5000000000);
  });

  it('限制返回条数', async () => {
    stubProxyWith(QUOTE_JSON);
    expect((await fetchTopTurnover(2)).length).toBeLessThanOrEqual(2);
  });
});

describe('口径说明', () => {
  it('明确标注为非全市场', () => {
    expect(BREADTH_SCOPE_NOTE).toContain('非全市场');
  });
});
