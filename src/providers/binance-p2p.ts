import { z } from 'zod';
import { fetchJson, type HttpOptions } from './http.js';
import type { P2pMethod, P2pRateDatum } from '../domain/dashboard.js';

export const BINANCE_QUOTE_URL =
  'https://www.binance.com/bapi/c2c/v1/public/c2c/agent/quote-price?fiat=BOB&asset=USDT&tradeType=BUY';
export const BINANCE_ADLIST_URL =
  'https://www.binance.com/bapi/c2c/v1/public/c2c/agent/ad-list?fiat=BOB&asset=USDT&tradeType=BUY&limit=10&order=ASC';

export const binanceQuoteSchema = z.object({
  code: z.string(),
  data: z.object({
    asset: z.string(),
    fiat: z.string(),
    price: z.number().finite().positive(),
  }),
});

const adSchema = z.object({
  price: z.union([z.number(), z.string()]),
  minTransAmount: z.union([z.number(), z.string()]).optional(),
  maxTransAmount: z.union([z.number(), z.string()]).optional(),
  isMerchantAd: z.boolean().optional(),
  merchantCheck: z.boolean().optional(),
});

export const binanceAdListSchema = z.object({
  code: z.string(),
  data: z.array(z.unknown()),
});

export interface NormalizedAd {
  price: number;
  minTransAmount: number | null;
  maxTransAmount: number | null;
  isMerchant: boolean;
}

function toFiniteNumber(v: number | string | undefined): number | null {
  if (v === undefined) return null;
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

/** Keeps only structurally valid ads with positive finite prices. */
export function normalizeAds(items: unknown[]): NormalizedAd[] {
  const out: NormalizedAd[] = [];
  for (const item of items) {
    const parsed = adSchema.safeParse(item);
    if (!parsed.success) continue;
    const price = toFiniteNumber(parsed.data.price);
    if (price === null || price <= 0) continue;
    out.push({
      price,
      minTransAmount: toFiniteNumber(parsed.data.minTransAmount),
      maxTransAmount: toFiniteNumber(parsed.data.maxTransAmount),
      isMerchant: parsed.data.isMerchantAd ?? parsed.data.merchantCheck ?? false,
    });
  }
  return out;
}

/** Median of a non-empty list. Averages the middle pair for even lengths. */
export function median(values: number[]): number {
  if (values.length === 0) throw new Error('median of empty list');
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) return sorted[mid] as number;
  return ((sorted[mid - 1] as number) + (sorted[mid] as number)) / 2;
}

export interface AdListQuote {
  price: number;
  method: Extract<P2pMethod, 'ad-list median' | 'ad-list unfiltered median'>;
}

/**
 * Derives a price from an ad list:
 * 1. Prefer ads whose min/max range covers the notional.
 * 2. Within the eligible set, prefer merchant ads when there are >= 3.
 * 3. Median of up to the first five ads of the chosen set.
 * 4. With no notional-eligible ads, fall back to all valid ads and mark it.
 */
export function quoteFromAds(ads: NormalizedAd[], notionalBob: number): AdListQuote | null {
  if (ads.length === 0) return null;

  const eligible = ads.filter(
    (ad) =>
      (ad.minTransAmount === null || notionalBob >= ad.minTransAmount) &&
      (ad.maxTransAmount === null || notionalBob <= ad.maxTransAmount),
  );

  if (eligible.length > 0) {
    const merchants = eligible.filter((ad) => ad.isMerchant);
    const pool = merchants.length >= 3 ? merchants : eligible;
    return { price: median(pool.slice(0, 5).map((a) => a.price)), method: 'ad-list median' };
  }

  return {
    price: median(ads.slice(0, 5).map((a) => a.price)),
    method: 'ad-list unfiltered median',
  };
}

export interface P2pProvider {
  name: string;
  fetch(notionalBob: number, http: HttpOptions, now: () => Date): Promise<P2pRateDatum>;
}

/** Primary provider: the public quote-price endpoint. */
export const quotePriceProvider: P2pProvider = {
  name: 'quote-price',
  async fetch(notionalBob, http, now): Promise<P2pRateDatum> {
    const payload = await fetchJson(new URL(BINANCE_QUOTE_URL), http);
    const data = binanceQuoteSchema.parse(payload);
    if (data.code !== '000000') throw new Error(`binance quote-price code ${data.code}`);
    if (data.data.asset !== 'USDT' || data.data.fiat !== 'BOB') {
      throw new Error(`binance quote-price par inesperado ${data.data.asset}/${data.data.fiat}`);
    }
    return {
      pair: 'USDT/BOB',
      side: 'BUY',
      price: data.data.price,
      notionalBob,
      method: 'quote-price',
      observedAt: now().toISOString(),
      status: 'live',
    };
  },
};

/** Fallback provider: median over the public ad list. */
export const adListProvider: P2pProvider = {
  name: 'ad-list',
  async fetch(notionalBob, http, now): Promise<P2pRateDatum> {
    const payload = await fetchJson(new URL(BINANCE_ADLIST_URL), http);
    const data = binanceAdListSchema.parse(payload);
    if (data.code !== '000000') throw new Error(`binance ad-list code ${data.code}`);
    const quote = quoteFromAds(normalizeAds(data.data), notionalBob);
    if (quote === null) throw new Error('binance ad-list sin avisos válidos');
    return {
      pair: 'USDT/BOB',
      side: 'BUY',
      price: quote.price,
      notionalBob,
      method: quote.method,
      observedAt: now().toISOString(),
      status: 'live',
    };
  },
};

/** Tries providers in order; the first success wins. */
export async function fetchP2pRate(
  notionalBob: number,
  http: HttpOptions = {},
  now: () => Date = () => new Date(),
  providers: P2pProvider[] = [quotePriceProvider, adListProvider],
): Promise<P2pRateDatum> {
  let lastError: unknown = new Error('sin proveedores P2P');
  for (const provider of providers) {
    try {
      return await provider.fetch(notionalBob, http, now);
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}
