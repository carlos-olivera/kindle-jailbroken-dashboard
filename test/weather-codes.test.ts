import { describe, expect, it } from 'vitest';
import { describeWeatherCode, resolveIconId } from '../src/providers/weather-codes.js';
import { KNOWN_ICON_IDS } from '../src/render/icons.js';

describe('WMO code mapping', () => {
  it('maps every documented WMO code to a Spanish label and icon', () => {
    const codes = [
      0, 1, 2, 3, 45, 48, 51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 71, 73, 75, 77, 80, 81, 82, 85,
      86, 95, 96, 99,
    ];
    for (const code of codes) {
      const info = describeWeatherCode(code);
      expect(info.labelEs, `código ${code}`).not.toBe('SIN DATOS');
      expect(info.labelEs).toMatch(/^[A-ZÁÉÍÓÚÑ0-9 ./-]+$/u);
    }
  });

  it('spot-checks key mappings', () => {
    expect(describeWeatherCode(0).labelEs).toBe('DESPEJADO');
    expect(describeWeatherCode(2).labelEs).toBe('PARCIAL NUBLADO');
    expect(describeWeatherCode(45).icon).toBe('fog');
    expect(describeWeatherCode(55).icon).toBe('drizzle');
    expect(describeWeatherCode(65).icon).toBe('heavy-rain');
    expect(describeWeatherCode(75).icon).toBe('snow');
    expect(describeWeatherCode(95).icon).toBe('thunderstorm');
  });

  it('unknown/null codes degrade to SIN DATOS', () => {
    expect(describeWeatherCode(null).labelEs).toBe('SIN DATOS');
    expect(describeWeatherCode(42).labelEs).toBe('SIN DATOS');
    expect(resolveIconId(null, true)).toBe('unknown');
  });

  it('applies day/night variants', () => {
    expect(resolveIconId(0, true)).toBe('clear-day');
    expect(resolveIconId(0, false)).toBe('clear-night');
    expect(resolveIconId(2, false)).toBe('partly-cloudy-night');
    expect(resolveIconId(61, false)).toBe('rain');
  });

  it('every resolvable icon id has a drawing', () => {
    const ids = new Set<string>(KNOWN_ICON_IDS);
    for (const code of [0, 2, 3, 45, 51, 61, 65, 75, 95, null]) {
      for (const isDay of [true, false]) {
        expect(ids.has(resolveIconId(code, isDay))).toBe(true);
      }
    }
  });
});
