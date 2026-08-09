import type { DashboardSnapshot } from '../domain/dashboard.js';

/** Fixed instant used by demo mode: 2026-08-08 14:24 America/La_Paz (UTC-4). */
export const DEMO_NOW = new Date('2026-08-08T18:24:00.000Z');

/**
 * Polished, obviously-synthetic snapshot for offline demo rendering. These
 * values exist only for the preview; live mode never reads them.
 */
export function demoSnapshot(): DashboardSnapshot {
  return {
    generatedAt: DEMO_NOW.toISOString(),
    timezone: 'America/La_Paz',
    weather: {
      temperatureC: 29.4,
      apparentTemperatureC: 31.2,
      humidityPercent: 62,
      windKmh: 14,
      weatherCode: 2,
      isDay: true,
      conditionEs: 'PARCIAL NUBLADO',
      iconId: 'partly-cloudy-day',
      observedAt: new Date(DEMO_NOW.getTime() - 6 * 60_000).toISOString(),
      status: 'live',
    },
    officialRate: {
      pair: 'USD/BOB',
      buy: 11.86,
      sell: 12.07,
      effectiveDate: '2026-08-06',
      updatedAt: new Date(DEMO_NOW.getTime() - 30 * 60 * 60_000).toISOString(),
      status: 'cached',
    },
    p2pRate: {
      pair: 'USDT/BOB',
      side: 'BUY',
      price: 13.14,
      notionalBob: 1000,
      method: 'quote-price',
      observedAt: new Date(DEMO_NOW.getTime() - 60_000).toISOString(),
      status: 'live',
    },
  };
}
