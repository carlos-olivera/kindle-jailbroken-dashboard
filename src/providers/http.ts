const USER_AGENT = 'kindle-bolivia-dashboard/1.0 (personal e-ink display; contact: local)';

export interface HttpOptions {
  timeoutMs?: number;
  retries?: number;
  headers?: Record<string, string>;
  /** Injectable for tests. */
  fetchImpl?: typeof fetch;
  /** Injectable for tests; sleep between retries. */
  sleep?: (ms: number) => Promise<void>;
}

export class HttpError extends Error {
  constructor(
    message: string,
    readonly status: number | null,
    readonly retryable: boolean,
  ) {
    super(message);
    this.name = 'HttpError';
  }
}

const defaultSleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

function backoffMs(attempt: number): number {
  const base = 500 * 2 ** attempt;
  return base + Math.random() * base * 0.5;
}

/**
 * GET a URL and parse JSON with: descriptive user agent, timeout (default
 * 8 s), up to `retries` retries (default 2) for transient failures
 * (network errors, 5xx, 429) with exponential backoff and jitter.
 * Ordinary 4xx and JSON parse failures are not retried.
 */
export async function fetchJson(url: URL | string, options: HttpOptions = {}): Promise<unknown> {
  const {
    timeoutMs = 8000,
    retries = 2,
    headers = {},
    fetchImpl = fetch,
    sleep = defaultSleep,
  } = options;

  let lastError: Error = new HttpError('sin intentos', null, false);
  for (let attempt = 0; attempt <= retries; attempt++) {
    if (attempt > 0) await sleep(backoffMs(attempt - 1));
    try {
      const res = await fetchImpl(url, {
        headers: { 'user-agent': USER_AGENT, accept: 'application/json', ...headers },
        signal: AbortSignal.timeout(timeoutMs),
        redirect: 'follow',
      });
      if (!res.ok) {
        const retryable = res.status >= 500 || res.status === 429;
        lastError = new HttpError(`HTTP ${res.status} en ${redactUrl(url)}`, res.status, retryable);
        if (!retryable) throw lastError;
        continue;
      }
      try {
        return (await res.json()) as unknown;
      } catch {
        throw new HttpError(`respuesta no-JSON de ${redactUrl(url)}`, res.status, false);
      }
    } catch (err) {
      if (err instanceof HttpError) {
        if (!err.retryable) throw err;
        lastError = err;
        continue;
      }
      // Network-level failure or timeout: retryable.
      lastError = new HttpError(
        `fallo de red en ${redactUrl(url)}: ${err instanceof Error ? err.message : String(err)}`,
        null,
        true,
      );
    }
  }
  throw lastError;
}

/** Strips query strings so logs never leak parameters. */
export function redactUrl(url: URL | string): string {
  try {
    const u = new URL(String(url));
    return `${u.origin}${u.pathname}`;
  } catch {
    return '[url inválida]';
  }
}
