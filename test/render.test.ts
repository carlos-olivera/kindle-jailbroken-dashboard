import { describe, expect, it } from 'vitest';
import sharp from 'sharp';
import { escapeXml, text } from '../src/render/svg.js';
import { renderDashboardSvg, statusLabel } from '../src/render/render-dashboard.js';
import { demoSnapshot, DEMO_NOW } from '../src/render/demo-snapshot.js';
import {
  emptyOfficialRate,
  emptyP2pRate,
  emptyWeather,
  type DashboardSnapshot,
} from '../src/domain/dashboard.js';
import { segmentedClock } from '../src/render/segmented-digits.js';
import { CANVAS } from '../src/render/palette.js';
import { ensureFontconfig } from '../src/render/fonts.js';

describe('SVG escaping of untrusted content', () => {
  it('escapes XML metacharacters', () => {
    expect(escapeXml(`<script>alert("x")</script> & 'y'`)).toBe(
      '&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt; &amp; &apos;y&apos;',
    );
  });

  it('text() escapes remotely supplied strings', () => {
    const el = text('<img onerror="pwn">', { x: 0, y: 0, size: 10 });
    expect(el).not.toContain('<img');
    expect(el).toContain('&lt;img');
  });

  it('a malicious condition label cannot inject SVG elements', () => {
    const snapshot = demoSnapshot();
    snapshot.weather.conditionEs = '"/><rect id="inyectado"/>';
    const svg = renderDashboardSvg(snapshot, DEMO_NOW);
    expect(svg).not.toContain('id="inyectado"');
    expect(svg).toContain('&quot;/&gt;&lt;rect');
  });
});

describe('deterministic rendering', () => {
  it('same snapshot + same now -> identical SVG', () => {
    const a = renderDashboardSvg(demoSnapshot(), DEMO_NOW);
    const b = renderDashboardSvg(demoSnapshot(), DEMO_NOW);
    expect(a).toBe(b);
  });

  it('key elements are present and correctly labeled', () => {
    const svg = renderDashboardSvg(demoSnapshot(), DEMO_NOW);
    expect(svg).toContain('SANTA CRUZ · BOLIVIA');
    expect(svg).toContain('SÁBADO 08 AGO 2026');
    expect(svg).toContain('USD/BOB · OFICIAL');
    expect(svg).toContain('TCO COMPRA');
    expect(svg).toContain('USDT/BOB · P2P COMPRA');
    expect(svg).toContain('BINANCE P2P · 1000 BOB');
    expect(svg).toContain('11,86');
    expect(svg).toContain('13,14');
    expect(svg).toContain('Datos referenciales · No constituye oferta de cambio');
    // The Binance quote must never masquerade as official USD.
    expect(svg).not.toMatch(/USDT[^<]*OFICIAL/);
  });

  it('unavailable sources render SIN DATOS and an em dash, never 0,00', () => {
    const snapshot: DashboardSnapshot = {
      generatedAt: DEMO_NOW.toISOString(),
      timezone: 'America/La_Paz',
      weather: emptyWeather(),
      officialRate: emptyOfficialRate(),
      p2pRate: emptyP2pRate(1000),
    };
    const svg = renderDashboardSvg(snapshot, DEMO_NOW);
    expect(svg).toContain('SIN DATOS');
    expect(svg).toContain('>—<');
    expect(svg).not.toContain('0,00');
    expect(svg).toContain('SIN CONEXIÓN');
  });

  it('status labels', () => {
    expect(statusLabel('live', null)).toBe('ACTUAL');
    expect(statusLabel('cached', '2026-08-08T12:24:00Z')).toBe('CACHÉ 08:24');
    expect(statusLabel('stale', null)).toBe('ANTERIOR');
    expect(statusLabel('unavailable', null)).toBe('SIN DATOS');
  });
});

describe('segmented clock', () => {
  const opts = {
    x: 0,
    y: 0,
    digitWidth: 100,
    digitHeight: 200,
    thickness: 20,
    digitGap: 20,
    colonWidth: 40,
    onColor: '#111',
  };

  it('renders four digits and a colon deterministically', () => {
    const a = segmentedClock('14', '24', opts);
    expect(a).toBe(segmentedClock('14', '24', opts));
    // 4 digit groups + 2 colon dots.
    expect(a.match(/<g /g)).toHaveLength(4);
    expect(a.match(/<rect /g)).toHaveLength(2);
  });

  it('digit "8" lights all seven segments and "1" only two', () => {
    const eight = segmentedClock('88', '88', opts);
    const one = segmentedClock('11', '11', opts);
    expect(eight.match(/<polygon /g)).toHaveLength(4 * 7);
    expect(one.match(/<polygon /g)).toHaveLength(4 * 2);
  });

  it('rejects non-numeric time', () => {
    expect(() => segmentedClock('ab', '24', opts)).toThrow();
  });
});

describe('rasterized output', () => {
  it('layout: no text escapes the canvas horizontally', async () => {
    ensureFontconfig();
    const svg = renderDashboardSvg(demoSnapshot(), DEMO_NOW);
    const png = await sharp(Buffer.from(svg), { density: 72 })
      .resize(CANVAS.width, CANVAS.height, { fit: 'fill' })
      .flatten({ background: '#FFFFFF' })
      .grayscale()
      .raw()
      .toBuffer();
    // Columns 0..margin/2 and width-margin/2..width must stay white (except
    // nothing renders there by design). Sample every 8th row.
    const w = CANVAS.width;
    let darkEdge = 0;
    for (let y = 0; y < CANVAS.height; y += 8) {
      for (const x of [4, 12, 20, w - 20, w - 12, w - 4]) {
        if ((png[y * w + x] ?? 255) < 128) darkEdge++;
      }
    }
    expect(darkEdge).toBe(0);
  }, 30_000);

  it('demo PNG artifact pipeline outputs exactly 1072x1448 grayscale', async () => {
    ensureFontconfig();
    const { rasterizeDashboard } = await import('../src/render/rasterize.js');
    const { mkdtemp } = await import('node:fs/promises');
    const os = await import('node:os');
    const dir = await mkdtemp(`${os.tmpdir()}/dash-test-`);
    const svg = renderDashboardSvg(demoSnapshot(), DEMO_NOW);
    const res = await rasterizeDashboard(svg, dir);
    expect(res.width).toBe(1072);
    expect(res.height).toBe(1448);
    const meta = await sharp(res.pngPath).metadata();
    expect(meta.width).toBe(1072);
    expect(meta.height).toBe(1448);
    expect(meta.channels).toBe(1);
    expect(meta.depth).toBe('uchar');
  }, 30_000);
});
