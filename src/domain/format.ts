const TIMEZONE = 'America/La_Paz';

/** `HH:mm` 24-hour time in America/La_Paz. */
export function formatClock(now: Date): { hh: string; mm: string } {
  const parts = new Intl.DateTimeFormat('es-BO', {
    timeZone: TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(now);
  const get = (type: string): string => parts.find((p) => p.type === type)?.value ?? '00';
  // Some ICU builds render midnight as "24"; normalize to "00".
  const hh = get('hour') === '24' ? '00' : get('hour');
  return { hh, mm: get('minute') };
}

/** Compact uppercase Spanish date, e.g. `SÁBADO 08 AGO 2026`. */
export function formatDateEs(now: Date): string {
  const parts = new Intl.DateTimeFormat('es-BO', {
    timeZone: TIMEZONE,
    weekday: 'long',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).formatToParts(now);
  const get = (type: string): string => parts.find((p) => p.type === type)?.value ?? '';
  const month = get('month').replace(/\./g, '').slice(0, 3);
  return `${get('weekday')} ${get('day')} ${month} ${get('year')}`.toUpperCase();
}

/** Short `HH:mm` from an ISO timestamp, in La Paz time. Returns null on bad input. */
export function formatTimeHm(iso: string | null): string | null {
  if (iso === null) return null;
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return null;
  const { hh, mm } = formatClock(new Date(t));
  return `${hh}:${mm}`;
}

/** `06 AGO` style short date from `YYYY-MM-DD` or ISO input. */
export function formatShortDateEs(isoDate: string | null): string | null {
  if (isoDate === null) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(isoDate);
  if (!m) return null;
  // Noon offset keeps the calendar date stable in the La Paz timezone.
  const d = new Date(`${m[1]}-${m[2]}-${m[3]}T12:00:00-04:00`);
  if (Number.isNaN(d.getTime())) return null;
  const parts = new Intl.DateTimeFormat('es-BO', {
    timeZone: TIMEZONE,
    day: '2-digit',
    month: 'short',
  }).formatToParts(d);
  const get = (type: string): string => parts.find((p) => p.type === type)?.value ?? '';
  return `${get('day')} ${get('month').replace(/\./g, '').slice(0, 3)}`.toUpperCase();
}

/**
 * Deterministic currency formatting with a decimal comma: `11,86`.
 * Not locale-driven so tests are stable across ICU versions.
 */
export function formatBob(value: number | null, decimals = 2): string {
  if (value === null || !Number.isFinite(value)) return '—';
  const fixed = value.toFixed(decimals);
  const [intPart = '0', fracPart = ''] = fixed.split('.');
  const grouped = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return fracPart.length > 0 ? `${grouped},${fracPart}` : grouped;
}

/** Signed percentage with decimal comma: `+6,1%`, `-3,0%`, `0,0%`. */
export function formatPercent(value: number | null, decimals = 1): string {
  if (value === null || !Number.isFinite(value)) return '—';
  const sign = value > 0 ? '+' : value < 0 ? '-' : '';
  return `${sign}${Math.abs(value).toFixed(decimals).replace('.', ',')}%`;
}

/** Rounded temperature label: `29°`. */
export function formatTemperature(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return '—';
  return `${Math.round(value)}°`;
}
