import { describe, expect, it } from 'vitest';
import {
  formatBob,
  formatClock,
  formatDateEs,
  formatPercent,
  formatShortDateEs,
  formatTemperature,
  formatTimeHm,
} from '../src/domain/format.js';

describe('clock and date in America/La_Paz', () => {
  it('formats HH:mm in 24-hour clock', () => {
    // 18:24 UTC == 14:24 La Paz (UTC-4, no DST).
    expect(formatClock(new Date('2026-08-08T18:24:00Z'))).toEqual({ hh: '14', mm: '24' });
  });

  it('handles midnight boundaries without manual offset math', () => {
    // 03:59 UTC == 23:59 La Paz previous day.
    expect(formatClock(new Date('2026-08-09T03:59:00Z'))).toEqual({ hh: '23', mm: '59' });
    expect(formatDateEs(new Date('2026-08-09T03:59:00Z'))).toContain('08 AGO');
    // 04:00 UTC == 00:00 La Paz -> date flips.
    expect(formatClock(new Date('2026-08-09T04:00:00Z'))).toEqual({ hh: '00', mm: '00' });
    expect(formatDateEs(new Date('2026-08-09T04:00:00Z'))).toContain('09 AGO');
  });

  it('renders the compact Spanish date', () => {
    expect(formatDateEs(new Date('2026-08-08T18:24:00Z'))).toBe('SÁBADO 08 AGO 2026');
  });

  it('formatTimeHm handles ISO input and rejects garbage', () => {
    expect(formatTimeHm('2026-08-08T18:23:00Z')).toBe('14:23');
    expect(formatTimeHm(null)).toBeNull();
    expect(formatTimeHm('nope')).toBeNull();
  });

  it('formatShortDateEs is stable regardless of host timezone', () => {
    expect(formatShortDateEs('2026-08-06')).toBe('06 AGO');
    expect(formatShortDateEs('2026-01-01')).toBe('01 ENE');
    expect(formatShortDateEs(null)).toBeNull();
    expect(formatShortDateEs('06/08/2026')).toBeNull();
  });
});

describe('deterministic currency formatting', () => {
  it('two decimals with decimal comma', () => {
    expect(formatBob(11.86)).toBe('11,86');
    expect(formatBob(13.1)).toBe('13,10');
    expect(formatBob(1234.5)).toBe('1.234,50');
  });

  it('never renders missing values as 0,00', () => {
    expect(formatBob(null)).toBe('—');
    expect(formatBob(Number.NaN)).toBe('—');
    expect(formatBob(Number.POSITIVE_INFINITY)).toBe('—');
  });

  it('percent with sign', () => {
    expect(formatPercent(10.79)).toBe('+10,8%');
    expect(formatPercent(-3.04)).toBe('-3,0%');
    expect(formatPercent(0)).toBe('0,0%');
    expect(formatPercent(null)).toBe('—');
  });

  it('temperature rounds and guards nulls', () => {
    expect(formatTemperature(29.4)).toBe('29°');
    expect(formatTemperature(29.5)).toBe('30°');
    expect(formatTemperature(null)).toBe('—');
  });
});
