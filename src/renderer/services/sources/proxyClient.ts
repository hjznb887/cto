// ============================================================
// StockAll — 本地代理客户端（渲染层）
//
// 背景：腾讯搜索接口无 CORS 头，浏览器无法直连。
// Electron 主进程会起一个本地代理，渲染层通过它访问。
//
// 两种运行环境：
//   - Electron：主进程注入端口，走代理，搜索覆盖全市场
//   - 纯浏览器（开发预览）：没有代理，自动降级为只搜内置表
//
// 降级不是失败——内置表覆盖常用标的，功能仍完整可用。
// ============================================================

/** 允许代理转发的上游地址前缀（与主进程白名单保持一致）。 */
const UPSTREAM = {
  search: 'https://smartbox.gtimg.cn/s3/',
  quote: 'https://qt.gtimg.cn/q=',
  kline: 'https://web.ifzq.gtimg.cn/appstock/app/fqkline/get',
  /** 板块 / 市场统计 */
  finance: 'https://proxy.finance.qq.com',
} as const;

let proxyPort: number | null = null;
let resolved = false;

/** 探测代理端口。Electron 下由主进程告知；浏览器下探测失败即视为不可用。 */
export async function resolveProxyPort(): Promise<number | null> {
  if (resolved) return proxyPort;
  resolved = true;

  // 主进程通过 preload 暴露的 ipcRenderer
  const ipc = (globalThis as { ipcRenderer?: { invoke: (ch: string) => Promise<number | null> } }).ipcRenderer;
  if (ipc) {
    try {
      proxyPort = await ipc.invoke('get-proxy-port');
      return proxyPort;
    } catch {
      proxyPort = null;
      return null;
    }
  }

  // 浏览器环境：尝试探测本地代理（开发者手动起了代理时可用）
  try {
    const res = await fetch('http://127.0.0.1:5198/proxy?url=' + encodeURIComponent('https://qt.gtimg.cn/q=sh600519'), {
      signal: AbortSignal.timeout(1500),
    });
    if (res.ok) {
      proxyPort = 5198;
      return proxyPort;
    }
  } catch {
    // 没有代理属于正常情况
  }

  proxyPort = null;
  return null;
}

/** 代理是否可用。 */
export function hasProxy(): boolean {
  return proxyPort !== null;
}

/**
 * 通过本地代理请求上游地址。
 * 代理不可用时返回 null（调用方据此降级），不抛异常。
 */
export async function proxyFetch(upstreamUrl: string, timeoutMs = 8000): Promise<ArrayBuffer | null> {
  const port = await resolveProxyPort();
  if (port === null) return null;

  const url = `http://127.0.0.1:${port}/proxy?url=${encodeURIComponent(upstreamUrl)}`;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) });
    if (!res.ok) return null;
    return await res.arrayBuffer();
  } catch {
    return null;
  }
}

/** 便捷方法：直接拿文本（按 GBK 解码）。 */
export async function proxyText(upstreamUrl: string, timeoutMs = 8000): Promise<string | null> {
  const buf = await proxyFetch(upstreamUrl, timeoutMs);
  if (!buf) return null;
  return new TextDecoder('gb18030').decode(buf);
}

export const UPSTREAM_URLS = UPSTREAM;

/** 测试用：重置探测状态。 */
export function resetProxyState(): void {
  proxyPort = null;
  resolved = false;
}
