import type { DatumStatus } from './dashboard.js';

/** Freshness windows per source, in milliseconds. */
export const FRESHNESS = {
  weather: { liveMs: 30 * 60_000, staleMs: 2 * 60 * 60_000 },
  p2p: { liveMs: 10 * 60_000, staleMs: 30 * 60_000 },
  official: { liveMs: 24 * 60 * 60_000, staleMs: 72 * 60 * 60_000 },
} as const;

export type SourceKind = keyof typeof FRESHNESS;

/**
 * Classifies an observation by age. `observedAt` is when the value was
 * obtained; `now` is the evaluation time. Returns:
 *  - live: within the live window
 *  - cached: past live but within the stale window (still trustworthy)
 *  - stale: past the stale window (shown, but visibly old)
 *  - unavailable: no observation at all or unparseable timestamp
 */
export function classifyFreshness(
  kind: SourceKind,
  observedAt: string | null,
  now: Date,
): DatumStatus {
  if (observedAt === null) return 'unavailable';
  const t = Date.parse(observedAt);
  if (Number.isNaN(t)) return 'unavailable';
  const age = now.getTime() - t;
  const { liveMs, staleMs } = FRESHNESS[kind];
  if (age <= liveMs) return 'live';
  if (age <= staleMs) return 'cached';
  return 'stale';
}

/**
 * The official BCB rate has an effective date rather than a fetch timestamp;
 * it stays valid through weekends/holidays. We treat it as `live` while the
 * effective date is at most `liveMs` old, `cached` up to `staleMs` (72 h),
 * and `stale` beyond — but the last-known value keeps rendering.
 */
export function classifyOfficialFreshness(
  effectiveDate: string | null,
  updatedAt: string | null,
  now: Date,
): DatumStatus {
  const ref = updatedAt ?? (effectiveDate !== null ? `${effectiveDate}T12:00:00-04:00` : null);
  return classifyFreshness('official', ref, now);
}
