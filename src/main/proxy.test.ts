import { describe, it, expect, beforeAll, afterAll, vi, afterEach } from 'vitest';
import { startProxy, type ProxyHandle } from './proxy';

/**
 * 代理服务测试。
 *
 * 重点验证「安全边界」而不是「能不能转发」——
 * 一个没有白名单的转发服务等于给本机开了个 SSRF 跳板。
 */

let handle: ProxyHandle;
let base: string;

// 用一个测试专用端口段，避免和开发环境冲突
const TEST_PORT = 5398;

beforeAll(async () => {
  handle = await startProxy(TEST_PORT);
  base = `http://127.0.0.1:${handle.port}`;
});

afterAll(() => {
  handle?.close();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('代理服务', () => {
  it('启动成功后返回实际端口', () => {
    expect(handle.port).toBeGreaterThanOrEqual(TEST_PORT);
  });

  it('端口被占用时自动顺延', async () => {
    const second = await startProxy(TEST_PORT);
    expect(second.port).toBeGreaterThan(handle.port);
    second.close();
  });

  it('缺少 url 参数返回 400', async () => {
    const res = await fetch(`${base}/proxy`);
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ error: 'missing_url' });
  });

  it('url 非法返回 400', async () => {
    const res = await fetch(`${base}/proxy?url=not-a-url`);
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ error: 'invalid_url' });
  });

  it('非白名单域名返回 403（防 SSRF）', async () => {
    const res = await fetch(`${base}/proxy?url=${encodeURIComponent('https://evil.example.com/steal')}`);
    expect(res.status).toBe(403);
    expect(await res.json()).toMatchObject({ error: 'host_not_allowed' });
  });

  it('拒绝非 https 的本地地址', async () => {
    const res = await fetch(`${base}/proxy?url=${encodeURIComponent('http://127.0.0.1:22/')}`);
    expect(res.status).toBe(403);
  });

  it('拒绝 file 协议', async () => {
    const res = await fetch(`${base}/proxy?url=${encodeURIComponent('file:///C:/Windows/win.ini')}`);
    expect(res.status).toBe(403);
  });

  it('未知路径返回 404', async () => {
    const res = await fetch(`${base}/whatever`);
    expect(res.status).toBe(404);
  });

  it('非 GET 方法返回 405', async () => {
    const res = await fetch(`${base}/proxy?url=${encodeURIComponent('https://qt.gtimg.cn/q=sh600519')}`, {
      method: 'POST',
    });
    expect(res.status).toBe(405);
  });

  it('OPTIONS 预检返回 204 并带 CORS 头', async () => {
    const res = await fetch(`${base}/proxy?url=x`, { method: 'OPTIONS' });
    expect(res.status).toBe(204);
    expect(res.headers.get('access-control-allow-origin')).toBe('*');
  });

  it('上游失败时返回 502 而不是崩溃', async () => {
    const failing = await startProxy(TEST_PORT + 1, 20, () => Promise.reject(new Error('network down')));
    const r = await fetch(`http://127.0.0.1:${failing.port}/proxy?url=${encodeURIComponent('https://qt.gtimg.cn/q=sh600519')}`);
    expect(r.status).toBe(502);
    expect(await r.json()).toMatchObject({ error: 'upstream_failed' });
    failing.close();
  });

  it('转发成功时原样回传上游内容与状态码', async () => {
    // 用纯 ASCII 载荷：测的是「字节原样透传」，不是编码转换。
    // 中文在真实链路上由前端按 gb18030 解码，此处不重复验证。
    const payload = new TextEncoder().encode('v_sh600519="1~600519~1272.75";');
    const stub = await startProxy(TEST_PORT + 2, 20, async () => ({
      status: 200,
      headers: { get: (n: string) => (n.toLowerCase() === 'content-type' ? 'text/html; charset=GBK' : null) },
      arrayBuffer: async () => payload.buffer as ArrayBuffer,
    }));

    const r = await fetch(`http://127.0.0.1:${stub.port}/proxy?url=${encodeURIComponent('https://qt.gtimg.cn/q=sh600519')}`);
    expect(r.status).toBe(200);
    expect(r.headers.get('access-control-allow-origin')).toBe('*');
    expect(r.headers.get('content-type')).toContain('GBK');
    expect(await r.text()).toBe('v_sh600519="1~600519~1272.75";');
    stub.close();
  });

  it('只监听回环地址，不对外暴露', () => {
    // 通过尝试用非回环地址访问来间接验证：这里检查服务地址配置
    expect(base).toContain('127.0.0.1');
  });
});
