import { z } from 'zod';
import { fetchJson, type HttpOptions } from './http.js';
import { describeWeatherCode, resolveIconId } from './weather-codes.js';
import type { WeatherDatum } from '../domain/dashboard.js';

export const openMeteoSchema = z.object({
  current: z.object({
    time: z.string(),
    temperature_2m: z.number().finite(),
    apparent_temperature: z.number().finite(),
    weather_code: z.number().int(),
    is_day: z.union([z.literal(0), z.literal(1)]),
    relative_humidity_2m: z.number().finite(),
    wind_speed_10m: z.number().finite(),
  }),
  utc_offset_seconds: z.number().optional(),
});

export function buildOpenMeteoUrl(latitude: number, longitude: number): URL {
  const url = new URL('https://api.open-meteo.com/v1/forecast');
  url.search = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
    current:
      'temperature_2m,apparent_temperature,weather_code,is_day,relative_humidity_2m,wind_speed_10m',
    timezone: 'America/La_Paz',
  }).toString();
  return url;
}

/** Parses a validated Open-Meteo payload into the normalized weather datum. */
export function normalizeOpenMeteo(payload: unknown, fetchedAt: Date): WeatherDatum {
  const data = openMeteoSchema.parse(payload);
  const c = data.current;
  const isDay = c.is_day === 1;
  // `current.time` is timezone-local without an offset; the fetch time is the
  // trustworthy freshness reference.
  return {
    temperatureC: c.temperature_2m,
    apparentTemperatureC: c.apparent_temperature,
    humidityPercent: c.relative_humidity_2m,
    windKmh: c.wind_speed_10m,
    weatherCode: c.weather_code,
    isDay,
    conditionEs: describeWeatherCode(c.weather_code).labelEs,
    iconId: resolveIconId(c.weather_code, isDay),
    observedAt: fetchedAt.toISOString(),
    status: 'live',
  };
}

export async function fetchWeather(
  latitude: number,
  longitude: number,
  http: HttpOptions = {},
  now: () => Date = () => new Date(),
): Promise<WeatherDatum> {
  const payload = await fetchJson(buildOpenMeteoUrl(latitude, longitude), http);
  return normalizeOpenMeteo(payload, now());
}
