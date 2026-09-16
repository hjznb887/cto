// ============================================================
// StockAll — 本地行情代理
//
// 为什么需要它：
//   腾讯的搜索接口 smartbox.gtimg.cn 不返回 CORS 头，
//   浏览器直接拦掉（net::ERR_FAILED），前端拿它没办法。
//   行情接口 qt.gtimg.cn 虽然带 CORS，但搜索能力有限。
//
//   本地代理绕开同源策略：请求由 Node 侧发出（不受 CORS 约束），
//   再把结果转给前端。这样搜索覆盖全市场，而不只是内置的几十支。
//
// 设计要点：
//   - 只监听 127.0.0.1，不对外暴露
//   - 白名单转发：只允许访问腾讯行情域名，避免变成通用 SSRF 跳板
//   - 端口占用时自动顺延，避免和别的程序冲突
// ============================================================

import http from 'node:http';
import { URL } from 'node:url';

/** 允许转发的上游域名白名单。 */
const ALLOWED_HOSTS = new Set([
  'smartbox.gtimg.cn',
  'qt.gtimg.cn',
  'web.ifzq.gtimg.cn',
]);

/** 上游请求超时（毫秒）。 */
const UPSTREAM_TIMEOUT_MS = 8000;

export interface ProxyHandle {
  /** 代理监听端口。 */
  port: number;
  /** 关闭服务。 */
  close: () => void;
}

/**
 * 把上游响应原样（含状态码与 Content-Type）转给前端。
 * 不做格式转换——解析交给前端，保持代理职责单一。
 *
 * fetchImpl 可注入，便于测试替换掉真实网络请求。
 */
export type FetchLike = (url: URL, init: { headers: Record<string, string>; signal: AbortSignal }) => Promise<{
  status: number;
  headers: { get(name: string): string | null };
  arrayBuffer(): Promise<ArrayBuffer>;
}>;

const defaultFetch: FetchLike = (url, init) => fetch(url, init) as unknown as ReturnType<FetchLike>;

function createHandler(fetchImpl: FetchLike) {
  return (req: http.IncomingMessage, res: http.ServerResponse): void => {
    handleRequest(req, res, fetchImpl);
  };
}

function pipeUpstream(
  upstreamUrl: URL,
  res: http.ServerResponse,
  fetchImpl: FetchLike,
): void {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);

  fetchImpl(upstreamUrl, {
    headers: {
      // 腾讯接口对来源有校验
      Referer: 'https://gu.qq.com/',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    },
    signal: controller.signal,
  })
    .then(async (upstream) => {
      const buf = Buffer.from(await upstream.arrayBuffer());
      res.writeHead(upstream.status, {
        // 前端与代理同源，放开即可
        'Access-Control-Allow-Origin': '*',
        'Content-Type': upstream.headers.get('content-type') ?? 'text/plain; charset=gbk',
        'Cache-Control': 'no-store',
      });
      res.end(buf);
    })
    .catch((err: unknown) => {
      const message = err instanceof Error ? err.message : String(err);
      res.writeHead(502, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ error: 'upstream_failed', detail: message }));
    })
    .finally(() => clearTimeout(timer));
}

/**
 * 处理一次代理请求。
 * 路径形如 /proxy?url=<encoded upstream url>；
 * 也支持 /proxy/qt.gtimg.cn/q=... 这种直连式路径。
 */
function handleRequest(
  req: http.IncomingMessage,
  res: http.ServerResponse,
  fetchImpl: FetchLike = defaultFetch,
): void {
  if (!req.url) {
    res.writeHead(400).end('bad request');
    return;
  }

  // CORS 预检
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': '*',
    });
    res.end();
    return;
  }

  if (req.method !== 'GET') {
    res.writeHead(405).end('method not allowed');
    return;
  }

  const parsed = new URL(req.url, 'http://127.0.0.1');
  if (parsed.pathname !== '/proxy') {
    res.writeHead(404).end('not found');
    return;
  }

  const target = parsed.searchParams.get('url');
  if (!target) {
    res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ error: 'missing_url' }));
    return;
  }

  let upstreamUrl: URL;
  try {
    upstreamUrl = new URL(target);
  } catch {
    res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ error: 'invalid_url' }));
    return;
  }

  // 白名单校验：只允许转发到腾讯行情域名。
  // 没有这道检查，本代理就成了任意网站的跳板（SSRF）。
  if (upstreamUrl.protocol !== 'https:' || !ALLOWED_HOSTS.has(upstreamUrl.hostname)) {
    res.writeHead(403, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ error: 'host_not_allowed', host: upstreamUrl.hostname }));
    return;
  }

  pipeUpstream(upstreamUrl, res, fetchImpl);
}

/**
 * 启动代理，从 preferredPort 开始尝试，被占用则顺延。
 * 返回实际监听端口。
 */
export function startProxy(
  preferredPort = 5198,
  maxTries = 20,
  fetchImpl: FetchLike = defaultFetch,
): Promise<ProxyHandle> {
  return new Promise((resolve, reject) => {
    let attempt = 0;
    let port = preferredPort;

    const server = http.createServer(createHandler(fetchImpl));

    const onError = (err: NodeJS.ErrnoException) => {
      if (err.code === 'EADDRINUSE' && attempt < maxTries) {
        attempt += 1;
        port += 1;
        server.listen(port, '127.0.0.1');
        return;
      }
      reject(err);
    };

    server.on('error', onError);
    server.once('listening', () => {
      server.off('error', onError);
      resolve({
        port,
        close: () => server.close(),
      });
    });

    server.listen(port, '127.0.0.1');
  });
}
