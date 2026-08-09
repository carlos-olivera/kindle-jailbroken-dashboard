/**
 * Custom monochrome weather icons drawn as simple SVG line/filled shapes,
 * designed for 300 ppi e-ink. Each icon is authored in a 100x100 viewbox and
 * scaled by the caller. Stroke widths are chosen to survive scaling to
 * ~180 px (>= 3 physical px).
 */

const STROKE = 6;

function sunCore(cx: number, cy: number, r: number, ink: string): string {
  const rays: string[] = [];
  for (let i = 0; i < 8; i++) {
    const angle = (i * Math.PI) / 4;
    const x1 = cx + Math.cos(angle) * (r + 8);
    const y1 = cy + Math.sin(angle) * (r + 8);
    const x2 = cx + Math.cos(angle) * (r + 20);
    const y2 = cy + Math.sin(angle) * (r + 20);
    rays.push(
      `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="${ink}" stroke-width="${STROKE}" stroke-linecap="round"/>`,
    );
  }
  return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${ink}" stroke-width="${STROKE}"/>${rays.join('')}`;
}

function moon(cx: number, cy: number, r: number, ink: string): string {
  // Crescent via two arcs.
  return (
    `<path d="M ${cx + r * 0.45} ${cy - r} A ${r} ${r} 0 1 0 ${cx + r * 0.45} ${cy + r} ` +
    `A ${r * 0.78} ${r * 0.78} 0 1 1 ${cx + r * 0.45} ${cy - r} Z" fill="${ink}"/>`
  );
}

function cloudPath(x: number, y: number, s: number): string {
  // A soft cloud outline: base line + three arcs. Path authored for s=1 at origin.
  return (
    `M ${x + 20 * s} ${y + 62 * s}` +
    ` A ${14 * s} ${14 * s} 0 0 1 ${x + 24 * s} ${y + 35 * s}` +
    ` A ${18 * s} ${18 * s} 0 0 1 ${x + 58 * s} ${y + 28 * s}` +
    ` A ${15 * s} ${15 * s} 0 0 1 ${x + 82 * s} ${y + 44 * s}` +
    ` A ${10 * s} ${10 * s} 0 0 1 ${x + 80 * s} ${y + 62 * s}` +
    ` Z`
  );
}

function cloud(x: number, y: number, s: number, ink: string, filled = false): string {
  return `<path d="${cloudPath(x, y, s)}" fill="${filled ? ink : 'none'}" stroke="${ink}" stroke-width="${STROKE}" stroke-linejoin="round"/>`;
}

function rainDrops(xs: number[], y: number, len: number, ink: string): string {
  return xs
    .map(
      (x) =>
        `<line x1="${x}" y1="${y}" x2="${x - len * 0.35}" y2="${y + len}" stroke="${ink}" stroke-width="${STROKE}" stroke-linecap="round"/>`,
    )
    .join('');
}

function snowFlakes(xs: number[], y: number, ink: string): string {
  return xs
    .map((x) => {
      const arms: string[] = [];
      for (let i = 0; i < 3; i++) {
        const a = (i * Math.PI) / 3;
        const dx = Math.cos(a) * 7;
        const dy = Math.sin(a) * 7;
        arms.push(
          `<line x1="${(x - dx).toFixed(1)}" y1="${(y - dy).toFixed(1)}" x2="${(x + dx).toFixed(1)}" y2="${(y + dy).toFixed(1)}" stroke="${ink}" stroke-width="4" stroke-linecap="round"/>`,
        );
      }
      return arms.join('');
    })
    .join('');
}

function bolt(x: number, y: number, s: number, ink: string): string {
  return `<polygon points="${x},${y} ${x - 10 * s},${y + 18 * s} ${x - 2 * s},${y + 18 * s} ${x - 12 * s},${y + 36 * s} ${x + 6 * s},${y + 14 * s} ${x - 2 * s},${y + 14 * s} ${x + 8 * s},${y}" fill="${ink}"/>`;
}

function fogLines(ink: string): string {
  const lines: string[] = [];
  for (const [y, x1, x2] of [
    [40, 14, 86],
    [54, 10, 90],
    [68, 16, 84],
    [82, 22, 78],
  ] as Array<[number, number, number]>) {
    lines.push(
      `<line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}" stroke="${ink}" stroke-width="${STROKE}" stroke-linecap="round"/>`,
    );
  }
  return lines.join('');
}

/** Icon bodies in a 100x100 viewbox. */
function iconBody(id: string, ink: string): string {
  switch (id) {
    case 'clear-day':
      return sunCore(50, 50, 22, ink);
    case 'clear-night':
      return moon(46, 50, 26, ink);
    case 'partly-cloudy-day':
      return `${sunCore(36, 34, 15, ink)}${cloud(8, 8, 0.92, ink, true)}`;
    case 'partly-cloudy-night':
      return `${moon(34, 32, 16, ink)}${cloud(8, 8, 0.92, ink, true)}`;
    case 'cloudy':
      return cloud(0, 4, 1, ink, false) + cloud(24, 22, 0.75, ink, true);
    case 'fog':
      return fogLines(ink);
    case 'drizzle':
      return `${cloud(0, -4, 1, ink)}${rainDrops([30, 50, 70], 66, 10, ink)}`;
    case 'rain':
      return `${cloud(0, -8, 1, ink)}${rainDrops([26, 44, 62, 80], 62, 18, ink)}`;
    case 'heavy-rain':
      return `${cloud(0, -10, 1, ink, true)}${rainDrops([24, 40, 56, 72, 88], 60, 24, ink)}`;
    case 'thunderstorm':
      return `${cloud(0, -10, 1, ink, true)}${bolt(52, 58, 1, ink)}${rainDrops([24, 82], 60, 18, ink)}`;
    case 'snow':
      return `${cloud(0, -8, 1, ink)}${snowFlakes([30, 52, 74], 70, ink)}`;
    default:
      // Unknown: an outlined circle with a dash, deliberately unassuming.
      return (
        `<circle cx="50" cy="50" r="28" fill="none" stroke="${ink}" stroke-width="${STROKE}"/>` +
        `<line x1="38" y1="50" x2="62" y2="50" stroke="${ink}" stroke-width="${STROKE}" stroke-linecap="round"/>`
      );
  }
}

export const KNOWN_ICON_IDS = [
  'clear-day',
  'clear-night',
  'partly-cloudy-day',
  'partly-cloudy-night',
  'cloudy',
  'fog',
  'drizzle',
  'rain',
  'heavy-rain',
  'thunderstorm',
  'snow',
  'unknown',
] as const;

/** Renders a weather icon scaled to `size` at (x, y) top-left. */
export function weatherIcon(
  id: string,
  x: number,
  y: number,
  size: number,
  ink = '#111111',
): string {
  const scale = size / 100;
  return `<g transform="translate(${x},${y}) scale(${scale})">${iconBody(id, ink)}</g>`;
}
