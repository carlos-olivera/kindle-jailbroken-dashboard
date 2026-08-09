/** Escapes a string for safe insertion into SVG/XML text or attributes. */
export function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export interface TextOptions {
  x: number;
  y: number;
  size: number;
  weight?: 400 | 500 | 600 | 700;
  fill?: string;
  anchor?: 'start' | 'middle' | 'end';
  letterSpacing?: number;
  family?: string;
}

/** Renders a `<text>` element with the given (escaped) content. */
export function text(content: string, opts: TextOptions): string {
  const {
    x,
    y,
    size,
    weight = 400,
    fill = '#111111',
    anchor = 'start',
    letterSpacing,
    family = 'Inter',
  } = opts;
  const ls = letterSpacing !== undefined ? ` letter-spacing="${letterSpacing}"` : '';
  return (
    `<text x="${x}" y="${y}" font-family="${escapeXml(family)}" font-size="${size}" ` +
    `font-weight="${weight}" fill="${fill}" text-anchor="${anchor}"${ls}>${escapeXml(content)}</text>`
  );
}

/** Horizontal rule as a crisp filled rect (avoids stroke antialias fuzz). */
export function hRule(
  x: number,
  y: number,
  width: number,
  thickness: number,
  fill = '#111111',
): string {
  return `<rect x="${x}" y="${y}" width="${width}" height="${thickness}" fill="${fill}"/>`;
}

/** Vertical rule as a crisp filled rect. */
export function vRule(
  x: number,
  y: number,
  height: number,
  thickness: number,
  fill = '#111111',
): string {
  return `<rect x="${x}" y="${y}" width="${thickness}" height="${height}" fill="${fill}"/>`;
}
