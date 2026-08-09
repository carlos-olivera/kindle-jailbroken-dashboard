import { homedir } from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config({ quiet: true });

/** Expands a leading `~` to the user's home directory. */
export function expandHomePath(p: string): string {
  if (p === '~') return homedir();
  if (p.startsWith('~/')) return path.join(homedir(), p.slice(2));
  return p;
}

const hostSchema = z
  .string()
  .min(1)
  .regex(
    /^[A-Za-z0-9._-]+$/,
    'host must be a plain hostname or IPv4 address (no spaces or shell metacharacters)',
  );

const remotePathSchema = z
  .string()
  .min(1)
  .regex(
    /^\/[A-Za-z0-9._/-]+$/,
    'remote path must be absolute and contain no spaces or shell metacharacters',
  );

const configSchema = z.object({
  nodeEnv: z.enum(['development', 'production', 'test']).default('development'),
  timezone: z.string().default('America/La_Paz'),
  locale: z.string().default('es-BO'),
  latitude: z.coerce.number().min(-90).max(90).default(-17.7833),
  longitude: z.coerce.number().min(-180).max(180).default(-63.1821),

  kindleHost: hostSchema.default('192.168.1.50'),
  kindleRecoveryHost: hostSchema.default('192.168.15.244'),
  kindleUser: z
    .string()
    .regex(/^[a-z_][a-z0-9_-]*$/i, 'user must be a plain unix username')
    .default('root'),
  kindleSshPort: z.coerce.number().int().min(1).max(65535).default(22),
  kindleSshKey: z.string().min(1).default('~/.ssh/kindle_pw4_ed25519'),
  kindleRemoteDir: remotePathSchema.default('/mnt/us/financial-dashboard'),
  fbinkPath: remotePathSchema.default('/mnt/us/libkh/bin/fbink'),
  knownHostsFile: z.string().min(1).default('.data/known_hosts'),

  refreshIntervalMinutes: z.coerce.number().int().min(1).default(5),
  fullRefreshEvery: z.coerce.number().int().min(1).default(12),
  binanceP2pNotionalBob: z.coerce.number().positive().default(1000),
  httpTimeoutMs: z.coerce.number().int().min(1000).max(60000).default(8000),
  logLevel: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']).default('info'),

  cacheFile: z.string().default('.data/cache.json'),
  artifactsDir: z.string().default('artifacts'),
});

export type AppConfig = z.infer<typeof configSchema> & { kindleSshKeyExpanded: string };

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const parsed = configSchema.safeParse({
    nodeEnv: env.NODE_ENV,
    timezone: env.TIMEZONE,
    locale: env.LOCALE,
    latitude: env.LATITUDE,
    longitude: env.LONGITUDE,
    kindleHost: env.KINDLE_HOST,
    kindleRecoveryHost: env.KINDLE_RECOVERY_HOST,
    kindleUser: env.KINDLE_USER,
    kindleSshPort: env.KINDLE_SSH_PORT,
    kindleSshKey: env.KINDLE_SSH_KEY,
    kindleRemoteDir: env.KINDLE_REMOTE_DIR,
    fbinkPath: env.FBINK_PATH,
    knownHostsFile: env.KINDLE_KNOWN_HOSTS,
    refreshIntervalMinutes: env.REFRESH_INTERVAL_MINUTES,
    fullRefreshEvery: env.FULL_REFRESH_EVERY,
    binanceP2pNotionalBob: env.BINANCE_P2P_NOTIONAL_BOB,
    httpTimeoutMs: env.HTTP_TIMEOUT_MS,
    logLevel: env.LOG_LEVEL,
    cacheFile: env.CACHE_FILE,
    artifactsDir: env.ARTIFACTS_DIR,
  });

  if (!parsed.success) {
    const details = parsed.error.issues
      .map((i) => `  - ${i.path.join('.')}: ${i.message}`)
      .join('\n');
    throw new Error(`Configuración inválida (.env):\n${details}`);
  }

  return {
    ...parsed.data,
    kindleSshKeyExpanded: expandHomePath(parsed.data.kindleSshKey),
  };
}
