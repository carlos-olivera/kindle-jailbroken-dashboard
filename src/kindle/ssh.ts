import path from 'node:path';
import type { AppConfig } from '../config.js';

export type Transport = 'wifi' | 'usb-recovery';

export interface SshTarget {
  host: string;
  port: number;
  user: string;
  keyPath: string;
  knownHostsPath: string;
}

const HOST_RE = /^[A-Za-z0-9._-]+$/;
const REMOTE_PATH_RE = /^\/[A-Za-z0-9._/-]+$/;

/** Validates values that end up in ssh/scp argument arrays. */
export function assertSafeHost(host: string): void {
  if (!HOST_RE.test(host) || host.startsWith('-')) {
    throw new Error(`host inválido: "${host}"`);
  }
}

export function assertSafeRemotePath(p: string): void {
  if (!REMOTE_PATH_RE.test(p)) {
    throw new Error(`ruta remota inválida: "${p}"`);
  }
}

export function sshTarget(config: AppConfig, transport: Transport): SshTarget {
  const host = transport === 'usb-recovery' ? config.kindleRecoveryHost : config.kindleHost;
  assertSafeHost(host);
  if (!/^[a-z_][a-z0-9_-]*$/i.test(config.kindleUser)) {
    throw new Error(`usuario inválido: "${config.kindleUser}"`);
  }
  return {
    host,
    port: config.kindleSshPort,
    user: config.kindleUser,
    keyPath: config.kindleSshKeyExpanded,
    knownHostsPath: path.resolve(config.knownHostsFile),
  };
}

/**
 * Common OpenSSH options. Host-key checking stays on: keys are pinned in a
 * project-local known-hosts file (`accept-new` records the key on first
 * connect and then enforces it).
 */
function commonOptions(target: SshTarget): string[] {
  return [
    '-i',
    target.keyPath,
    '-p',
    String(target.port),
    '-o',
    'BatchMode=yes',
    '-o',
    'IdentitiesOnly=yes',
    '-o',
    'ConnectTimeout=10',
    '-o',
    `UserKnownHostsFile=${target.knownHostsPath}`,
    '-o',
    'StrictHostKeyChecking=accept-new',
    // Dropbear on old Kindles offers legacy key exchange/host key algos.
    '-o',
    'HostKeyAlgorithms=+ssh-rsa',
    '-o',
    'PubkeyAcceptedAlgorithms=+ssh-rsa',
  ];
}

/** Builds the argv (after the executable) for `ssh <target> -- <command...>`. */
export function buildSshArgs(target: SshTarget, remoteCommand: string[]): string[] {
  return [...commonOptions(target), `${target.user}@${target.host}`, '--', ...remoteCommand];
}

/** Builds the argv for `scp -O <local> <target>:<remote>`. */
export function buildScpArgs(target: SshTarget, localPath: string, remotePath: string): string[] {
  assertSafeRemotePath(remotePath);
  const opts = commonOptions(target);
  // scp takes -P for port, not -p.
  const portIdx = opts.indexOf('-p');
  if (portIdx !== -1) opts[portIdx] = '-P';
  return ['-O', ...opts, localPath, `${target.user}@${target.host}:${remotePath}`];
}

/**
 * Builds the argv for a streaming upload: `ssh <target> -- sh -c 'cat > path'`
 * with the file piped through stdin. Works even when the remote Dropbear has
 * no scp/sftp helper installed (as on this Kindle's USBNetworkLite build).
 */
export function buildSshUploadArgs(target: SshTarget, remotePath: string): string[] {
  assertSafeRemotePath(remotePath);
  return buildSshArgs(target, ['sh', '-c', `'cat > ${remotePath}'`]);
}
