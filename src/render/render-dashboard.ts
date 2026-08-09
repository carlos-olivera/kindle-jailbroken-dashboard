import type { DashboardSnapshot, DatumStatus } from '../domain/dashboard.js';
import {
  formatBob,
  formatClock,
  formatDateEs,
  formatPercent,
  formatShortDateEs,
  formatTemperature,
  formatTimeHm,
} from '../domain/format.js';
import { palette, rules } from './palette.js';
import { layout } from './layout.js';
import { escapeXml, hRule, text, vRule } from './svg.js';
import { segmentedClock, segmentedClockWidth } from './segmented-digits.js';
import { weatherIcon } from './icons.js';

const W = layout.canvas.width;
const H = layout.canvas.height;
const M = layout.margin;
const TRACK = 4; // uppercase micro-label letter-spacing

/** Card/source status → visible Spanish tag. */
export function statusLabel(status: DatumStatus, observedAt: string | null): string {
  switch (status) {
    case 'live':
      return 'ACTUAL';
    case 'cached': {
      const hm = formatTimeHm(observedAt);
      return hm !== null ? `CACHÉ ${hm}` : 'CACHÉ';
    }
    case 'stale':
      return 'ANTERIOR';
    case 'unavailable':
      return 'SIN DATOS';
  }
}

function overallStatus(snapshot: DashboardSnapshot): string {
  const statuses: DatumStatus[] = [
    snapshot.weather.status,
    snapshot.officialRate.status,
    snapshot.p2pRate.status,
  ];
  if (statuses.every((s) => s === 'live')) return 'EN VIVO';
  if (statuses.every((s) => s === 'unavailable')) return 'SIN CONEXIÓN';
  return 'DEGRADADO';
}

function header(snapshot: DashboardSnapshot): string {
  const { baselineY, labelSize, ruleY } = layout.header;
  return [
    text('SANTA CRUZ · BOLIVIA', {
      x: M,
      y: baselineY,
      size: labelSize,
      weight: 700,
      letterSpacing: TRACK,
      fill: palette.ink,
    }),
    text(overallStatus(snapshot), {
      x: W - M,
      y: baselineY,
      size: labelSize,
      weight: 600,
      letterSpacing: TRACK,
      fill: palette.ink,
      anchor: 'end',
    }),
    hRule(M, ruleY, W - 2 * M, rules.heavy, palette.ink),
  ].join('\n');
}

function clockBlock(now: Date): string {
  const { hh, mm } = formatClock(now);
  const c = layout.clock;
  const clockW = segmentedClockWidth(c);
  const x = (W - clockW) / 2;
  const clock = segmentedClock(hh, mm, {
    x,
    y: c.y,
    digitWidth: c.digitWidth,
    digitHeight: c.digitHeight,
    thickness: c.thickness,
    digitGap: c.digitGap,
    colonWidth: c.colonWidth,
    onColor: palette.ink,
    offColor: palette.segmentOff,
  });
  const date = text(formatDateEs(now), {
    x: W / 2,
    y: c.dateBaselineY,
    size: c.dateSize,
    weight: 600,
    letterSpacing: 6,
    anchor: 'middle',
    fill: palette.ink,
  });
  return `${clock}\n${date}`;
}

function weatherBlock(snapshot: DashboardSnapshot): string {
  const w = layout.weather;
  const d = snapshot.weather;
  const parts: string[] = [hRule(M, w.ruleY, W - 2 * M, rules.thin, palette.ink)];

  parts.push(
    text('CLIMA', {
      x: M,
      y: w.labelBaselineY,
      size: 27,
      weight: 700,
      letterSpacing: TRACK,
      fill: palette.ink,
    }),
  );
  parts.push(
    text(statusLabel(d.status, d.observedAt), {
      x: W - M,
      y: w.labelBaselineY,
      size: 24,
      weight: 600,
      letterSpacing: 2,
      fill: palette.gray,
      anchor: 'end',
    }),
  );

  parts.push(weatherIcon(d.iconId, w.iconX, w.iconY, w.iconSize, palette.ink));
  parts.push(
    text(formatTemperature(d.temperatureC), {
      x: w.tempX,
      y: w.tempBaselineY,
      size: w.tempSize,
      weight: 700,
      fill: palette.ink,
    }),
  );

  parts.push(
    text(d.conditionEs, {
      x: w.conditionX,
      y: w.conditionBaselineY,
      size: w.conditionSize,
      weight: 700,
      letterSpacing: 2,
      fill: palette.ink,
    }),
  );

  const details: string[] = [];
  if (d.apparentTemperatureC !== null)
    details.push(`Sens. ${formatTemperature(d.apparentTemperatureC)}`);
  if (d.humidityPercent !== null) details.push(`Hum. ${Math.round(d.humidityPercent)}%`);
  if (d.windKmh !== null) details.push(`Viento ${Math.round(d.windKmh)} km/h`);
  details.forEach((line, i) => {
    parts.push(
      text(line, {
        x: w.conditionX,
        y: w.conditionBaselineY + (i + 1) * w.detailLineHeight,
        size: w.detailSize,
        weight: 400,
        fill: palette.gray,
      }),
    );
  });

  return parts.join('\n');
}

interface CardSpec {
  x: number;
  width: number;
  label: string;
  value: string;
  sub: string;
  meta: string;
  status: string;
}

function card(spec: CardSpec): string {
  const c = layout.cards;
  return [
    text(spec.label, {
      x: spec.x,
      y: c.ruleY + c.labelOffset,
      size: c.labelSize,
      weight: 700,
      letterSpacing: 3,
      fill: palette.ink,
    }),
    text(spec.value, {
      x: spec.x,
      y: c.ruleY + c.valueOffset,
      size: c.valueSize,
      weight: 700,
      fill: palette.ink,
    }),
    text(spec.sub, {
      x: spec.x,
      y: c.ruleY + c.subOffset,
      size: c.subSize,
      weight: 600,
      letterSpacing: 1,
      fill: palette.ink,
    }),
    text(spec.meta, {
      x: spec.x,
      y: c.ruleY + c.metaOffset,
      size: c.metaSize,
      weight: 400,
      fill: palette.gray,
    }),
    text(spec.status, {
      x: spec.x + spec.width,
      y: c.ruleY + c.metaOffset,
      size: 24,
      weight: 600,
      letterSpacing: 2,
      fill: palette.gray,
      anchor: 'end',
    }),
  ].join('\n');
}

function ratesBlock(snapshot: DashboardSnapshot): string {
  const c = layout.cards;
  const o = snapshot.officialRate;
  const p = snapshot.p2pRate;
  const leftX = M;
  const leftW = c.dividerX - M - 40;
  const rightX = c.dividerX + 44;
  const rightW = W - M - rightX;

  const officialValue = o.buy !== null ? `Bs ${formatBob(o.buy)}` : '—';
  const officialMeta =
    o.effectiveDate !== null
      ? `Vigente ${formatShortDateEs(o.effectiveDate) ?? o.effectiveDate}`
      : 'SIN DATOS';
  const officialSub = o.sell !== null ? `TCO COMPRA · VENTA Bs ${formatBob(o.sell)}` : 'TCO COMPRA';

  const p2pValue = p.price !== null ? `Bs ${formatBob(p.price)}` : '—';
  const p2pMeta =
    p.observedAt !== null ? `Cotizado ${formatTimeHm(p.observedAt) ?? ''}`.trim() : 'SIN DATOS';
  const notional = Math.round(p.notionalBob);

  const parts = [
    hRule(M, c.ruleY, W - 2 * M, rules.medium, palette.ink),
    vRule(c.dividerX, c.ruleY, c.bottomRuleY - c.ruleY, rules.thin, palette.ink),
    hRule(M, c.bottomRuleY, W - 2 * M, rules.medium, palette.ink),
    card({
      x: leftX,
      width: leftW,
      label: 'USD/BOB · OFICIAL',
      value: officialValue,
      sub: officialSub,
      meta: officialMeta,
      status: statusLabel(o.status, o.updatedAt),
    }),
    card({
      x: rightX,
      width: rightW,
      label: 'USDT/BOB · P2P COMPRA',
      value: p2pValue,
      sub: `BINANCE P2P · ${notional} BOB`,
      meta: p2pMeta,
      status: statusLabel(p.status, p.observedAt),
    }),
  ];

  return parts.join('\n');
}

function footer(snapshot: DashboardSnapshot): string {
  const f = layout.footer;
  const o = snapshot.officialRate;
  const p = snapshot.p2pRate;
  const gen = formatTimeHm(snapshot.generatedAt) ?? '—';
  const parts: string[] = [];

  // Spread row under the cards: arithmetic difference between the displayed
  // P2P quote and the official buy rate. Informative only.
  if (o.buy !== null && p.price !== null && o.buy > 0) {
    const diff = p.price - o.buy;
    const pct = (diff / o.buy) * 100;
    parts.push(
      text('DIF. P2P VS OFICIAL', {
        x: M,
        y: f.spreadBaselineY,
        size: 26,
        weight: 700,
        letterSpacing: 3,
        fill: palette.ink,
      }),
      text(`${diff >= 0 ? '+' : '-'}Bs ${formatBob(Math.abs(diff))} · ${formatPercent(pct)}`, {
        x: W - M,
        y: f.spreadBaselineY,
        size: 26,
        weight: 600,
        letterSpacing: 1,
        fill: palette.ink,
        anchor: 'end',
      }),
    );
  }

  parts.push(
    text('Datos referenciales · No constituye oferta de cambio', {
      x: M,
      y: f.line1BaselineY,
      size: f.size,
      weight: 400,
      fill: palette.gray,
    }),
    text(`ACT. GENERAL ${gen}`, {
      x: W - M,
      y: f.line1BaselineY,
      size: f.size,
      weight: 600,
      letterSpacing: 2,
      fill: palette.ink,
      anchor: 'end',
    }),
    text('USDT/BOB es cotización P2P de mercado, no tipo de cambio oficial', {
      x: M,
      y: f.line2BaselineY,
      size: f.size,
      weight: 400,
      fill: palette.gray,
    }),
  );
  return parts.join('\n');
}

/**
 * Pure, deterministic SVG renderer: same snapshot + same `now` → same SVG.
 * All remotely supplied strings pass through `escapeXml` (see svg.ts `text`).
 */
export function renderDashboardSvg(snapshot: DashboardSnapshot, now: Date): string {
  const body = [
    header(snapshot),
    clockBlock(now),
    weatherBlock(snapshot),
    ratesBlock(snapshot),
    footer(snapshot),
  ].join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
<title>${escapeXml('Panel financiero Bolivia')}</title>
<rect width="${W}" height="${H}" fill="${palette.bg}"/>
${body}
</svg>
`;
}
