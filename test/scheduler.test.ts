import { describe, expect, it, vi } from 'vitest';
import { pino } from 'pino';
import { Runner } from '../src/scheduler/runner.js';

const logger = pino({ level: 'silent' });

const wait = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

describe('scheduler overlap prevention', () => {
  it('skips a tick while the previous cycle is still running', async () => {
    let active = 0;
    let maxActive = 0;
    let runs = 0;
    const runner = new Runner(
      async () => {
        active++;
        runs++;
        maxActive = Math.max(maxActive, active);
        await wait(50);
        active--;
      },
      { intervalMs: 100_000, fullRefreshEvery: 12, logger },
    );

    const first = runner.tick();
    const second = runner.tick(); // fires while first is active -> skipped
    await Promise.all([first, second]);
    expect(runs).toBe(1);
    expect(maxActive).toBe(1);
  });

  it('full refresh on the first cycle and every N cycles', async () => {
    const flashes: boolean[] = [];
    const runner = new Runner(
      async ({ flash }) => {
        flashes.push(flash);
      },
      { intervalMs: 100_000, fullRefreshEvery: 3, logger },
    );
    for (let i = 0; i < 7; i++) await runner.tick();
    expect(flashes).toEqual([true, false, false, true, false, false, true]);
  });

  it('a failing cycle logs and does not stop subsequent cycles', async () => {
    let n = 0;
    const runner = new Runner(
      async () => {
        n++;
        if (n === 1) throw new Error('boom');
      },
      { intervalMs: 100_000, fullRefreshEvery: 12, logger },
    );
    await runner.tick();
    await runner.tick();
    expect(n).toBe(2);
    expect(runner.cycleCount).toBe(2);
  });

  it('stop() waits for the active cycle to finish', async () => {
    let finished = false;
    const runner = new Runner(
      async () => {
        await wait(60);
        finished = true;
      },
      { intervalMs: 100_000, fullRefreshEvery: 12, logger },
    );
    const tick = runner.tick();
    await wait(10);
    await runner.stop();
    expect(finished).toBe(true);
    await tick;
  });

  it('stop() cancels the scheduled timer', async () => {
    const clearSpy = vi.fn(clearTimeout);
    const runner = new Runner(async () => undefined, {
      intervalMs: 100_000,
      fullRefreshEvery: 12,
      logger,
      clearTimeoutFn: clearSpy as unknown as typeof clearTimeout,
    });
    await runner.start();
    await runner.stop();
    expect(clearSpy).toHaveBeenCalledTimes(1);
  });
});
