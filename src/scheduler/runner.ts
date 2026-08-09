import type { Logger } from 'pino';

export interface SchedulerOptions {
  intervalMs: number;
  /** Full-flash refresh on the first cycle and every N cycles. */
  fullRefreshEvery: number;
  logger: Logger;
  /** Injectable timer functions for tests. */
  setTimeoutFn?: typeof setTimeout;
  clearTimeoutFn?: typeof clearTimeout;
}

export type CycleFn = (cycle: { count: number; flash: boolean }) => Promise<void>;

/**
 * Fixed-interval scheduler with overlap prevention: if a cycle runs longer
 * than the interval, the next run is skipped (not queued) until the current
 * one finishes. SIGINT/SIGTERM stop scheduling and let the active cycle end.
 */
export class Runner {
  private timer: ReturnType<typeof setTimeout> | null = null;
  private running = false;
  private stopped = false;
  private count = 0;
  private stopResolvers: Array<() => void> = [];

  constructor(
    private readonly fn: CycleFn,
    private readonly options: SchedulerOptions,
  ) {}

  get cycleCount(): number {
    return this.count;
  }

  get isRunning(): boolean {
    return this.running;
  }

  /** Runs one cycle immediately, then schedules repeats. */
  async start(): Promise<void> {
    await this.tick();
    this.scheduleNext();
  }

  private scheduleNext(): void {
    if (this.stopped) return;
    const st = this.options.setTimeoutFn ?? setTimeout;
    this.timer = st(() => {
      void this.tick().finally(() => this.scheduleNext());
    }, this.options.intervalMs);
  }

  /** Executes a cycle unless one is already active. */
  async tick(): Promise<void> {
    if (this.running) {
      this.options.logger.warn('ciclo anterior aún activo; se omite esta ejecución');
      return;
    }
    if (this.stopped) return;
    this.running = true;
    const flash = this.count % this.options.fullRefreshEvery === 0;
    try {
      await this.fn({ count: this.count, flash });
    } catch (err) {
      this.options.logger.error(
        { err: err instanceof Error ? err.message : String(err) },
        'ciclo falló',
      );
    } finally {
      this.count += 1;
      this.running = false;
      for (const resolve of this.stopResolvers.splice(0)) resolve();
    }
  }

  /** Stops scheduling; resolves when the active cycle (if any) finishes. */
  async stop(): Promise<void> {
    this.stopped = true;
    if (this.timer !== null) {
      (this.options.clearTimeoutFn ?? clearTimeout)(this.timer);
      this.timer = null;
    }
    if (this.running) {
      await new Promise<void>((resolve) => this.stopResolvers.push(resolve));
    }
  }
}
