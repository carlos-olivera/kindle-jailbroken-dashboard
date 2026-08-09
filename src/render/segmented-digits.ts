/**
 * Seven-segment digits drawn as pure SVG polygons so the clock is
 * deterministic and font-independent.
 *
 * Segment layout (classic):        Geometry is computed for a digit of
 *      aaaa                        `width` x `height` with segment
 *     f    b                       thickness `t` and a small notch gap
 *     f    b                       between segments.
 *      gggg
 *     e    c
 *     e    c
 *      dddd
 */

type SegmentName = 'a' | 'b' | 'c' | 'd' | 'e' | 'f' | 'g';

const DIGIT_SEGMENTS: Record<string, SegmentName[]> = {
  '0': ['a', 'b', 'c', 'd', 'e', 'f'],
  '1': ['b', 'c'],
  '2': ['a', 'b', 'g', 'e', 'd'],
  '3': ['a', 'b', 'g', 'c', 'd'],
  '4': ['f', 'g', 'b', 'c'],
  '5': ['a', 'f', 'g', 'c', 'd'],
  '6': ['a', 'f', 'g', 'e', 'c', 'd'],
  '7': ['a', 'b', 'c'],
  '8': ['a', 'b', 'c', 'd', 'e', 'f', 'g'],
  '9': ['a', 'b', 'c', 'd', 'f', 'g'],
};

export interface SegmentedDigitOptions {
  x: number;
  y: number;
  width: number;
  height: number;
  thickness: number;
  onColor: string;
  offColor?: string | null;
  gap?: number;
}

function points(list: Array<[number, number]>): string {
  return list
    .map(([px, py]) => `${Math.round(px * 100) / 100},${Math.round(py * 100) / 100}`)
    .join(' ');
}

/**
 * Builds the 7 hexagonal segment polygons for a digit cell at origin (0,0).
 * Returned paths must be translated by the caller.
 */
function segmentPolygons(
  width: number,
  height: number,
  t: number,
  gap: number,
): Record<SegmentName, string> {
  const w = width;
  const h = height;
  const half = t / 2;
  const midY = h / 2;

  // Horizontal segment spanning [x1, x2] centered on cy.
  const horizontal = (x1: number, x2: number, cy: number): string =>
    points([
      [x1 + gap, cy],
      [x1 + gap + half, cy - half],
      [x2 - gap - half, cy - half],
      [x2 - gap, cy],
      [x2 - gap - half, cy + half],
      [x1 + gap + half, cy + half],
    ]);

  // Vertical segment spanning [y1, y2] centered on cx.
  const vertical = (y1: number, y2: number, cx: number): string =>
    points([
      [cx, y1 + gap],
      [cx + half, y1 + gap + half],
      [cx + half, y2 - gap - half],
      [cx, y2 - gap],
      [cx - half, y2 - gap - half],
      [cx - half, y1 + gap + half],
    ]);

  return {
    a: horizontal(0, w, half),
    b: vertical(half, midY, w - half),
    c: vertical(midY, h - half, w - half),
    d: horizontal(0, w, h - half),
    e: vertical(midY, h - half, half),
    f: vertical(half, midY, half),
    g: horizontal(0, w, midY),
  };
}

/** Renders one seven-segment digit. Unknown characters render as all-off. */
export function segmentedDigit(char: string, opts: SegmentedDigitOptions): string {
  const { x, y, width, height, thickness, onColor, offColor = null, gap = thickness * 0.35 } = opts;
  const polys = segmentPolygons(width, height, thickness, gap);
  const on = new Set(DIGIT_SEGMENTS[char] ?? []);
  const parts: string[] = [];
  for (const name of ['a', 'b', 'c', 'd', 'e', 'f', 'g'] as SegmentName[]) {
    const active = on.has(name);
    if (!active && offColor === null) continue;
    parts.push(`<polygon points="${polys[name]}" fill="${active ? onColor : offColor}"/>`);
  }
  return `<g transform="translate(${x},${y})">${parts.join('')}</g>`;
}

export interface SegmentedClockOptions {
  x: number;
  y: number;
  digitWidth: number;
  digitHeight: number;
  thickness: number;
  digitGap: number;
  colonWidth: number;
  onColor: string;
  offColor?: string | null;
}

/** Total width of the `HH:MM` block, for centering. */
export function segmentedClockWidth(
  o: Pick<SegmentedClockOptions, 'digitWidth' | 'digitGap' | 'colonWidth'>,
): number {
  return 4 * o.digitWidth + 2 * o.digitGap + 2 * o.digitGap + o.colonWidth;
}

/** Renders `HH:MM` as four seven-segment digits and a two-dot colon. */
export function segmentedClock(hh: string, mm: string, opts: SegmentedClockOptions): string {
  const {
    x,
    y,
    digitWidth,
    digitHeight,
    thickness,
    digitGap,
    colonWidth,
    onColor,
    offColor = null,
  } = opts;
  if (!/^\d{2}$/.test(hh) || !/^\d{2}$/.test(mm)) {
    throw new Error(`reloj inválido: "${hh}:${mm}"`);
  }
  const parts: string[] = [];
  let cx = x;
  const digitOpts = { y, width: digitWidth, height: digitHeight, thickness, onColor, offColor };

  for (const ch of hh) {
    parts.push(segmentedDigit(ch, { ...digitOpts, x: cx }));
    cx += digitWidth + digitGap;
  }

  // Colon: two square dots at 1/3 and 2/3 height.
  const dot = thickness * 1.05;
  const dotX = cx + (colonWidth - dot) / 2;
  for (const fy of [1 / 3, 2 / 3]) {
    parts.push(
      `<rect x="${dotX}" y="${y + digitHeight * fy - dot / 2}" width="${dot}" height="${dot}" fill="${onColor}"/>`,
    );
  }
  cx += colonWidth + digitGap;

  for (const ch of mm) {
    parts.push(segmentedDigit(ch, { ...digitOpts, x: cx }));
    cx += digitWidth + digitGap;
  }
  return parts.join('');
}
