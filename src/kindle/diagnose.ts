import { mkdirSync } from 'node:fs';
import path from 'node:path';
import type { Logger } from 'pino';
import type { AppConfig } from '../config.js';
import { execFile, type ExecFn } from './exec.js';
import { buildFbinkHelpArgs } from './fbink.js';
import { buildSshArgs, sshTarget, type Transport } from './ssh.js';

/**
 * Verifies SSH connectivity, FBInk presence and capabilities, remote
 * directory, and power-management properties. Prints findings so the user can
 * confirm the image flag syntax of the installed FBInk build.
 */
export async function diagnoseKindle(
  config: AppConfig,
  logger: Logger,
  transport: Transport = 'wifi',
  exec: ExecFn = execFile,
): Promise<boolean> {
  const target = sshTarget(config, transport);
  mkdirSync(path.dirname(target.knownHostsPath), { recursive: true });
  logger.info(
    { host: target.host, port: target.port, transport },
    'diagnóstico: conectando por SSH',
  );

  try {
    const uname = await exec('ssh', buildSshArgs(target, ['uname', '-a']));
    logger.info({ uname: uname.stdout.trim() }, 'SSH OK');
  } catch (err) {
    logger.error(
      { err: err instanceof Error ? err.message : String(err) },
      'SSH falló. Revisa: Kindle despierto con Wi-Fi, IP correcta en KINDLE_HOST, puerto 22 accesible, clave en KINDLE_SSH_KEY',
    );
    return false;
  }

  const fbinkTest = await exec('ssh', buildSshArgs(target, ['test', '-x', config.fbinkPath]), {
    reject: false,
  });
  if (fbinkTest.exitCode !== 0) {
    logger.error(`FBInk no existe o no es ejecutable en ${config.fbinkPath}`);
    return false;
  }
  logger.info(`FBInk encontrado en ${config.fbinkPath}`);

  for (const args of buildFbinkHelpArgs(config.fbinkPath)) {
    const res = await exec('ssh', buildSshArgs(target, args), { reject: false });
    const label = args.slice(1).join(' ');
    const output = `${res.stdout}\n${res.stderr}`.trim();
    logger.info(`--- fbink ${label} (código ${res.exitCode}) ---`);
    if (output) console.log(output.slice(0, 4000));
  }

  const mkdirRes = await exec(
    'ssh',
    buildSshArgs(target, ['mkdir', '-p', config.kindleRemoteDir]),
    { reject: false },
  );
  logger.info(
    mkdirRes.exitCode === 0
      ? `directorio remoto listo: ${config.kindleRemoteDir}`
      : `no se pudo crear ${config.kindleRemoteDir}`,
  );

  const lipc = await exec(
    'ssh',
    buildSshArgs(target, ['lipc-get-prop', 'com.lab126.powerd', 'preventScreenSaver']),
    { reject: false },
  );
  if (lipc.exitCode === 0) {
    logger.info(
      `powerd preventScreenSaver = ${lipc.stdout.trim()} (los scripts KUAL Start/Stop podrán usarlo)`,
    );
  } else {
    logger.warn('lipc preventScreenSaver no disponible; los scripts KUAL lo omitirán');
  }

  return mkdirRes.exitCode === 0;
}
