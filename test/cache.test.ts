import { describe, expect, it } from 'vitest';
import { mkdtemp, readFile, readdir, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { LastKnownGoodCache } from '../src/cache/last-known-good.js';
import type { P2pRateDatum } from '../src/domain/dashboard.js';

const p2p: P2pRateDatum = {
  pair: 'USDT/BOB',
  side: 'BUY',
  price: 13.14,
  notionalBob: 1000,
  method: 'quote-price',
  observedAt: '2026-08-08T18:23:00.000Z',
  status: 'live',
};

describe('last-known-good cache', () => {
  it('round-trips data and leaves no temp files (atomic write)', async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), 'lkg-'));
    const file = path.join(dir, 'cache.json');
    const cache = new LastKnownGoodCache(file);

    await cache.write({ p2pRate: p2p });
    const back = await cache.read();
    expect(back.p2pRate).toEqual(p2p);
    expect(back.weather).toBeUndefined();

    const leftovers = (await readdir(dir)).filter((f) => f.endsWith('.tmp'));
    expect(leftovers).toEqual([]);
    // Content is valid JSON with a version marker.
    expect(JSON.parse(await readFile(file, 'utf8')).version).toBe(1);
  });

  it('missing file reads as empty', async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), 'lkg-'));
    const cache = new LastKnownGoodCache(path.join(dir, 'nope.json'));
    expect(await cache.read()).toEqual({});
  });

  it('corrupt file reads as empty instead of crashing the cycle', async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), 'lkg-'));
    const file = path.join(dir, 'cache.json');
    await writeFile(file, '{corrupted', 'utf8');
    const cache = new LastKnownGoodCache(file);
    expect(await cache.read()).toEqual({});
  });
});
