import { describe, expect, it } from 'vitest';
import {
  buildScpArgs,
  buildSshArgs,
  buildSshUploadArgs,
  sshTarget,
  assertSafeHost,
  assertSafeRemotePath,
  type SshTarget,
} from '../src/kindle/ssh.js';
import { buildFbinkImageArgs } from '../src/kindle/fbink.js';
import { loadConfig } from '../src/config.js';

const env = {
  KINDLE_HOST: '192.168.1.77',
  KINDLE_RECOVERY_HOST: '192.168.15.244',
  KINDLE_USER: 'root',
  KINDLE_SSH_PORT: '22',
  KINDLE_SSH_KEY: '~/.ssh/kindle_pw4_ed25519',
  KINDLE_REMOTE_DIR: '/mnt/us/financial-dashboard',
  FBINK_PATH: '/mnt/us/libkh/bin/fbink',
} as NodeJS.ProcessEnv;

describe('ssh argument construction', () => {
  const config = loadConfig(env);
  const target = sshTarget(config, 'wifi');

  it('expands ~ in the key path', () => {
    expect(target.keyPath).not.toContain('~');
    expect(target.keyPath).toContain('/.ssh/kindle_pw4_ed25519');
  });

  it('wifi transport uses KINDLE_HOST; usb-recovery uses the recovery host', () => {
    expect(target.host).toBe('192.168.1.77');
    expect(sshTarget(config, 'usb-recovery').host).toBe('192.168.15.244');
  });

  it('builds ssh args as an array with pinned known-hosts and no shell string', () => {
    const args = buildSshArgs(target, ['uname', '-a']);
    expect(args).toContain('root@192.168.1.77');
    expect(args).toContain('--');
    expect(args.at(-2)).toBe('uname');
    expect(args.at(-1)).toBe('-a');
    expect(args.join(' ')).toContain('UserKnownHostsFile=');
    expect(args.join(' ')).toContain('StrictHostKeyChecking=accept-new');
    expect(args.join(' ')).not.toContain('StrictHostKeyChecking=no');
  });

  it('builds scp args with -O, -P for port, and target path', () => {
    const args = buildScpArgs(
      target,
      'artifacts/dashboard.png',
      '/mnt/us/financial-dashboard/.tmp.png',
    );
    expect(args[0]).toBe('-O');
    expect(args).toContain('-P');
    expect(args).not.toContain('-p');
    expect(args.at(-1)).toBe('root@192.168.1.77:/mnt/us/financial-dashboard/.tmp.png');
    expect(args.at(-2)).toBe('artifacts/dashboard.png');
  });

  it('builds streaming upload args (cat > tmp) and validates the remote path', () => {
    const args = buildSshUploadArgs(target, '/mnt/us/financial-dashboard/.tmp.png');
    expect(args.at(-3)).toBe('sh');
    expect(args.at(-2)).toBe('-c');
    expect(args.at(-1)).toBe("'cat > /mnt/us/financial-dashboard/.tmp.png'");
    expect(() => buildSshUploadArgs(target, '/mnt/us/a;b')).toThrow();
  });
});

describe('no command injection through configuration', () => {
  it('rejects hosts with shell metacharacters or option injection', () => {
    for (const bad of ['host;rm -rf /', 'host$(x)', 'host cmd', '-oProxyCommand=evil', 'a|b', '']) {
      expect(() => assertSafeHost(bad), bad).toThrow();
    }
    expect(() => assertSafeHost('192.168.1.50')).not.toThrow();
    expect(() => assertSafeHost('kindle.lan')).not.toThrow();
  });

  it('rejects remote paths with metacharacters or relative form', () => {
    for (const bad of [
      '/mnt/us/x;reboot',
      '/mnt/us/a b',
      'mnt/us/rel',
      '/mnt/us/$(x)',
      "/mnt/us/'q'",
    ]) {
      expect(() => assertSafeRemotePath(bad), bad).toThrow();
    }
    expect(() => assertSafeRemotePath('/mnt/us/financial-dashboard/screen.png')).not.toThrow();
  });

  it('config-level validation rejects malicious env values', () => {
    expect(() => loadConfig({ ...env, KINDLE_HOST: '1.2.3.4; reboot' })).toThrow();
    expect(() => loadConfig({ ...env, KINDLE_REMOTE_DIR: '/mnt/us/a;b' })).toThrow();
    expect(() => loadConfig({ ...env, KINDLE_USER: 'root; id' })).toThrow();
  });
});

describe('fbink argument generation', () => {
  it('builds the image command with clear + quiet, and flash only when asked', () => {
    const base: SshTarget | null = null;
    void base;
    const noFlash = buildFbinkImageArgs({
      fbinkPath: '/mnt/us/libkh/bin/fbink',
      imagePath: '/mnt/us/fd/screen.png',
      flash: false,
    });
    expect(noFlash).toEqual([
      '/mnt/us/libkh/bin/fbink',
      '-q',
      '-c',
      '-g',
      'file=/mnt/us/fd/screen.png,x=0,y=0',
    ]);
    const flash = buildFbinkImageArgs({
      fbinkPath: '/mnt/us/libkh/bin/fbink',
      imagePath: '/mnt/us/fd/screen.png',
      flash: true,
    });
    expect(flash.at(-1)).toBe('-f');
  });
});
