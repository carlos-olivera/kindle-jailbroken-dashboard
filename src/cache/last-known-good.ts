import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { z } from 'zod';
import type { OfficialRateDatum, P2pRateDatum, WeatherDatum } from '../domain/dashboard.js';

const cacheSchema = z.object({
  version: z.literal(1),
  weather: z.unknown().optional(),
  officialRate: z.unknown().optional(),
  p2pRate: z.unknown().optional(),
});

export interface LastKnownGood {
  weather?: WeatherDatum;
  officialRate?: OfficialRateDatum;
  p2pRate?: P2pRateDatum;
}

/**
 * Atomic last-known-good cache: reads tolerate a missing/corrupt file, and
 * writes go through a temporary file followed by rename.
 */
export class LastKnownGoodCache {
  constructor(private readonly filePath: string) {}

  async read(): Promise<LastKnownGood> {
    try {
      const raw = await readFile(this.filePath, 'utf8');
      const parsed = cacheSchema.safeParse(JSON.parse(raw));
      if (!parsed.success) return {};
      const out: LastKnownGood = {};
      if (parsed.data.weather !== undefined) out.weather = parsed.data.weather as WeatherDatum;
      if (parsed.data.officialRate !== undefined)
        out.officialRate = parsed.data.officialRate as OfficialRateDatum;
      if (parsed.data.p2pRate !== undefined) out.p2pRate = parsed.data.p2pRate as P2pRateDatum;
      return out;
    } catch {
      return {};
    }
  }

  async write(data: LastKnownGood): Promise<void> {
    const dir = path.dirname(this.filePath);
    await mkdir(dir, { recursive: true });
    const tmp = path.join(dir, `.cache-${process.pid}-${Date.now()}.tmp`);
    const body = JSON.stringify({ version: 1, ...data }, null, 2);
    await writeFile(tmp, body, 'utf8');
    await rename(tmp, this.filePath);
  }
}
