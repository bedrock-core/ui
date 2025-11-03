import { Player } from '@minecraft/server';
import { MountDispatcher, UpdateDispatcher } from './dispatcher';
import { FiberRegistry, getCurrentFiber, setCurrentFiber } from './registry';
import { Fiber, HookSlot } from './types';

export function createFiber(id: string, player: Player): Fiber {
  const fiber: Fiber = {
    id,
    hookStates: [],
    hookIndex: 0,
    dispatcher: MountDispatcher,
    player,
    pendingEffects: [],
    shouldRender: true,
    isSuspenseBoundary: false,
    parent: undefined,
    child: undefined,
    sibling: undefined,
    index: -1,
  };

  FiberRegistry.set(id, fiber);

  return fiber;
}

export function getFiber(id: string): Fiber | undefined {
  return FiberRegistry.get(id);
}

export function deleteFiber(id: string): void {
  const fiber: Fiber | undefined = FiberRegistry.get(id);

  if (!fiber) {
    return;
  }

  // Detach from parent/sibling chain defensively
  const parent = fiber.parent;

  if (parent) {
    if (parent.child === fiber) {
      parent.child = fiber.sibling;
    } else {
      let prev = parent.child;

      while (prev?.sibling && prev.sibling !== fiber) {
        prev = prev.sibling;
      }

      if (prev?.sibling === fiber) {
        prev.sibling = fiber.sibling;
      }
    }
  }

  fiber.parent = undefined;
  fiber.sibling = undefined;

  // Run any remaining cleanups
  for (let i = 0; i < fiber.hookStates.length; i++) {
    const slot: HookSlot = fiber.hookStates[i];

    if (slot.cleanup) {
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
export function getFibersForPlayer(player: Player): Fiber[] {
  const fibers: Fiber[] = [];

  FiberRegistry.forEach(element => {
    if (element.player.id === player.id) {
      fibers.push(element);
    }
  });

  return fibers;
}

/**
 * Activate a fiber and evaluate `fn` within its dynamic scope.
 * Resets hookIndex and schedules effects; effects are flushed after `fn`.
 */
export function activateFiber<T>(
  fiber: Fiber,
  fn: () => T,
): T {
  const [prevFiber, prevDispatcher] = getCurrentFiber();

  fiber.hookIndex = 0;
  fiber.pendingEffects = [];

  setCurrentFiber(fiber, fiber.dispatcher);

  try {
    const result: T = fn();

    // After successful evaluation, move to Update phase for next runs
    fiber.dispatcher = UpdateDispatcher;
    // Flush effects after execution
    flushPendingEffects(fiber);

    return result;
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
    const slot: HookSlot = fiber.hookStates[slotIndex];

    // Run previous cleanup before next effect
    if (slot.cleanup) {
      try { slot.cleanup(); } catch { /* noop */ }

      slot.cleanup = undefined;
    }

    let cleanup = undefined;

    try {
      cleanup = effect();
    } catch {
      cleanup = undefined;
    }

    if (typeof cleanup === 'function') {
      slot.cleanup = cleanup;
    }
  }
}
