/**
 * E-ink safe monochrome palette. Only pure black, white, and a few robust
 * grays that survive 16-level e-ink quantization.
 */
export const palette = {
  bg: '#FFFFFF',
  ink: '#111111',
  black: '#000000',
  gray: '#555555',
  lightGray: '#999999',
  segmentOff: '#EBEBEB',
} as const;

export const CANVAS = { width: 1072, height: 1448 } as const;

/** Rule weights in physical pixels (e-ink safe: 2–4 px). */
export const rules = { thin: 2, medium: 3, heavy: 4 } as const;

export const fonts = {
  sans: 'Inter',
} as const;
