import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Sharp rasterizes SVG through librsvg + fontconfig. To guarantee the bundled
 * Inter faces render on a clean Mac (no globally installed fonts), we point
 * fontconfig at the project's `assets/fonts` directory via FONTCONFIG_FILE.
 *
 * This must run before the first sharp SVG render in the process, because
 * fontconfig caches its configuration on first use.
 */
export function fontsDir(): string {
  const here = path.dirname(fileURLToPath(import.meta.url));
  // src/render -> project root (works from src/ with tsx and from dist/).
  return path.resolve(here, '..', '..', 'assets', 'fonts');
}

export function ensureFontconfig(dataDir = '.data'): string {
  if (process.env.FONTCONFIG_FILE) return process.env.FONTCONFIG_FILE;
  const dir = path.resolve(dataDir);
  mkdirSync(path.join(dir, 'fontconfig-cache'), { recursive: true });
  const confPath = path.join(dir, 'fonts.conf');
  const conf = `<?xml version="1.0"?>
<!DOCTYPE fontconfig SYSTEM "fonts.dtd">
<fontconfig>
  <dir>${fontsDir()}</dir>
  <cachedir>${path.join(dir, 'fontconfig-cache')}</cachedir>
</fontconfig>
`;
  writeFileSync(confPath, conf, 'utf8');
  process.env.FONTCONFIG_FILE = confPath;
  return confPath;
}
