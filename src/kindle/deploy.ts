import { stat } from 'node:fs/promises';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import type { Logger } from 'pino';
import type { AppConfig } from '../config.js';
import { CANVAS } from '../render/palette.js';
import { execFile, type ExecFn } from './exec.js';
import { buildFbinkImageArgs } from './fbink.js';
import {
  buildSshArgs,
  buildSshUploadArgs,
  sshTarget,
  assertSafeRemotePath,
  type Transport,
} from './ssh.js';

export interface DeployOptions {
  transport?: Transport;
  flash: boolean;
  exec?: ExecFn;
}

const USB_GADGET_HOST = '192.168.15.244';

/**
 * Wi-Fi-first, atomic deployment:
 * 1. Validate the local PNG (exists, exactly 1072x1448).
 * 2. SSH preflight: FBInk executable exists; remote dir created.
 * 3. Streaming upload (`ssh … 'cat > tmp'`) to a temporary remote name.
 * 4. Atomic `mv` to screen.png.
 * 5. FBInk displays the image.
 * On upload failure the temporary file is removed (best effort).
 */
export async function deployToKindle(
  config: AppConfig,
  logger: Logger,
  pngPath: string,
  options: DeployOptions,
): Promise<void> {
  const { transport = 'wifi', flash, exec = execFile } = options;

  if (transport === 'wifi' && config.kindleHost === USB_GADGET_HOST) {
    logger.warn(
      `KINDLE_HOST=${USB_GADGET_HOST} es la dirección del gadget USB; en modo Wi-Fi configura la IP LAN real del Kindle`,
    );
  }
  if (transport === 'usb-recovery') {
    logger.warn('usando transporte usb-recovery (solo diagnóstico/recuperación)');
  }

  // 1. Local PNG validation.
  await stat(pngPath).catch(() => {
    throw new Error(
      `no existe el PNG local: ${pngPath}. Ejecuta primero "npm run render" o "npm run demo".`,
    );
  });
  const meta = await sharp(pngPath).metadata();
  if (meta.width !== CANVAS.width || meta.height !== CANVAS.height) {
    throw new Error(
      `el PNG local mide ${meta.width}x${meta.height}; se requiere ${CANVAS.width}x${CANVAS.height}`,
    );
  }

  const target = sshTarget(config, transport);
  mkdirSync(path.dirname(target.knownHostsPath), { recursive: true });

  const remoteDir = config.kindleRemoteDir;
  const remoteFinal = `${remoteDir}/screen.png`;
  const remoteTmp = `${remoteDir}/.screen-${Date.now()}.tmp.png`;
  assertSafeRemotePath(remoteFinal);
  assertSafeRemotePath(remoteTmp);

  // 2. Preflight: FBInk present, remote dir exists.
  logger.debug({ host: target.host }, 'preflight SSH');
  await exec(
    'ssh',
    buildSshArgs(target, ['test', '-x', config.fbinkPath, '&&', 'mkdir', '-p', remoteDir]),
  );

  // 3. Upload to a temporary remote file. Streamed through ssh stdin because
  // this Kindle's Dropbear has no scp/sftp helper (`sh: scp: not found`).
  logger.debug('subiendo PNG (ssh cat)');
  try {
    await exec('ssh', buildSshUploadArgs(target, remoteTmp), {
      timeoutMs: 60_000,
      stdinFile: pngPath,
    });
  } catch (err) {
    // Best-effort cleanup of only our own temporary file.
    await exec('ssh', buildSshArgs(target, ['rm', '-f', remoteTmp]), { reject: false }).catch(
      () => undefined,
    );
    throw err;
  }

  // 4. Atomic rename + 5. display.
  logger.debug('activando imagen y refrescando pantalla');
  const fbinkArgs = buildFbinkImageArgs({
    fbinkPath: config.fbinkPath,
    imagePath: remoteFinal,
    flash,
  });
  await exec('ssh', buildSshArgs(target, ['mv', remoteTmp, remoteFinal, '&&', ...fbinkArgs]));

  logger.info({ host: target.host, flash }, 'panel desplegado en el Kindle');
}
