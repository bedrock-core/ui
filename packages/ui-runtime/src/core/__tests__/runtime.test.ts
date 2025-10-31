import { describe, it, expect } from 'vitest';
import { world } from '@minecraft/server';
import { Runtime } from '../runtime';
import type { Scheduler } from '../types';
import { Fragment } from '../components/Fragment';

class TestScheduler implements Scheduler {
  private _cb: (() => void) | undefined;
  private _running = false;

  start(cb: () => void): void {
    this._cb = cb;
    this._running = true;
  }

  stop(): void {
    this._running = false;
    this._cb = undefined;
  }

  isRunning(): boolean {
    return this._running;
  }

  tickOnce(): void {
    this._cb?.();
  }
}

describe('Runtime loop', () => {
  it('emits shouldRender on start, trigger, and condition', () => {
    const player = world.getAllPlayers()[0];
    const scheduler = new TestScheduler();
    const root = { type: Fragment, props: {} } as const;

    const runtime = new Runtime(player, root, { tickInterval: 1 }, scheduler);

    let renders = 0;
    runtime.on('shouldRender', () => { renders++; });

    // Start: should emit once immediately
    runtime.start();
    expect(renders).toBe(1);

    // Trigger a pending render; fires on next tick
    runtime.triggerRender('test');
    scheduler.tickOnce();
    expect(renders).toBe(2);

    // Register a condition that returns true; fires on next tick
    runtime.registerCondition(() => true);
    scheduler.tickOnce();
    expect(renders).toBe(3);

    runtime.destroy();
  });
});
