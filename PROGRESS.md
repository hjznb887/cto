# PROGRESS

> 这份文件是**跨会话的记忆**。AI 做活做到一半断线（限额 / 上下文丢失）是常态，
> 每次新会话开始前，先读这份文件，再动手。
>
> **最后更新：2026-09-14（第二轮）**

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
| 全部测试 | ✅ **63/63 通过** | 5 个测试文件全绿 |
| 构建 | ✅ 通过 | `npx vite build` 产出 CSS 20.22 KB + JS 577 KB |
| ESLint | ❌ 14 个错误 | 全是 `@typescript-eslint/no-explicit-any` |
| 界面渲染 | ✅ 真实渲染 | 无头浏览器 DOM 中出现 StockAll / My Watchlist 等 |
| 样式 | ✅ Tailwind 生效 | `.text-6xl → 3.75rem`、`.rounded-3xl → 1.5rem` 已确认 |
| 死代码 | ❌ 7 个文件 | `app/api/stockall/*/route.ts` 无任何引用 |

### 已完成的功能

- **4 条路由**：`/`（仪表盘）、`/stock/:symbol`（个股详情）、`/alerts/new`、`/alerts/edit/:id`
- **5 个组件**：`StockSearch`、`StockList`、`StockDetail`（含 recharts 曲线图）、`AlertEditor`、`App`
- **预警编辑器**：支持 5 类规则 —— 价格阈值 / 均线交叉 / RSI / 放量 / 涨跌幅
- **预警持久化**：存 `localStorage`，键名 `stockall_alerts`

---

## 三、已知问题清单（按优先级）

### P0 —— 会直接影响使用

1. ~~**后端两个测试套件是坏的。**~~ ✅ **已修复（2026-09-14 第二轮）**

2. **7 个死路由文件。**
   `app/api/stockall/` 下 7 个 `route.ts` 是 **Next.js 约定**的文件，但项目里根本没有 Next.js 依赖。这些文件从写下那天起就没被执行过。**已确认无任何引用。**
   → 决策：删掉，或明确接进某个后端。

### P1 —— 影响观感与质量

3. **ESLint 14 个错误**，全部是 `any` 类型。集中在 `App.tsx`、`StockDetail.tsx`、`setupTests.ts`。
4. **`electron:dev` 脚本可能有问题。** 它等的是 `http://localhost:5173`，但实际 dev server 端口取决于 Vite 配置，需实测确认。
5. **`vite-plugin-electron` 下根路径 `/` 返回 404**，`/index.html` 正常。不影响实际使用，但值得记一笔。

### P2 —— 结构问题

6. **没有持久化层在用。** 写好的 `lib/stockall/persistence.ts`（16 KB，带测试）**在前端完全没被调用**，自选股只存在 React state 里，刷新就丢。
7. **构建产物偏大**：单 chunk 577 KB，未做代码分割。

---

## 四、待决策（需要人类拍板，AI 不要自行决定）

1. **是否接真实行情数据源？**
   涉及选型（Finnhub / Alpha Vantage / 雅虎财经等）、API Key、限流、可能的费用。
   **当前状态：未决策。**

2. **StockAll 最终要做成什么？**
   是「自己用的看盘工具」，还是「拿来验证 AI 团队协作能力的试验项目」？

---

## 五、已做过的改动记录

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

- [x] 修 `lib/stockall` 两个坏掉的测试 ~~（2026-09-14 完成，63/63 通过）~~
- [ ] 删除 7 个死路由文件（或明确其归属）
- [ ] 清掉 14 个 ESLint 错误
- [ ] 确认 `electron:dev` 能真正启动应用
- [ ] 把 `persistence.ts` 接进前端，让自选股能持久化
- [ ] 修 `generateMock*` 的随机性问题（缓存已修，但 mock 数据本身仍是随机的）
- [ ] ⏸ **暂停** —— 回到第四节确认数据源方案后再继续
