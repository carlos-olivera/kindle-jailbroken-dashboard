import type { Logger } from 'pino';
import type { AppConfig } from '../config.js';
import type {
  DashboardSnapshot,
  OfficialRateDatum,
  P2pRateDatum,
  WeatherDatum,
} from './dashboard.js';
import { emptyOfficialRate, emptyP2pRate, emptyWeather } from './dashboard.js';
import { classifyFreshness, classifyOfficialFreshness } from './freshness.js';
import { LastKnownGoodCache } from '../cache/last-known-good.js';
import { fetchWeather } from '../providers/weather.js';
import { fetchOfficialRate } from '../providers/official-rate.js';
import { fetchP2pRate } from '../providers/binance-p2p.js';

/**
 * Fetches the three sources concurrently, merges each with the last-known-good
 * cache, reclassifies freshness, and persists the merged result. A provider
 * failure degrades only its own card.
 */
export async function buildSnapshot(
  config: AppConfig,
  logger: Logger,
  now: Date = new Date(),
): Promise<DashboardSnapshot> {
  const cache = new LastKnownGoodCache(config.cacheFile);
  const previous = await cache.read();
  const http = { timeoutMs: config.httpTimeoutMs };

  const [weatherResult, officialResult, p2pResult] = await Promise.allSettled([
    fetchWeather(config.latitude, config.longitude, http, () => now),
    fetchOfficialRate(http),
    fetchP2pRate(config.binanceP2pNotionalBob, http, () => now),
  ]);

  let weather: WeatherDatum;
  if (weatherResult.status === 'fulfilled') {
    weather = weatherResult.value;
  } else {
    logger.warn({ err: String(weatherResult.reason) }, 'clima: usando último valor conocido');
    weather = previous.weather ?? emptyWeather();
  }
  if (weather.observedAt !== null) {
    const status = classifyFreshness('weather', weather.observedAt, now);
    weather = { ...weather, status };
    if (status === 'unavailable') weather = emptyWeather();
  }

  let officialRate: OfficialRateDatum;
  if (officialResult.status === 'fulfilled') {
    officialRate = officialResult.value;
  } else {
    logger.warn(
      { err: String(officialResult.reason) },
      'tipo oficial: usando último valor conocido',
    );
    officialRate = previous.officialRate ?? emptyOfficialRate();
  }
  if (officialRate.buy !== null) {
    officialRate = {
      ...officialRate,
      status: classifyOfficialFreshness(officialRate.effectiveDate, officialRate.updatedAt, now),
    };
  }

  let p2pRate: P2pRateDatum;
  if (p2pResult.status === 'fulfilled') {
    p2pRate = p2pResult.value;
  } else {
    logger.warn({ err: String(p2pResult.reason) }, 'binance p2p: usando último valor conocido');
    p2pRate = previous.p2pRate ?? emptyP2pRate(config.binanceP2pNotionalBob);
  }
  if (p2pRate.observedAt !== null) {
    const status = classifyFreshness('p2p', p2pRate.observedAt, now);
    p2pRate = { ...p2pRate, status };
    if (status === 'unavailable') p2pRate = emptyP2pRate(config.binanceP2pNotionalBob);
  }

  const snapshot: DashboardSnapshot = {
    generatedAt: now.toISOString(),
    timezone: 'America/La_Paz',
    weather,
    officialRate,
    p2pRate,
  };

  // Persist only presentable data so a corrupted run can't poison the cache.
  await cache.write({
    ...(weather.observedAt !== null ? { weather } : {}),
    ...(officialRate.buy !== null ? { officialRate } : {}),
    ...(p2pRate.observedAt !== null ? { p2pRate } : {}),
  });

  return snapshot;
}
