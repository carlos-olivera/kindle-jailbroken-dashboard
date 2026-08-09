import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { CANVAS } from './palette.js';
import { ensureFontconfig } from './fonts.js';

export interface RasterResult {
  svgPath: string;
  pngPath: string;
  width: number;
  height: number;
}

/**
 * Rasterizes the SVG to an 8-bit grayscale PNG at exactly 1072x1448 and
 * writes both artifacts. Mild linear contrast stretch helps small text on
 * e-ink without destroying anti-aliasing.
 */
export async function rasterizeDashboard(svg: string, artifactsDir: string): Promise<RasterResult> {
  ensureFontconfig();
  await mkdir(artifactsDir, { recursive: true });
  const svgPath = path.join(artifactsDir, 'dashboard.svg');
  const pngPath = path.join(artifactsDir, 'dashboard.png');

  await writeFile(svgPath, svg, 'utf8');

  const png = await sharp(Buffer.from(svg), { density: 72 })
    .resize(CANVAS.width, CANVAS.height, { fit: 'fill' })
    .flatten({ background: '#FFFFFF' })
    .linear(1.08, -10)
    .grayscale()
    .toColourspace('b-w')
    .png({ compressionLevel: 9 })
    .toBuffer();

  await writeFile(pngPath, png);

  const meta = await sharp(png).metadata();
  if (meta.width !== CANVAS.width || meta.height !== CANVAS.height) {
    throw new Error(`PNG con dimensiones inesperadas: ${meta.width}x${meta.height}`);
  }
  return { svgPath, pngPath, width: meta.width, height: meta.height };
}
