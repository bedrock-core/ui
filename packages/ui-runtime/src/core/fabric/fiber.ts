import { Player } from '@minecraft/server';
import { MountDispatcher, UpdateDispatcher } from './dispatcher';
import { FiberRegistry, getCurrentFiber, setCurrentFiber } from './registry';
import { Fiber } from './types';

export function createFiber(id: string, player: Player): Fiber {
  const fiber: Fiber = {
    id,
    hookStates: [],
    hookIndex: 0,
    dispatcher: MountDispatcher,
    player,
    contextDeps: new Set(),
    pendingEffects: [],
    shouldRender: true,
  };
  FiberRegistry.set(id, fiber);

  return fiber;
}

export function getFiber(id: string): Fiber | undefined {
  return FiberRegistry.get(id);
}

export function deleteFiber(id: string): void {
  const fiber = FiberRegistry.get(id);
  if (!fiber) return;
  // Run any remaining cleanups
  for (let i = 0; i < fiber.hookStates.length; i++) {
    const slot = fiber.hookStates[i];
    if (slot?.cleanup) {
      try { slot.cleanup(); } catch { /* noop */ }
      slot.cleanup = undefined;
    }
  }
  FiberRegistry.delete(id);
}

/**
 * Get all fibers for a specific player.
 * @param player - Player instance to filter fibers by
 * @returns Array of fiber IDs belonging to this player
 */
export function getFibersForPlayer(player: Player): string[] {
  const fibers: string[] = [];
  for (const [id, fiber] of FiberRegistry) {
    if (fiber.player === player) {
      fibers.push(id);
    }
  }

  return fibers;
}

/**
 * Activate a fiber and evaluate `fn` within its dynamic scope.
 * Resets hookIndex and schedules effects; effects are flushed after `fn`.
 * Optionally binds player metadata to the fiber.
 */
export async function activateFiber<T>(
  fiber: Fiber,
  fn: () => T | Promise<T>,
): Promise<T> {
  const [prevFiber, prevDispatcher] = getCurrentFiber();

  fiber.hookIndex = 0;
  fiber.pendingEffects.length = 0;

  setCurrentFiber(fiber, fiber.dispatcher);

  try {
    const result = fn();
    const awaited = result instanceof Promise ? await result : result;
    // After successful evaluation, move to Update phase for next runs
    fiber.dispatcher = UpdateDispatcher;
    // Flush effects after execution
    flushPendingEffects(fiber);

    return awaited;
  } finally {
    setCurrentFiber(prevFiber, prevDispatcher);
  }
}

/**
 * Helper to run an arbitrary callback under the current fiber context.
 * Useful for async continuations where hooks are not called but code relies
 * on the same dynamic fiber (e.g., reading getCurrentFiber()).
 */
export function runInFiber<R>(fiber: Fiber, cb: () => R): R {
  const [prevFiber, prevDispatcher] = getCurrentFiber();

  setCurrentFiber(fiber, fiber.dispatcher);

  try {
    return cb();
  } finally {
    setCurrentFiber(prevFiber, prevDispatcher);
  }
}

function flushPendingEffects(fiber: Fiber): void {
  const pending = fiber.pendingEffects.splice(0, fiber.pendingEffects.length);
  for (const { slotIndex, effect } of pending) {
    const slot = fiber.hookStates[slotIndex];
    // Run previous cleanup before next effect
    if (slot?.cleanup) {
      try { slot.cleanup(); } catch { /* noop */ }
      slot.cleanup = undefined;
    }
    let cleanup = undefined;
    try {
      cleanup = effect();
    } catch {
      cleanup = undefined;
    }
    if (typeof cleanup === 'function') slot.cleanup = cleanup as () => void;
  }
}
