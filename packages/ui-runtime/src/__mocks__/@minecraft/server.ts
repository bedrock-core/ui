/**
 * Mock for @minecraft/server
 * Provides minimal implementation for testing purposes
 */

export class Player {
  private constructor() {
    // Mock player instance - private constructor to match real API
  }
}

class World {
  getAllPlayers(): Player[] {
    // Return a single mock player for testing
    return [Reflect.construct(Player, [])];
  }
}

export const world = new World();

/**
 * Ticks per second used by the system shim to translate ticks into real time.
 * Defaults to Bedrock's 20 TPS; override with {@link __setTPS} in tests.
 */
export let TPS = 20;

/** Test helper: change the shim's TPS (and reset to 20 between tests). */
export function __setTPS(tps: number): void {
  TPS = tps;
}

const ticksToMs = (ticks: number): number => (ticks / TPS) * 1000;

/**
 * Shim of the `system` API backed by real timers. Tick-based scheduling is
 * converted to wall-clock time via {@link TPS}, so callbacks fire after the same
 * real delay the engine would produce (e.g. 1 tick ≈ 50ms at 20 TPS) instead of
 * resolving instantly.
 */
class System {
  private _nextId = 1;
  private readonly _handles = new Map<number, ReturnType<typeof setTimeout>>();

  run(callback: () => void): number {
    return this.runTimeout(callback, 1);
  }

  runTimeout(callback: () => void, ticks: number = 1): number {
    const id = this._nextId++;
    const handle = setTimeout(() => {
      this._handles.delete(id);
      callback();
    }, ticksToMs(ticks));

    this._handles.set(id, handle);

    return id;
  }

  runInterval(callback: () => void, ticks: number = 1): number {
    const id = this._nextId++;
    const handle = setInterval(callback, ticksToMs(ticks));

    this._handles.set(id, handle);

    return id;
  }

  clearRun(id: number): void {
    const handle = this._handles.get(id);

    if (handle !== undefined) {
      clearTimeout(handle);
      clearInterval(handle);
      this._handles.delete(id);
    }
  }

  waitTicks(ticks: number): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(resolve, ticksToMs(ticks));
    });
  }
}

export const system = new System();
