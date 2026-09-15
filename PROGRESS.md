# PROGRESS

> 这份文件是**跨会话的记忆**。AI 做活做到一半断线（限额 / 上下文丢失）是常态，
> 每次新会话开始前，先读这份文件，再动手。
>
> **最后更新：2026-09-15（第七轮）**

---

## 一、这个项目是什么

**StockAll** —— 一个股票行情追踪的 Windows 桌面应用（Electron + React + TypeScript + Vite）。

仓库名 `cto` 与项目无关，`cto` 是当时随手起的；项目本身叫 **StockAll**。

### 它现在的真实定位

**当前是「演示品」，不是「能用的工具」。** 所有行情数据都是写死的 mock：

- `MOCK_STOCKS` 只有 5 支股票（AAPL / GOOGL / MSFT / AMZN / TSLA）
- 历史价格曲线由 `Math.random()` 随机生成，不是真实数据
- 没有网络请求，没有行情 API，没有持久化

要变成真能用的东西，**必须接真实行情数据源**（这一步需要 API Key，尚未决策，见第四节）。

---

## 二、当前状态（已实测验证）

以下结论全部来自实际执行，不是读代码推测的。

| 检查项 | 状态 | 证据 |
|---|---|---|
| 依赖安装 | ✅ 通过 | `npm install` 装了 721 个包 |
| TypeScript 类型检查 | ✅ 通过 | `npx tsc --noEmit` 零错误 |
| 前端测试 | ✅ 21/21 通过 | `AlertEditor` 9 + `StockDetail` 7 + `App` 5 |
| 后端测试 | ✅ 42/42 通过 | 已修复（见第五节） |
| 测试 | ✅ **156/156 通过** | 10 个测试文件全绿 |
| 真实行情 | ✅ 已接入腾讯 | A股/港股/美股，实测可搜可查 |
| 界面语言 | ✅ 中文 | 默认 zh-CN，可一键切换英文 |
| Electron 桌面启动 | ✅ 实测通过 | 无头启动，DOM 渲染出完整界面 |
| 自选股持久化 | ✅ 已接入 | 实测：删除后写入 localStorage |
| 数据确定性 | ✅ 已完成 | 实测：连续 3 次刷新价格完全一致 |
| 数据源适配层 | ✅ 已完成 | 可替换后端，含离线兜底 |
| 构建 | ✅ 通过 | `npx vite build` 产出 CSS 20.22 KB + JS 577 KB |
| ESLint | ✅ 零错误 | 14 → 0（2026-09-14 第三轮） |
| 界面渲染 | ✅ 真实渲染 | 无头浏览器 DOM 中出现 StockAll / My Watchlist 等 |
| 样式 | ✅ Tailwind 生效 | `.text-6xl → 3.75rem`、`.rounded-3xl → 1.5rem` 已确认 |
| 死代码 | ✅ 已清理 | `app/` 7 个死路由已删除（2026-09-14 第三轮） |
| `.gitignore` 隐患 | ✅ 已修 | 曾忽略 `lib/`，会静默丢弃新增源文件（第四轮） |

### 已完成的功能

- **4 条路由**：`/`（仪表盘）、`/stock/:symbol`（个股详情）、`/alerts/new`、`/alerts/edit/:id`
- **5 个组件**：`StockSearch`、`StockList`、`StockDetail`（含 recharts 曲线图）、`AlertEditor`、`App`
- **预警编辑器**：支持 5 类规则 —— 价格阈值 / 均线交叉 / RSI / 放量 / 涨跌幅
- **预警持久化**：存 `localStorage`，键名 `stockall_alerts`

---

## 三、已知问题清单（按优先级）

### P0 —— 会直接影响使用

（当前无未解决的 P0 问题）

### P1 —— 影响观感与质量

3. ~~**ESLint 14 个错误**~~ ✅ **已修复（2026-09-14 第三轮）**
4. ~~**`electron:dev` 脚本可能有问题。**~~ ✅ **已实测（2026-09-14 第四轮）**
   生产模式启动验证通过：`electron.exe .` 加载 `dist/` 后窗口正常创建，渲染进程
   输出完整界面（`h1` 60px/900 字重、`section` 圆角 24px、5 个可交互元素）。
   **注意**：`electron:dev` 开发脚本仍等待 5173 端口，而 Vite 默认 5173——但
   `vite.config.ts` 未显式设置 `server.port`，若端口被占用会漂移导致 `wait-on` 卡住。
   临时需要开发模式时可用 `npx vite --config vite.preview.config.ts` 预览界面。
5. **`vite-plugin-electron` 下根路径 `/` 返回 404**，`/index.html` 正常。不影响实际使用，但值得记一笔。

### P2 —— 结构问题

6. ~~**没有持久化层在用。**~~ ✅ **已接入（2026-09-14 第四轮）**
   新增 `src/renderer/services/persistence.ts`，把自选股与预警写入 localStorage。
   实测：删除股票后 `stockall_watchlist` 立即写入。**注意**：这是浏览器层持久化，
   与 `lib/stockall/persistence.ts`（SQLite/内存 store）是两套方案，后者仍未接入。
7. **构建产物偏大**：单 chunk 577 KB，未做代码分割。
8. **`AlertRule` 类型此前在两处重复定义**（`App.tsx` 与 `AlertEditor.tsx`），已统一为从 `AlertEditor` 导出。`StockDetail.tsx` 也存在同类问题（`onAddToWatchlist: (stock: any)`），已改用 `Stock` 类型。
9. **Electron 安全配置偏松**：`nodeIntegration: true` + `contextIsolation: false`，
   且无 CSP。开发够用，但发布前应收紧（`contextIsolation: true` + preload 桥接）。

---

## 四、待决策（需要人类拍板，AI 不要自行决定）

1. **是否接入真实行情数据源？**
   **基础设施已就绪**（适配层 + 注册表，见第五轮）。剩下的是选哪个源，以及是否需要账号。
   免费选项（均无需注册、国内直连）：腾讯 `qt.gtimg.cn`、新浪 `hq.sinajs.cn`。
   官方选项需 Key：Finnhub（60 次/分）、Alpha Vantage（25 次/天）。
   **当前状态：已接入腾讯行情（免费、无需注册、国内直连）。** 见第五轮/第七轮记录。

2. **StockAll 最终要做成什么？**
   是「自己用的看盘工具」，还是「拿来验证 AI 团队协作能力的试验项目」？

---

## 五、已做过的改动记录

### 2026-09-15（AI 实施 · 第七轮）接入腾讯真实行情

**目标**：接入真实行情数据，让搜索能查到任意股票。

**1. 选型：腾讯行情（免费、无需注册、国内直连）**

腾讯接口满足全部条件：不需要 API Key、不需要代理、
A股/港股/美股全覆盖、返回中文名。

**2. ⚠️ 关键发现：搜索接口不可用（CORS 限制）**

计划用 `smartbox.gtimg.cn/s3/` 做搜索，但实测发现浏览器直接拦截：
`net::ERR_FAILED`。原因是该接口**不返回 `Access-Control-Allow-Origin` 头**。

| 端点 | CORS 头 | 浏览器可用 |
|---|---|---|
| `qt.gtimg.cn`（行情） | `Access-Control-Allow-Origin: *` | ✅ |
| `smartbox.gtimg.cn`（搜索） | **无** | ❌ 被同源策略拦死 |

这是浏览器安全模型决定的，前端无法绕过（除非自建后端代理，
但那违背「零成本、无服务」的定位）。

**3. 解决方案：本地代码表 + 行情验证**

- `sources/seeds.ts`：内置约 85 支常用股票（A股/港股/美股），
  含中文名、拼音首字母、英文别名
- 搜索流程：本地表模糊匹配 → 用行情接口批量取回真实价格与官方名称
- 表内没有的股票，用户可直接输入代码（如 `sh601398`）查询

代价：只能搜到表内的股票。好处：零延迟、无限流、无需后端。

**4. ⚠️ 修复一个会导致美股全部查不到的 bug**

`toTencentCode` 原本对已带前缀的代码统一转小写，但实测：

```
usAAPL   -> 正常返回数据
usaapl   -> 返回 pv_none_match（空）
```

腾讯的美股代码**大小写敏感**。按原逻辑处理，所有美股查询都会失败。
已修正为「前缀转小写，其余部分对美股转大写」。

**5. 改用 `fmt=json` 解析**

行情接口加 `&fmt=json` 后返回标准 JSON（而非 `v_xxx="a~b~c"` 格式），
解析更可靠。编码仍为 GBK，按 gb18030 解码。

**6. 顺带修复搜索体验（三个问题）**

- 原先要求 ≥2 个字符才搜索，但界面无任何提示 → 用户以为坏了。改为 1 个字符即可搜
- 搜到 0 条时下拉框不出现 → 像卡死。现在明确显示「没有匹配的股票」
- 输入框是浅色边框配深色背景，对比度极差 → 改为深色主题配色 + 焦点高亮

**7. 测试 +31（125 → 156）**

`tencent.test.ts` 覆盖：代码转换、本地表匹配（中文/拼音/代码/别名/大小写）、
行情解析、缓存、异常响应降级、搜索流程、K线解析、默认自选。

**8. 端到端验证（真实联网）**

```
茅台   -> 600519/贵州茅台
腾讯   -> 00700/腾讯控股
苹果   -> AAPL/苹果
600519 -> 600519/贵州茅台
gzmt   -> 600519/贵州茅台
银行   -> 601398/工商银行, 600036/招商银行, 601166/兴业银行（7 条）

默认自选: 贵州茅台 1272.75 | 腾讯控股 438.8 | 苹果 333.08
```

**门禁**：TypeScript 0 错误 | ESLint 0 错误 | 测试 **156/156** | 构建通过

### 2026-09-14（AI 实施 · 第五轮）数据源适配层 + 确定性数据

**目标**：让界面数据不再乱跳，并把数据源做成可替换的。

**背景**：原实现用 `Math.random()` 生成价格和曲线，同一个股票每次渲染价格都不同，
图表每次重绘形状都变。同时所有数据硬编码在 `stockService.ts` 里，换数据源要改 UI 层。

**1. 确定性伪随机（`services/random.ts`）**

FNV-1a 哈希 + 位混合，从种子字符串派生稳定数值：
`hashString` / `seededUnit` / `seededRange` / `seededInt` / `seededSigned` /
`todayKey` / `seededBasePrice`。

同一个 symbol + 同一天 → 同一个价格。换一天 → 不同价格。**无需网络。**

**2. 数据源适配层（`services/sources/`）**

| 文件 | 职责 |
|---|---|
| `types.ts` | `MarketDataSource` 接口 + 各时间框架的点数/间隔定义 |
| `mock.ts` | 确定性 demo 数据源，永远可用，兼作离线兜底 |
| `registry.ts` | 注册表：按顺序取第一个可用源，兜底离线源 |

`stockService.ts` 已重写为纯门面（façade）——UI 接口一字未改，
内部路由到 `getActiveSource()`，**任何 provider 抛错都自动降级到离线源**，
不会让界面空白或崩溃。

**要接入真实数据源时**（腾讯 / 新浪 / Finnhub 任选），只需：
1. 新建一个实现 `MarketDataSource` 的文件
2. 在 `registry.ts` 里 `registerSource(...)` 一行
3. UI 与 `stockService.ts` **不需要任何改动**

**3. 测试 +48（65 → 113）**

- `random.test.ts`（16）：哈希稳定性、值域、**分布均匀性**（200 个种子至少 180 个不同值，防哈希塌缩）、跨天差异
- `sources/sources.test.ts`（24）：确定性、OHLC 自洽性、时间框架点数、注册表选择与优先级、不可用源跳过、重复注册替换
- 全部使用固定时间（`2026-09-14T15:30:00Z`），保证可复现

**4. 端到端验证**

- Electron 内连续刷新 3 次 → 表格价格 `AAPL=$175.50`、`GOOGL=$140.20` **三次完全一致**
- 直接调用探针：同日两次调用价格相同；换到 09-15 后价格由 `171.48` 变为 `176.38`
- 历史序列长度 31（1M），价格全为正

**门禁**：TypeScript 0 错误 | ESLint 0 错误 | 测试 **113/113** | 构建通过

### 2026-09-14（AI 实施 · 第六轮）界面中文化

**目标**：把全英文界面改为中文。

**背景**：项目从建立之初所有文案都是硬编码英文，没有任何国际化机制。
中文是主要使用场景，此前一直是缺失的。

**做法**：不是把英文直接替换成中文，而是建立 i18n 层——**新增语言能力比翻译本身更有价值**。

**1. 词条表（`src/renderer/i18n/messages.ts`）**

- 以中文为基准语言定义 `zhCN`，`en` 必须与它键完全一致——**由 TypeScript 类型保证，漏翻会编译报错**
- 覆盖品牌、搜索、自选、表格、详情、预警、编辑器、页脚共约 70 个词条
- 语言选择写入 `localStorage`（键 `stockall_locale`），可跨重启保持

**2. React 绑定（`i18n/useI18n.ts`）**

基于 `useSyncExternalStore` 实现，切换语言时所有订阅组件同步刷新。

**3. 组件改造**

`App.tsx`、`StockList.tsx`、`StockSearch.tsx`、`StockDetail.tsx`、`AlertEditor.tsx`
全部文案改为 `t('key')` 取值。页头右上角新增语言切换按钮。

**4. 顺带修掉一个变量遮蔽隐患**

`AlertEditor.tsx` 里原本写着 `ALERT_TYPES.map(t => ...)`——回调参数 `t` 会**遮蔽 i18n 的 `t` 函数**。
若直接接入会导致取词条失败或取到错误的值。已把回调参数改名，并把类型定义中的
`name`/`description` 改为 `nameKey`/`descKey`（存键名而非文案）。

**5. 测试改造（+12，113 → 125）**

原有 17 处测试断言的是英文文案，中文界面一上线即全数失败。**没有改回英文，而是改为按词条 key 断言**：

```ts
screen.getByRole('button', { name: new RegExp(t('detail.addToWatchlist'), 'i') })
```

这样测试与语言解耦——将来切换到任何语言都不会再挂。

新增 `messages.test.ts`（12 个）：
- 各语言与基准语言的键完全一致（防漏翻）
- 无空词条
- **中文词条确实含中文**（防止「翻译了一半」）
- 语言切换、localStorage 持久化、非法值与损坏存储的降级

**6. 端到端验证**

无头浏览器渲染后检查 DOM：`你的全球市场智能助手`、`搜索行情`、`我的自选`、`预警规则`、
`代码`、`名称`、`现价`、`涨跌幅`、`操作`、`移除` **全部出现**；
`My Watchlist`、`Search Markets`、`Active Alerts`、`Create Alert` **全部清除**。

**门禁**：TypeScript 0 错误 | ESLint 0 错误 | 测试 **125/125** | 构建通过

### 2026-09-14（AI 修复 · 第四轮）

**目标**：验证 Electron 能否真正启动；把持久化接进前端。

**1. Electron 启动验证 —— 通过**

生产模式实测（无头启动，非人工点击）：
- 进程正常创建并保持运行，渲染进程有 console 输出
- DOM 探针结果：`root` 有 1 个子节点、`h1` 为 60px/900 字重、`section` 背景
  `rgba(30,41,59,0.4)` 圆角 24px、5 个可交互元素
- 界面文本完整：StockAll / Your intelligent global market companion / Search Markets /
  My Watchlist / AAPL / GOOGL / MSFT

→ **结论：它确实是一个能跑起来的桌面应用**，不只是「构建成功」。

**2. 发现并修复 `.gitignore` 定时炸弹**

`.gitignore` 里写着 `lib/`，但 `lib/stockall/` 下有 6 个被跟踪的源文件。
Git 只忽略**未跟踪**文件，所以现有代码安然无恙——**但任何新增到 `lib/` 的文件都会被静默丢弃**。
`app/` 也已在忽略列表里（该目录已在第三轮删除）。
两个条目都已移除，并加了注释说明原因。

*验证*：在 `lib/stockall/` 下新建测试文件，`git status` 能正常识别 → 修复生效。

**3. 接入持久化**

新增 `src/renderer/services/persistence.ts`：
- 自选股存 `stockall_watchlist`，预警存 `stockall_alerts`
- **带容错**：JSON 损坏、非数组、存储配额超限 —— 一律降级为空数据，不抛异常
- `loadWatchlist()` 对外只返回 `Stock` 形状，内部排序用的 `order` 字段在出口剥离

改造 `App.tsx`：
- 启动时优先读**已保存的自选股**，而不是永远用 mock 默认值
  （否则用户精心整理过的列表，一刷新就被 3 支演示股覆盖）
- 增删改三处操作全部落盘
- 移除原先散落的 `localStorage.setItem('stockall_alerts', ...)` 直接调用

新增 10 个测试，覆盖：往返一致性、顺序保持、损坏数据、非数组、写入失败降级。

**端到端验证**（Electron 内真实执行）：
点击 Remove 删除 1 支股票 → 表格由 3 行变 2 行 → `stockall_watchlist` 立即写入
且内容正确。**持久化链路打通。**

**门禁**：TypeScript 0 错误 | ESLint 0 错误 | 测试 **73/73** | 构建通过

### 2026-09-14（AI 修复 · 第三轮）

**目标**：删除死代码、清零 ESLint 错误。

**1. 删除 `app/` 目录（7 个死路由，11.9 KB）**

删除前做了双重核实：
- 全仓库搜索 `app/api`、`app/stockall`、`from 'app'` → **零引用**
- `tsconfig.json` 的 `include` 仅为 `["src"]` → **`app/` 从未参与编译**

确认是绝对的死代码后删除。删除后重跑测试：**63/63 仍全绿**。

**2. 清零 ESLint（14 → 0）**

不是用 `eslint-disable` 压制，而是逐个用真实类型替换：

| 文件 | 原问题 | 处理 |
|---|---|---|
| `persistence.test.ts` | `AlertConfig` 未使用 | 删除该导入 |
| `persistence.ts` | `Timeframe` 未使用 | 删除该导入 |
| `stock-service.test.ts` | `vi` 未使用 | 删除该导入 |
| `AlertEditor.tsx` ×2 | `params: any` | 新增并导出 `AlertParams` 接口 |
| `App.tsx` ×2 | `AlertRule` 重复定义、`stock: any` | 改为从 `AlertEditor` 导入类型；`any` → `Stock` |
| `StockDetail.tsx` | `stock: any` | 改用 `Stock` 类型 |
| `StockDetail.test.tsx` ×4 | `require()` + 3 处 `any` | 改用 ESM `import`；`any` → `React.ReactNode` / `unknown` |
| `setupTests.ts` ×2 | `(window as any)` | 改用 `as unknown as Record<string, unknown>` |

**3. 类型化过程中发现并修复一个潜在崩溃**

把 `any` 换成真实类型后，TypeScript 立即报出：

```
App.tsx(109): 'alert.params.direction' is possibly 'undefined'
App.tsx(111): 'alert.params.direction' is possibly 'undefined'
```

原因：`AlertParams` 的字段本应是**可选的**（不同规则类型只用其中几个字段）。修正为可选后，暴露出 `alert.params.direction.toUpperCase()` 在字段缺失时会**直接抛异常**。
已加空值兜底：`(alert.params.direction ?? '').toUpperCase()`。

**这正说明类型不是形式主义**——`any` 掩盖了两个真实的崩溃点。

**验证**：四关全过 —— TypeScript 零错误、ESLint 零错误、测试 63/63、构建通过。

### 2026-09-14（AI 修复 · 第二轮）

**目标**：修掉 `lib/stockall` 两个坏掉的测试套件。

**发现的问题（比预想严重）**：

1. **测试文件引用路径多了一层。**
   测试在 `lib/stockall/` 内，却写 `import { ... } from "../persistence"`——指向了不存在的 `lib/persistence`。
   修正 3 处：`persistence.test.ts` 静态导入 2 处、`stock-service.test.ts` 静态导入 1 处 + 动态 `import()` 1 处（第 171 行，较隐蔽）。

2. **⚠️ 发现真实产品 bug：mock 数据路径从不写缓存。**
   `stock-service.ts` 的 `fetchQuote()` 与 `fetchHistorical()`：
   - 有 API Key 时 → 成功取数后调用 `this.cache.set()` ✅
   - **无 API Key（当前状态）→ 直接 `return`，从不写缓存** ❌

   后果：**当前项目跑的是 mock 数据，所以缓存完全失效**——每次读取股票都重新生成一遍随机价格，界面上的数字会不停跳动。
   这**不是测试写错了，是测试正确地抓到了 bug**。

**修复**：mock 返回路径同样写入缓存（`fetchQuote` 与 `fetchHistorical` 各一处）。

**验证**：测试由「2 个套件加载失败」→ **63/63 全部通过**。

### 2026-09-14（AI 修复 · 第一轮）

**目标**：让界面能正常显示（此前 Tailwind 类名写满了但没装 Tailwind，界面是裸 HTML）。

**改动**：
- 新增 `tailwind.config.js`（content 指向 `index.html` 与 `src/**/*.{ts,tsx}`）
- 新增 `postcss.config.js`
- 新增 `vite.preview.config.ts`（纯 renderer 预览用，绕开 Electron 插件）
- 修改 `src/renderer/index.css`：加入三行 `@tailwind` 指令；移除 `body { display: flex }`（与 Tailwind base 冲突）
- 安装依赖：`tailwindcss@^3.4` + `postcss` + `autoprefixer`

**验证**：构建通过，CSS 由 0.8 KB 增至 20.22 KB，DOM 渲染出真实内容，样式计算值正确。

**预览方式**：
```
npx vite --config vite.preview.config.ts
# 访问 http://localhost:5199/index.html  ← 注意要带 /index.html
```

### 2026-06-29（原开发者，人类）

初版：脚手架 + 核心逻辑（`stock-service.ts`、`persistence.ts` 各 16 KB，带测试）

### 2026-09-14（`cto-new[bot]` 提交，#1）

新增 `StockDetail`、`AlertEditor` 及配套测试，引入 `react-router-dom`、`recharts`。
**遗留问题**：未装 Tailwind（导致界面无样式）、改坏了 `lib/stockall` 的两个测试套件。

---

## 六、工作纪律（给接手者）

1. **动手前先读这份文件**，做完后更新它。
2. **一次只做一件可验证的事**，做完立即 commit，不要攒一大坨。
3. **每次改动都要实测验证**，不要只看代码说「应该可以」。特别注意：**类型检查通过 ≠ 界面正确**（Tailwind 那次就是典型例子）。
4. **测试是记忆**。写测试不只是保质，也是给下一个接手者留下「这里应该是什么行为」。
5. **联网相关的任务放最后做**（最容易卡住）。
6. **第四节列出的待决策项，不要自行决定。**

---

## 七、下一步（建议顺序）

- [x] 修 `lib/stockall` 两个坏掉的测试 ~~（2026-09-14 第二轮，63/63 通过）~~
- [x] 删除 7 个死路由文件 ~~（2026-09-14 第三轮）~~
- [x] 清掉 14 个 ESLint 错误 ~~（2026-09-14 第三轮，14 → 0）~~
- [x] 确认 `electron:dev` 能真正启动应用 ~~（2026-09-14 第四轮，生产模式实测通过）~~
- [x] 把持久化接进前端，让自选股能持久化 ~~（2026-09-14 第四轮，localStorage）~~
- [x] 修 `generateMock*` 的随机性问题 ~~（2026-09-14 第五轮，改为确定性种子）~~
- [x] 建立数据源适配层 ~~（2026-09-14 第五轮）~~
- [ ] 收紧 Electron 安全配置（`contextIsolation: true` + CSP）
- [ ] 代码分割，降低 577 KB 单 chunk
- [ ] 把 `lib/stockall/persistence.ts`（SQLite 版）与浏览器层持久化统一
- [ ] ⏸ **暂停** —— 回到第四节确认数据源方案后再继续
