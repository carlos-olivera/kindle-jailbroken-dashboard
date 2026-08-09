export type DatumStatus = 'live' | 'cached' | 'stale' | 'unavailable';

export interface WeatherDatum {
  temperatureC: number | null;
  apparentTemperatureC: number | null;
  humidityPercent: number | null;
  windKmh: number | null;
  weatherCode: number | null;
  isDay: boolean;
  conditionEs: string;
  iconId: string;
  observedAt: string | null;
  status: DatumStatus;
}

export interface OfficialRateDatum {
  pair: 'USD/BOB';
  buy: number | null;
  sell: number | null;
  effectiveDate: string | null;
  updatedAt: string | null;
  status: DatumStatus;
}

export type P2pMethod = 'quote-price' | 'ad-list median' | 'ad-list unfiltered median';

export interface P2pRateDatum {
  pair: 'USDT/BOB';
  side: 'BUY';
  price: number | null;
  notionalBob: number;
  method: P2pMethod | null;
  observedAt: string | null;
  status: DatumStatus;
}

export interface DashboardSnapshot {
  generatedAt: string;
  timezone: 'America/La_Paz';
  weather: WeatherDatum;
  officialRate: OfficialRateDatum;
  p2pRate: P2pRateDatum;
}

export function emptyWeather(): WeatherDatum {
  return {
    temperatureC: null,
    apparentTemperatureC: null,
    humidityPercent: null,
    windKmh: null,
    weatherCode: null,
    isDay: true,
    conditionEs: 'SIN DATOS',
    iconId: 'unknown',
    observedAt: null,
    status: 'unavailable',
  };
}

export function emptyOfficialRate(): OfficialRateDatum {
  return {
    pair: 'USD/BOB',
    buy: null,
    sell: null,
    effectiveDate: null,
    updatedAt: null,
    status: 'unavailable',
  };
}

export function emptyP2pRate(notionalBob: number): P2pRateDatum {
  return {
    pair: 'USDT/BOB',
    side: 'BUY',
    price: null,
    notionalBob,
    method: null,
    observedAt: null,
    status: 'unavailable',
  };
}
