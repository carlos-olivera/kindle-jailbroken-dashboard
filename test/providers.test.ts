import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { normalizeCucuOficial } from '../src/providers/official-rate.js';
import { normalizeOpenMeteo, buildOpenMeteoUrl } from '../src/providers/weather.js';
import {
  binanceQuoteSchema,
  normalizeAds,
  binanceAdListSchema,
  quoteFromAds,
  median,
  fetchP2pRate,
  quotePriceProvider,
  adListProvider,
} from '../src/providers/binance-p2p.js';

const fixture = (name: string): unknown =>
  JSON.parse(readFileSync(new URL(`./fixtures/${name}`, import.meta.url), 'utf8'));

describe('CUCU official rate', () => {
  it('parses the confirmed response shape', () => {
    const datum = normalizeCucuOficial(fixture('cucu-oficial.json'));
    expect(datum.pair).toBe('USD/BOB');
    expect(datum.buy).toBe(11.86);
    expect(datum.sell).toBe(12.07);
    expect(datum.effectiveDate).toBe('2026-08-06');
    expect(datum.updatedAt).toBe('2026-08-06T12:00:00-04:00');
    expect(datum.status).toBe('live');
  });

  it('rejects invalid responses instead of rendering 0.00', () => {
    expect(() => normalizeCucuOficial({})).toThrow();
    expect(() =>
      normalizeCucuOficial({
        tc_oficial: { compra: 0, venta: 12, moneda: 'USD/BOB', fecha: '2026-08-06' },
      }),
    ).toThrow();
    expect(() =>
      normalizeCucuOficial({
        tc_oficial: { compra: 'x', venta: 12, moneda: 'USD/BOB', fecha: '2026-08-06' },
      }),
    ).toThrow();
    expect(() =>
      normalizeCucuOficial({
        tc_oficial: { compra: 11.86, venta: 12.07, moneda: 'USD/BOB', fecha: '06/08/2026' },
      }),
    ).toThrow();
  });
});

describe('Open-Meteo weather', () => {
  it('builds the URL with URLSearchParams', () => {
    const url = buildOpenMeteoUrl(-17.7833, -63.1821);
    expect(url.origin + url.pathname).toBe('https://api.open-meteo.com/v1/forecast');
    expect(url.searchParams.get('latitude')).toBe('-17.7833');
    expect(url.searchParams.get('timezone')).toBe('America/La_Paz');
    expect(url.searchParams.get('current')).toContain('weather_code');
  });

  it('parses the current object', () => {
    const fetchedAt = new Date('2026-08-08T18:20:00Z');
    const datum = normalizeOpenMeteo(fixture('open-meteo.json'), fetchedAt);
    expect(datum.temperatureC).toBe(29.4);
    expect(datum.apparentTemperatureC).toBe(31.2);
    expect(datum.humidityPercent).toBe(62);
    expect(datum.windKmh).toBe(14.2);
    expect(datum.weatherCode).toBe(2);
    expect(datum.conditionEs).toBe('PARCIAL NUBLADO');
    expect(datum.iconId).toBe('partly-cloudy-day');
    expect(datum.observedAt).toBe(fetchedAt.toISOString());
  });

  it('rejects malformed payloads', () => {
    expect(() => normalizeOpenMeteo({ current: { time: 'x' } }, new Date())).toThrow();
    expect(() => normalizeOpenMeteo({}, new Date())).toThrow();
  });
});

describe('Binance quote-price', () => {
  it('parses the confirmed response shape', () => {
    const parsed = binanceQuoteSchema.parse(fixture('binance-quote.json'));
    expect(parsed.data.price).toBe(13.14);
    expect(parsed.data.asset).toBe('USDT');
    expect(parsed.data.fiat).toBe('BOB');
  });

  it('rejects zero or negative prices', () => {
    expect(() =>
      binanceQuoteSchema.parse({ code: '000000', data: { asset: 'USDT', fiat: 'BOB', price: 0 } }),
    ).toThrow();
    expect(() =>
      binanceQuoteSchema.parse({ code: '000000', data: { asset: 'USDT', fiat: 'BOB', price: -1 } }),
    ).toThrow();
  });

  it('labels the result as USDT/BOB BUY, never official USD', async () => {
    const fetchImpl = (async () =>
      new Response(JSON.stringify(fixture('binance-quote.json')), {
        status: 200,
      })) as unknown as typeof fetch;
    const datum = await quotePriceProvider.fetch(
      1000,
      { fetchImpl },
      () => new Date('2026-08-08T18:23:00Z'),
    );
    expect(datum.pair).toBe('USDT/BOB');
    expect(datum.side).toBe('BUY');
    expect(datum.method).toBe('quote-price');
    expect(datum.price).toBe(13.14);
  });
});

describe('Binance ad-list fallback', () => {
  const ads = normalizeAds(
    (binanceAdListSchema.parse(fixture('binance-adlist.json')) as { data: unknown[] }).data,
  );

  it('drops malformed and non-positive prices', () => {
    expect(ads).toHaveLength(6);
    expect(ads.every((a) => a.price > 0)).toBe(true);
  });

  it('median: odd length', () => {
    expect(median([3, 1, 2])).toBe(2);
  });

  it('median: even length averages the middle pair', () => {
    expect(median([1, 2, 3, 4])).toBe(2.5);
  });

  it('median: empty throws', () => {
    expect(() => median([])).toThrow();
  });

  it('prefers ads covering the notional and merchants when enough', () => {
    const quote = quoteFromAds(ads, 1000);
    // Eligible for 1000 BOB: 13.05, 13.10, 13.12 (merchants), 13.18 (no merchant).
    // >= 3 merchants -> merchant pool -> median(13.05, 13.10, 13.12) = 13.10.
    expect(quote).toEqual({ price: 13.1, method: 'ad-list median' });
  });

  it('falls back to all valid ads when no ad covers the notional', () => {
    const quote = quoteFromAds(ads, 999999);
    expect(quote?.method).toBe('ad-list unfiltered median');
    // First five valid ads: 13.05..13.25 -> median 13.12.
    expect(quote?.price).toBe(13.12);
  });

  it('returns null with no valid ads', () => {
    expect(quoteFromAds([], 1000)).toBeNull();
    expect(quoteFromAds(normalizeAds([{ price: 'NaN' }, { price: -2 }]), 1000)).toBeNull();
  });

  it('marks the ad-list method in the datum', async () => {
    const fetchImpl = (async () =>
      new Response(JSON.stringify(fixture('binance-adlist.json')), {
        status: 200,
      })) as unknown as typeof fetch;
    const datum = await adListProvider.fetch(1000, { fetchImpl }, () => new Date());
    expect(datum.method).toBe('ad-list median');
    expect(datum.pair).toBe('USDT/BOB');
  });
});

describe('P2P provider chain', () => {
  it('falls back to ad-list when quote-price fails', async () => {
    let call = 0;
    const fetchImpl = (async (url: URL | string) => {
      call++;
      if (String(url).includes('quote-price')) return new Response('oops', { status: 404 });
      return new Response(JSON.stringify(fixture('binance-adlist.json')), { status: 200 });
    }) as unknown as typeof fetch;
    const datum = await fetchP2pRate(1000, { fetchImpl, retries: 0 }, () => new Date());
    expect(datum.method).toBe('ad-list median');
    expect(call).toBeGreaterThanOrEqual(2);
  });

  it('propagates failure when all providers fail', async () => {
    const fetchImpl = (async () =>
      new Response('down', { status: 500 })) as unknown as typeof fetch;
    await expect(
      fetchP2pRate(1000, { fetchImpl, retries: 0, sleep: async () => undefined }),
    ).rejects.toThrow();
  });
});
