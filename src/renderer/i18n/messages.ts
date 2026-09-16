// ============================================================
// StockAll — 文案 / 国际化
//
// 原先所有界面文案都是硬编码英文。这里统一抽成词条表，
// 按语言 key 存放，组件通过 t('key') 取用。
//
// 目前提供 zh-CN（默认）与 en 两种；新增语言只需在 messages
// 里增加一份同构的对象即可，编译器会校验键是否齐全。
// ============================================================

export type Locale = 'zh-CN' | 'en';

/** 基准语言：其余语言必须与它键完全一致（由类型系统保证）。 */
const zhCN = {
  // 品牌与页头
  'app.name': 'StockAll',
  'app.tagline': '你的全球市场智能助手',

  // 搜索
  'search.placeholder': '搜索股票（如 AAPL、苹果）',
  'search.loading': '搜索中…',
  'search.section': '搜索行情',
  'search.empty': '没有匹配的股票',

  // 自选股
  'watchlist.title': '我的自选',
  'watchlist.syncing': '正在同步自选列表…',
  'watchlist.empty': '自选列表是空的，先搜索添加一支吧',
  'watchlist.error': '自选列表加载失败',

  // 表格
  'table.symbol': '代码',
  'table.name': '名称',
  'table.price': '现价',
  'table.changePercent': '涨跌幅',
  'table.action': '操作',
  'table.remove': '移除',

  // 个股详情
  'detail.loading': '正在加载个股详情…',
  'detail.back': '← 返回',
  'detail.notFound': '未找到该股票',
  'detail.stats': '关键指标',
  'detail.open': '开盘',
  'detail.close': '昨收',
  'detail.high': '最高',
  'detail.low': '最低',
  'detail.volume': '成交量',
  'detail.marketCap': '总市值',
  'detail.addToWatchlist': '加入自选',
  'detail.removeFromWatchlist': '移出自选',
  'detail.createAlert': '创建预警',
  'detail.chart': '价格走势',

  // 预警
  'alerts.title': '预警规则',
  'alerts.empty': '还没有配置预警规则',
  'alerts.createFirst': '创建第一条预警',
  'alerts.create': '创建预警',
  'alerts.edit': '编辑',
  'alerts.delete': '删除',
  'alerts.pause': '暂停',
  'alerts.enable': '启用',
  'alerts.notFound': '未找到该预警规则，可能已被删除。',
  'alerts.backHome': '返回首页',

  // 预警编辑器
  'editor.createTitle': '创建预警规则',
  'editor.editTitle': '编辑预警规则',
  'editor.change': '更换',
  'editor.selectStockFirst': '请先选择一支股票。',
  'editor.targetStock': '目标股票',
  'editor.alertType': '预警类型',
  'editor.parameters': '参数设置',
  'editor.direction': '方向',
  'editor.above': '高于',
  'editor.below': '低于',
  'editor.aboveOverbought': '高于（超买）',
  'editor.belowOversold': '低于（超卖）',
  'editor.price': '价格',
  'editor.shortPeriod': '短周期',
  'editor.longPeriod': '长周期',
  'editor.rsiLevel': 'RSI 阈值',
  'editor.volumeMultiplier': '放量倍数（相对均值）',
  'editor.percentChange': '涨跌幅',
  'editor.timeframeMin': '时间窗口（分钟）',
  'editor.notifications': '通知方式',
  'editor.sound': '声音',
  'editor.toast': '系统弹窗',
  'editor.email': '邮件（专业版）',
  'editor.ruleStatus': '规则状态',
  'editor.ruleStatusHint': '启用或停用这条规则',
  'editor.save': '保存',
  'editor.saveRule': '保存规则',
  'editor.toggleAria': '启用或停用此规则',
  'editor.cancel': '取消',

  // 预警类型名称与说明
  'type.price_threshold': '价格阈值',
  'type.price_threshold.desc': '当价格高于或低于指定值时触发',
  'type.ma_crossover': '均线交叉',
  'type.ma_crossover.desc': '当短期均线穿越长期均线时触发',
  'type.rsi_level': 'RSI 水平',
  'type.rsi_level.desc': '当 RSI 进入超买或超卖区间时触发',
  'type.volume_spike': '成交量放大',
  'type.volume_spike.desc': '当成交量超过均值一定倍数时触发',
  'type.price_change': '涨跌幅',
  'type.price_change.desc': '当价格在指定时间内变动超过一定比例时触发',

  // 页脚
  'footer.version': 'StockAll 桌面版',

  // 导航
  'nav.watchlist': '我的自选',
  'nav.market': '市场资金流向',

  // 资金流向
  'flow.title': '市场资金流向',
  'flow.subtitle': '钱在往哪走 · 基于实时行情计算',
  'flow.refresh': '刷新数据',
  'flow.loading': '加载中…',
  'flow.updatedAt': '更新于',
  'flow.error': '数据加载失败，请稍后重试',
  'flow.breadth': '涨跌分布',
  'flow.upCount': '家上涨',
  'flow.downCount': '家下跌',
  'flow.flatCount': '家平盘',
  'flow.upRatio': '上涨占比',
  'flow.sentiment': '市场情绪：',
  'flow.strong': '普涨',
  'flow.mildUp': '偏强',
  'flow.mixed': '分化',
  'flow.mildDown': '偏弱',
  'flow.weak': '普跌',
  'flow.sectors': '板块轮动',
  'flow.kind.industry': '行业',
  'flow.kind.concept': '概念',
  'flow.kind.region': '地域',
  'flow.noSector': '暂无板块数据（需本地代理支持）',
  'flow.leader': '领涨',
  'flow.turnover': '成交额排行',
  'flow.turnoverHint': '钱实际砸在哪些股票上',
  'flow.disclaimer': '数据来自腾讯行情，仅供研究参考，不构成任何投资建议。',

  // 语言切换
  'lang.switch': '切换语言',
} as const;

export type MessageKey = keyof typeof zhCN;

const en: Record<MessageKey, string> = {
  'app.name': 'StockAll',
  'app.tagline': 'Your intelligent global market companion.',
  'search.placeholder': 'Search stocks (e.g. AAPL, Apple)...',
  'search.loading': 'Searching...',
  'search.section': 'Search Markets',
  'search.empty': 'No matching stocks',
  'watchlist.title': 'My Watchlist',
  'watchlist.syncing': 'Syncing your watchlist...',
  'watchlist.empty': 'Your watchlist is empty. Search to add a stock.',
  'watchlist.error': 'Failed to fetch watchlist stocks.',
  'table.symbol': 'Symbol',
  'table.name': 'Name',
  'table.price': 'Price',
  'table.changePercent': 'Change %',
  'table.action': 'Action',
  'table.remove': 'Remove',
  'detail.loading': 'Loading stock details...',
  'detail.back': '← Back',
  'detail.notFound': 'Stock not found.',
  'detail.stats': 'Key Statistics',
  'detail.open': 'Open',
  'detail.close': 'Close',
  'detail.high': 'High',
  'detail.low': 'Low',
  'detail.volume': 'Volume',
  'detail.marketCap': 'Market Cap',
  'detail.addToWatchlist': 'Add to Watchlist',
  'detail.removeFromWatchlist': 'Remove from Watchlist',
  'detail.createAlert': 'Create Alert',
  'detail.chart': 'Price history',
  'alerts.title': 'Active Alerts',
  'alerts.empty': 'No alerts configured yet.',
  'alerts.createFirst': 'Set your first alert',
  'alerts.create': 'Create Alert',
  'alerts.edit': 'Edit',
  'alerts.delete': 'Delete',
  'alerts.pause': 'Pause',
  'alerts.enable': 'Enable',
  'alerts.notFound': 'Alert not found. It may have been deleted.',
  'alerts.backHome': 'Back to Dashboard',
  'editor.createTitle': 'Create New Alert Rule',
  'editor.editTitle': 'Edit Alert Rule',
  'editor.change': 'Change',
  'editor.selectStockFirst': 'Please select a stock.',
  'editor.targetStock': 'Target Stock',
  'editor.alertType': 'Alert Type',
  'editor.parameters': 'Parameters',
  'editor.direction': 'Direction',
  'editor.above': 'Above',
  'editor.below': 'Below',
  'editor.aboveOverbought': 'Above (Overbought)',
  'editor.belowOversold': 'Below (Oversold)',
  'editor.price': 'Price ($)',
  'editor.shortPeriod': 'Short Period',
  'editor.longPeriod': 'Long Period',
  'editor.rsiLevel': 'RSI Level',
  'editor.volumeMultiplier': 'Volume Multiplier (vs Avg)',
  'editor.percentChange': 'Change %',
  'editor.timeframeMin': 'Timeframe (min)',
  'editor.notifications': 'Notifications',
  'editor.sound': 'Sound',
  'editor.toast': 'System Toast',
  'editor.email': 'Email (Pro)',
  'editor.ruleStatus': 'Rule Status',
  'editor.ruleStatusHint': 'Enable or disable this rule',
  'editor.save': 'Save',
  'editor.saveRule': 'Save Rule',
  'editor.toggleAria': 'Toggle rule active',
  'editor.cancel': 'Cancel',
  'type.price_threshold': 'Price Threshold',
  'type.price_threshold.desc': 'Triggers when price goes above or below a value',
  'type.ma_crossover': 'Moving Average Crossover',
  'type.ma_crossover.desc': 'Triggers when short MA crosses long MA',
  'type.rsi_level': 'RSI Level',
  'type.rsi_level.desc': 'Triggers when RSI enters overbought/oversold territory',
  'type.volume_spike': 'Volume Spike',
  'type.volume_spike.desc': 'Triggers when volume exceeds average by X%',
  'type.price_change': 'Price Change %',
  'type.price_change.desc': 'Triggers when price moves by X% in Y minutes',
  'footer.version': 'StockAll Desktop Engine',
  'nav.watchlist': 'Watchlist',
  'nav.market': 'Market Flow',

  'flow.title': 'Market Money Flow',
  'flow.subtitle': 'Where the money is going, computed from live quotes',
  'flow.refresh': 'Refresh',
  'flow.loading': 'Loading…',
  'flow.updatedAt': 'Updated',
  'flow.error': 'Failed to load data, please retry',
  'flow.breadth': 'Advance / Decline',
  'flow.upCount': 'advancing',
  'flow.downCount': 'declining',
  'flow.flatCount': 'unchanged',
  'flow.upRatio': 'Advancers',
  'flow.sentiment': 'Sentiment:',
  'flow.strong': 'Broad rally',
  'flow.mildUp': 'Leaning up',
  'flow.mixed': 'Mixed',
  'flow.mildDown': 'Leaning down',
  'flow.weak': 'Broad selloff',
  'flow.sectors': 'Sector Rotation',
  'flow.kind.industry': 'Industry',
  'flow.kind.concept': 'Theme',
  'flow.kind.region': 'Region',
  'flow.noSector': 'No sector data (requires the local proxy)',
  'flow.leader': 'Leader',
  'flow.turnover': 'Top Turnover',
  'flow.turnoverHint': 'Where the money is actually going',
  'flow.disclaimer': 'Data from Tencent quotes. For research only, not investment advice.',
  'lang.switch': 'Switch language',
};

export const messages: Record<Locale, Record<MessageKey, string>> = {
  'zh-CN': zhCN,
  en,
};

/** 默认语言。中文优先，因为这是主要使用场景。 */
export const DEFAULT_LOCALE: Locale = 'zh-CN';

const STORAGE_KEY = 'stockall_locale';

let current: Locale = DEFAULT_LOCALE;

/** 读取语言设置；无存储、存储损坏或值非法时回落到默认语言。 */
export function initLocale(): Locale {
  if (typeof localStorage === 'undefined') return current;
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'zh-CN' || saved === 'en') current = saved;
  } catch {
    // 读取失败不影响使用，保持默认
  }
  return current;
}

export function getLocale(): Locale {
  return current;
}

export function setLocale(locale: Locale): void {
  current = locale;
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, locale);
  } catch {
    // 写入失败时仅本次会话生效
  }
}

/**
 * 取词条。找不到时返回 key 本身而不是空串——
 * 界面上直接显示未翻译的键名，比留白更容易被发现。
 */
export function t(key: MessageKey): string {
  return messages[current][key] ?? key;
}

/** 供测试使用：不改变全局状态地读取某个语言的词条。 */
export function translateIn(locale: Locale, key: MessageKey): string {
  return messages[locale][key] ?? key;
}
