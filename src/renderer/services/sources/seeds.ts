// ============================================================
// StockAll — 常用股票代码表
//
// 为什么需要它：腾讯的搜索接口 smartbox.gtimg.cn 不返回 CORS 头，
// 浏览器会直接拦掉（net::ERR_FAILED），前端拿不到数据。
// 而行情接口 qt.gtimg.cn 是带 Access-Control-Allow-Origin: * 的，
// 可以正常使用。
//
// 因此搜索改为：在本地代码表里匹配 → 再用行情接口取回真实价格与中文名。
// 代价是只能搜到表内的股票；好处是零延迟、零限流、无需后端代理。
// 表内没有的股票，用户仍可直接输入代码（如 sh601398）查询。
// ============================================================

export interface StockSeed {
  /** 腾讯行情代码，含市场前缀（sh/sz/hk/us） */
  code: string;
  /** 中文名，用于展示与搜索匹配 */
  name: string;
  /** 英文名/拼音首字母，用于搜索匹配 */
  alias: string;
}

export const STOCK_SEEDS: StockSeed[] = [
  // ---- A 股 · 沪市 ----
  { code: 'sh600519', name: '贵州茅台', alias: 'gzmt maotai' },
  { code: 'sh601398', name: '工商银行', alias: 'gsyh icbc' },
  { code: 'sh601857', name: '中国石油', alias: 'zgsy petrochina' },
  { code: 'sh600036', name: '招商银行', alias: 'zsyh cmb' },
  { code: 'sh601318', name: '中国平安', alias: 'zgpa pingan' },
  { code: 'sh600030', name: '中信证券', alias: 'zxzq citic' },
  { code: 'sh600887', name: '伊利股份', alias: 'ylgf yili' },
  { code: 'sh601888', name: '中国中免', alias: 'zgzm ctg' },
  { code: 'sh600276', name: '恒瑞医药', alias: 'hryy hengrui' },
  { code: 'sh601012', name: '隆基绿能', alias: 'ljln longi' },
  { code: 'sh600585', name: '海螺水泥', alias: 'hlsn conch' },
  { code: 'sh601166', name: '兴业银行', alias: 'xyyh' },
  { code: 'sh600900', name: '长江电力', alias: 'cjdl' },
  { code: 'sh601899', name: '紫金矿业', alias: 'zjky zijin' },
  { code: 'sh600028', name: '中国石化', alias: 'zgsh sinopec' },
  { code: 'sh601088', name: '中国神华', alias: 'zgsh shenhua' },
  { code: 'sh600009', name: '上海机场', alias: 'shjc' },
  { code: 'sh601668', name: '中国建筑', alias: 'zgjz' },
  { code: 'sh601288', name: '农业银行', alias: 'nyyh abc' },
  { code: 'sh600104', name: '上汽集团', alias: 'sqjt saic' },
  { code: 'sh603288', name: '海天味业', alias: 'htwy' },
  { code: 'sh688981', name: '中芯国际', alias: 'zxgj smic' },
  { code: 'sh688111', name: '金山办公', alias: 'jsbg' },

  // ---- A 股 · 深市 ----
  { code: 'sz000858', name: '五粮液', alias: 'wly wuliangye' },
  { code: 'sz000001', name: '平安银行', alias: 'payh' },
  { code: 'sz000002', name: '万科A', alias: 'wka vanke' },
  { code: 'sz000333', name: '美的集团', alias: 'mdjt midea' },
  { code: 'sz000651', name: '格力电器', alias: 'gldq gree' },
  { code: 'sz002415', name: '海康威视', alias: 'hkws hikvision' },
  { code: 'sz300750', name: '宁德时代', alias: 'ndsd catl' },
  { code: 'sz002594', name: '比亚迪', alias: 'byd byd' },
  { code: 'sz000725', name: '京东方A', alias: 'jdfa boe' },
  { code: 'sz300059', name: '东方财富', alias: 'dfcf' },
  { code: 'sz002230', name: '科大讯飞', alias: 'kdxf iflytek' },
  { code: 'sz300124', name: '汇川技术', alias: 'hcjs inovance' },
  { code: 'sz002304', name: '洋河股份', alias: 'yhgf yanghe' },
  { code: 'sz000568', name: '泸州老窖', alias: 'lzlj luzhou' },
  { code: 'sz002714', name: '牧原股份', alias: 'mygf muyuan' },
  { code: 'sz300760', name: '迈瑞医疗', alias: 'mryl mindray' },

  // ---- 港股 ----
  { code: 'hk00700', name: '腾讯控股', alias: 'txkg tencent' },
  { code: 'hk09988', name: '阿里巴巴', alias: 'albb alibaba' },
  { code: 'hk03690', name: '美团', alias: 'mt meituan' },
  { code: 'hk09618', name: '京东集团', alias: 'jdjt jd' },
  { code: 'hk01810', name: '小米集团', alias: 'xmjt xiaomi' },
  { code: 'hk00941', name: '中国移动', alias: 'zgyd' },
  { code: 'hk00939', name: '建设银行', alias: 'jsyh' },
  { code: 'hk01398', name: '工商银行', alias: 'gsyh' },
  { code: 'hk00005', name: '汇丰控股', alias: 'hfkg hsbc' },
  { code: 'hk09999', name: '网易', alias: 'wy netease' },
  { code: 'hk09888', name: '百度集团', alias: 'bdjt baidu' },
  { code: 'hk02020', name: '安踏体育', alias: 'attc anta' },
  { code: 'hk01211', name: '比亚迪股份', alias: 'bydgf' },
  { code: 'hk02318', name: '中国平安', alias: 'zgpa' },

  // ---- 美股 ----
  { code: 'usAAPL', name: '苹果', alias: 'pg apple aapl' },
  { code: 'usMSFT', name: '微软', alias: 'wr microsoft msft' },
  { code: 'usGOOGL', name: '谷歌', alias: 'gg google googl' },
  { code: 'usAMZN', name: '亚马逊', alias: 'ymx amazon amzn' },
  { code: 'usTSLA', name: '特斯拉', alias: 'tsl tesla tsla' },
  { code: 'usNVDA', name: '英伟达', alias: 'ywd nvidia nvda' },
  { code: 'usMETA', name: 'Meta', alias: 'meta facebook fb' },
  { code: 'usNFLX', name: '奈飞', alias: 'nf netflix nflx' },
  { code: 'usAMD', name: 'AMD', alias: 'amd' },
  { code: 'usINTC', name: '英特尔', alias: 'yter intel intc' },
  { code: 'usBABA', name: '阿里巴巴', alias: 'albb baba' },
  { code: 'usJD', name: '京东', alias: 'jd' },
  { code: 'usPDD', name: '拼多多', alias: 'pdd' },
  { code: 'usNIO', name: '蔚来', alias: 'wl nio' },
  { code: 'usXPEV', name: '小鹏汽车', alias: 'xpqc xpeng' },
  { code: 'usLI', name: '理想汽车', alias: 'lxqc li' },
  { code: 'usBIDU', name: '百度', alias: 'bd bidu' },
  { code: 'usKO', name: '可口可乐', alias: 'kkkl coca ko' },
  { code: 'usDIS', name: '迪士尼', alias: 'dshn disney dis' },
  { code: 'usV', name: 'Visa', alias: 'visa v' },
  { code: 'usJPM', name: '摩根大通', alias: 'mgdt jpmorgan jpm' },
  { code: 'usBRK.B', name: '伯克希尔', alias: 'bkxe berkshire' },
  { code: 'usWMT', name: '沃尔玛', alias: 'wem walmart wmt' },
];

/**
 * 在本地代码表里做模糊匹配。
 * 匹配范围：代码、中文名、别名（含拼音首字母）。
 */
export function matchSeeds(query: string, limit = 20): StockSeed[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  const out: StockSeed[] = [];
  for (const seed of STOCK_SEEDS) {
    // 去掉市场前缀后的纯代码，便于用户直接输 600519
    const bare = seed.code.replace(/^(sh|sz|hk|us)/, '').toLowerCase();
    if (
      seed.code.toLowerCase().includes(q) ||
      bare.includes(q) ||
      seed.name.includes(q) ||
      seed.alias.toLowerCase().includes(q)
    ) {
      out.push(seed);
      if (out.length >= limit) break;
    }
  }
  return out;
}

/** 判断用户输入是否像是一个可直接查询的代码。 */
export function looksLikeCode(query: string): boolean {
  const q = query.trim();
  if (/^(sh|sz|hk|us)[0-9a-z.]+$/i.test(q)) return true;
  if (/^\d{6}$/.test(q)) return true;
  if (/^\d{5}$/.test(q)) return true;
  if (/^[A-Z]{1,5}(\.[A-Z])?$/.test(q)) return true;
  return false;
}
