import { describe, expect, it } from 'vitest';
import { classifyFreshness, classifyOfficialFreshness } from '../src/domain/freshness.js';

const at = (iso: string): Date => new Date(iso);

describe('freshness boundaries', () => {
  const now = at('2026-08-08T18:00:00Z');

  it('weather: live <= 30 min, cached <= 2 h, stale beyond', () => {
    expect(classifyFreshness('weather', '2026-08-08T17:31:00Z', now)).toBe('live');
    expect(classifyFreshness('weather', '2026-08-08T17:30:00Z', now)).toBe('live');
    expect(classifyFreshness('weather', '2026-08-08T17:29:59Z', now)).toBe('cached');
    expect(classifyFreshness('weather', '2026-08-08T16:00:00Z', now)).toBe('cached');
    expect(classifyFreshness('weather', '2026-08-08T15:59:59Z', now)).toBe('stale');
  });

  it('p2p: live <= 10 min, cached <= 30 min, stale beyond', () => {
    expect(classifyFreshness('p2p', '2026-08-08T17:50:00Z', now)).toBe('live');
    expect(classifyFreshness('p2p', '2026-08-08T17:49:59Z', now)).toBe('cached');
    expect(classifyFreshness('p2p', '2026-08-08T17:30:00Z', now)).toBe('cached');
    expect(classifyFreshness('p2p', '2026-08-08T17:29:59Z', now)).toBe('stale');
  });

  it('missing or invalid timestamps are unavailable', () => {
    expect(classifyFreshness('weather', null, now)).toBe('unavailable');
    expect(classifyFreshness('weather', 'no-es-fecha', now)).toBe('unavailable');
  });

  it('official rate survives a weekend as cached and goes stale after 72 h', () => {
    // Friday publication, checked Sunday: cached, still displayed.
    const sunday = at('2026-08-09T18:00:00Z');
    expect(classifyOfficialFreshness('2026-08-07', null, sunday)).toBe('cached');
    // Checked within the same day: live.
    expect(classifyOfficialFreshness('2026-08-07', null, at('2026-08-07T20:00:00Z'))).toBe('live');
    // 72+ hours: stale but classifiable (value still renders).
    expect(classifyOfficialFreshness('2026-08-04', null, sunday)).toBe('stale');
    // updatedAt takes precedence over fecha.
    expect(classifyOfficialFreshness('2026-08-01', '2026-08-08T12:00:00-04:00', sunday)).toBe(
      'cached',
    );
    expect(classifyOfficialFreshness(null, null, sunday)).toBe('unavailable');
  });
});
