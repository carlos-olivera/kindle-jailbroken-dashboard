import { describe, expect, it, vi } from 'vitest';
import { pino } from 'pino';
import { deployToKindle } from '../src/kindle/deploy.js';
import { loadConfig } from '../src/config.js';
import type { ExecFn, ExecResult } from '../src/kindle/exec.js';
import { renderDashboardSvg } from '../src/render/render-dashboard.js';
import { rasterizeDashboard } from '../src/render/rasterize.js';
import { demoSnapshot, DEMO_NOW } from '../src/render/demo-snapshot.js';
import { mkdtemp } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

const logger = pino({ level: 'silent' });

const env = {
  KINDLE_HOST: '192.168.1.77',
  KINDLE_USER: 'root',
  KINDLE_SSH_KEY: '~/.ssh/kindle_pw4_ed25519',
  KINDLE_REMOTE_DIR: '/mnt/us/financial-dashboard',
  FBINK_PATH: '/mnt/us/libkh/bin/fbink',
  CACHE_FILE: '.data/test-cache.json',
} as NodeJS.ProcessEnv;

async function makePng(): Promise<string> {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'deploy-test-'));
  const res = await rasterizeDashboard(renderDashboardSvg(demoSnapshot(), DEMO_NOW), dir);
  return res.pngPath;
}

const ok: ExecResult = { exitCode: 0, stdout: '', stderr: '' };

describe('deployToKindle with mocked process execution', () => {
  it('runs preflight, streamed ssh upload to temp, atomic mv + fbink', async () => {
    const png = await makePng();
    const calls: Array<{ file: string; args: string[] }> = [];
    const exec: ExecFn = async (file, args) => {
      calls.push({ file, args });
      return ok;
    };

    await deployToKindle(loadConfig(env), logger, png, { flash: true, exec });

    expect(calls).toHaveLength(3);
    const [preflight, upload, activate] = calls as [
      (typeof calls)[0],
      (typeof calls)[0],
      (typeof calls)[0],
    ];

    expect(preflight.file).toBe('ssh');
    expect(preflight.args.join(' ')).toContain(
      'test -x /mnt/us/libkh/bin/fbink && mkdir -p /mnt/us/financial-dashboard',
    );

    expect(upload.file).toBe('ssh');
    expect(upload.args.join(' ')).toMatch(
      /sh -c 'cat > \/mnt\/us\/financial-dashboard\/\.screen-\d+\.tmp\.png'/,
    );

    expect(activate.file).toBe('ssh');
    const joined = activate.args.join(' ');
    expect(joined).toMatch(
      /mv \/mnt\/us\/financial-dashboard\/\.screen-\d+\.tmp\.png \/mnt\/us\/financial-dashboard\/screen\.png/,
    );
    expect(joined).toContain('fbink');
    expect(joined).toContain('file=/mnt/us/financial-dashboard/screen.png');
    expect(joined).toContain('-f');
  }, 30_000);

  it('cleans up only its own temp file when upload fails', async () => {
    const png = await makePng();
    const calls: Array<{ file: string; args: string[] }> = [];
    const exec: ExecFn = async (file, args) => {
      calls.push({ file, args });
      if (args.join(' ').includes('cat >')) throw new Error('connection lost');
      return ok;
    };

    await expect(
      deployToKindle(loadConfig(env), logger, png, { flash: false, exec }),
    ).rejects.toThrow('connection lost');
    const last = calls.at(-1);
    expect(last?.file).toBe('ssh');
    expect(last?.args.join(' ')).toMatch(
      /rm -f \/mnt\/us\/financial-dashboard\/\.screen-\d+\.tmp\.png/,
    );
    // Never a bare `rm -rf` or unrelated path.
    expect(last?.args.join(' ')).not.toContain('rm -rf');
  }, 30_000);

  it('refuses to deploy a missing or wrongly sized PNG', async () => {
    const exec = vi.fn(async () => ok);
    await expect(
      deployToKindle(loadConfig(env), logger, '/nonexistent/screen.png', { flash: false, exec }),
    ).rejects.toThrow();
    expect(exec).not.toHaveBeenCalled();
  });

  it('warns (but proceeds) if wifi host is the USB gadget address', async () => {
    const png = await makePng();
    const warnings: string[] = [];
    const warnLogger = pino({ level: 'warn' }, { write: (line: string) => warnings.push(line) });
    const exec: ExecFn = async () => ok;
    await deployToKindle(loadConfig({ ...env, KINDLE_HOST: '192.168.15.244' }), warnLogger, png, {
      flash: false,
      exec,
    });
    expect(warnings.join('')).toContain('gadget USB');
  }, 30_000);
});
