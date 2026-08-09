import { describe, expect, it, vi } from 'vitest';
import { fetchJson, HttpError, redactUrl } from '../src/providers/http.js';

const noSleep = async (): Promise<void> => undefined;

describe('http layer', () => {
  it('returns parsed JSON on success and sends a descriptive user agent', async () => {
    let ua = '';
    const fetchImpl = (async (_url: unknown, init?: RequestInit) => {
      ua = (init?.headers as Record<string, string>)['user-agent'] ?? '';
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    }) as unknown as typeof fetch;
    const data = await fetchJson('https://example.com/api', { fetchImpl, sleep: noSleep });
    expect(data).toEqual({ ok: true });
    expect(ua).toContain('kindle-bolivia-dashboard');
  });

  it('retries transient 5xx up to 2 times then fails', async () => {
    const fetchImpl = vi.fn(
      async () => new Response('down', { status: 503 }),
    ) as unknown as typeof fetch;
    await expect(fetchJson('https://example.com/x', { fetchImpl, sleep: noSleep })).rejects.toThrow(
      'HTTP 503',
    );
    expect(fetchImpl).toHaveBeenCalledTimes(3);
  });

  it('retries 429', async () => {
    let n = 0;
    const fetchImpl = (async () => {
      n++;
      return n < 2
        ? new Response('rate', { status: 429 })
        : new Response('{"v":1}', { status: 200 });
    }) as unknown as typeof fetch;
    expect(await fetchJson('https://example.com/x', { fetchImpl, sleep: noSleep })).toEqual({
      v: 1,
    });
  });

  it('does not retry ordinary 4xx', async () => {
    const fetchImpl = vi.fn(
      async () => new Response('nope', { status: 404 }),
    ) as unknown as typeof fetch;
    await expect(fetchJson('https://example.com/x', { fetchImpl, sleep: noSleep })).rejects.toThrow(
      'HTTP 404',
    );
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('does not retry JSON parse failures', async () => {
    const fetchImpl = vi.fn(
      async () => new Response('<html>', { status: 200 }),
    ) as unknown as typeof fetch;
    await expect(fetchJson('https://example.com/x', { fetchImpl, sleep: noSleep })).rejects.toThrow(
      'no-JSON',
    );
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('retries network-level failures', async () => {
    let n = 0;
    const fetchImpl = (async () => {
      n++;
      if (n < 3) throw new Error('ECONNRESET');
      return new Response('{"v":2}', { status: 200 });
    }) as unknown as typeof fetch;
    expect(await fetchJson('https://example.com/x', { fetchImpl, sleep: noSleep })).toEqual({
      v: 2,
    });
  });

  it('redacts query strings from logged URLs', () => {
    expect(redactUrl('https://example.com/api?secret=x&b=2')).toBe('https://example.com/api');
    expect(redactUrl('::::')).toBe('[url inválida]');
  });

  it('HttpError carries retryability', () => {
    expect(new HttpError('x', 500, true).retryable).toBe(true);
    expect(new HttpError('x', 400, false).retryable).toBe(false);
  });
});
