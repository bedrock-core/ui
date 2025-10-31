import { system } from '@minecraft/server';
import type { Scheduler } from './types';

/**
 * Default tick-based scheduler backed by Minecraft's system API.
 * Single-interval, idempotent start/stop.
 */
export class DefaultScheduler implements Scheduler {
  private _intervalId: number | undefined;

  start(tick: () => void, intervalTicks: number = 1): void {
    if (this._intervalId !== undefined) return;
    this._intervalId = system.runInterval(tick, intervalTicks);
  }

  stop(): void {
    if (this._intervalId === undefined) return;
    system.clearRun(this._intervalId);
    this._intervalId = undefined;
  }

  isRunning(): boolean {
    return this._intervalId !== undefined;
  }
}
