/**
 * WMO weather interpretation codes (WW) → concise Spanish labels and local
 * icon identifiers. Reference: https://open-meteo.com/en/docs
 */
export interface WeatherCodeInfo {
  labelEs: string;
  /** Icon id resolved by src/render/icons.ts; `-day`/`-night` suffix applied later where relevant. */
  icon:
    | 'clear'
    | 'partly-cloudy'
    | 'cloudy'
    | 'fog'
    | 'drizzle'
    | 'rain'
    | 'heavy-rain'
    | 'thunderstorm'
    | 'snow'
    | 'unknown';
}

const WMO: Record<number, WeatherCodeInfo> = {
  0: { labelEs: 'DESPEJADO', icon: 'clear' },
  1: { labelEs: 'MAYORM. DESPEJADO', icon: 'clear' },
  2: { labelEs: 'PARCIAL NUBLADO', icon: 'partly-cloudy' },
  3: { labelEs: 'NUBLADO', icon: 'cloudy' },
  45: { labelEs: 'NIEBLA', icon: 'fog' },
  48: { labelEs: 'NIEBLA ESCARCHADA', icon: 'fog' },
  51: { labelEs: 'LLOVIZNA LEVE', icon: 'drizzle' },
  53: { labelEs: 'LLOVIZNA', icon: 'drizzle' },
  55: { labelEs: 'LLOVIZNA INTENSA', icon: 'drizzle' },
  56: { labelEs: 'LLOVIZNA HELADA', icon: 'drizzle' },
  57: { labelEs: 'LLOVIZNA HELADA', icon: 'drizzle' },
  61: { labelEs: 'LLUVIA LEVE', icon: 'rain' },
  63: { labelEs: 'LLUVIA', icon: 'rain' },
  65: { labelEs: 'LLUVIA INTENSA', icon: 'heavy-rain' },
  66: { labelEs: 'LLUVIA HELADA', icon: 'rain' },
  67: { labelEs: 'LLUVIA HELADA FUERTE', icon: 'heavy-rain' },
  71: { labelEs: 'NEVADA LEVE', icon: 'snow' },
  73: { labelEs: 'NEVADA', icon: 'snow' },
  75: { labelEs: 'NEVADA INTENSA', icon: 'snow' },
  77: { labelEs: 'GRANOS DE NIEVE', icon: 'snow' },
  80: { labelEs: 'CHUBASCOS LEVES', icon: 'rain' },
  81: { labelEs: 'CHUBASCOS', icon: 'rain' },
  82: { labelEs: 'CHUBASCOS FUERTES', icon: 'heavy-rain' },
  85: { labelEs: 'CHUBASCOS DE NIEVE', icon: 'snow' },
  86: { labelEs: 'CHUBASCOS DE NIEVE', icon: 'snow' },
  95: { labelEs: 'TORMENTA', icon: 'thunderstorm' },
  96: { labelEs: 'TORMENTA C/ GRANIZO', icon: 'thunderstorm' },
  99: { labelEs: 'TORMENTA C/ GRANIZO', icon: 'thunderstorm' },
};

export function describeWeatherCode(code: number | null): WeatherCodeInfo {
  if (code === null || !(code in WMO)) {
    return { labelEs: 'SIN DATOS', icon: 'unknown' };
  }
  return WMO[code] as WeatherCodeInfo;
}

/** Resolves the final icon id, using day/night variants for clear skies. */
export function resolveIconId(code: number | null, isDay: boolean): string {
  const { icon } = describeWeatherCode(code);
  if (icon === 'clear') return isDay ? 'clear-day' : 'clear-night';
  if (icon === 'partly-cloudy') return isDay ? 'partly-cloudy-day' : 'partly-cloudy-night';
  return icon;
}
