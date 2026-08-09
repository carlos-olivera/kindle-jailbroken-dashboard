import { spawn } from 'node:child_process';
import { createReadStream } from 'node:fs';

/**
 * Minimal argument-array process runner (execa was unavailable offline; this
 * keeps the same safety property: no shell, no string interpolation).
 */
export interface ExecResult {
  exitCode: number;
  stdout: string;
  stderr: string;
}

export class ExecError extends Error {
  constructor(
    message: string,
    readonly result: ExecResult,
  ) {
    super(message);
    this.name = 'ExecError';
  }
}

export interface ExecOptions {
  timeoutMs?: number;
  /** When false (default) a non-zero exit throws ExecError. */
  reject?: boolean;
  /** Stream this local file into the child's stdin (used for ssh uploads). */
  stdinFile?: string;
}

export type ExecFn = (file: string, args: string[], options?: ExecOptions) => Promise<ExecResult>;

export const execFile: ExecFn = (file, args, options = {}) => {
  const { timeoutMs = 30_000, reject = true, stdinFile } = options;
  return new Promise<ExecResult>((resolve, rejectPromise) => {
    const child = spawn(file, args, {
      stdio: [stdinFile !== undefined ? 'pipe' : 'ignore', 'pipe', 'pipe'],
      shell: false,
    });

    if (stdinFile !== undefined && child.stdin) {
      const input = createReadStream(stdinFile);
      input.on('error', () => child.kill('SIGKILL'));
      input.pipe(child.stdin);
    }
    let stdout = '';
    let stderr = '';
    let settled = false;

    const timer = setTimeout(() => {
      if (!settled) child.kill('SIGKILL');
    }, timeoutMs);

    child.stdout?.on('data', (d: Buffer) => (stdout += d.toString()));
    child.stderr?.on('data', (d: Buffer) => (stderr += d.toString()));

    child.on('error', (err) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      rejectPromise(
        new ExecError(`no se pudo ejecutar ${file}: ${err.message}`, {
          exitCode: -1,
          stdout,
          stderr,
        }),
      );
    });

    child.on('close', (code) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      const result: ExecResult = { exitCode: code ?? -1, stdout, stderr };
      if (reject && result.exitCode !== 0) {
        rejectPromise(
          new ExecError(
            `${file} salió con código ${result.exitCode}: ${stderr.trim().slice(0, 400)}`,
            result,
          ),
        );
      } else {
        resolve(result);
      }
    });
  });
};
