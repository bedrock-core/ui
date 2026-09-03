/* eslint-disable @typescript-eslint/no-unsafe-type-assertion */
import { isFunction } from '..';
import { isInInteractiveTransaction, scheduleLogicPass, triggerCleanup } from '../render/session';
import { containerExit, markExit } from './exit';
import { requirePlayer } from './owner';
import { getCurrentFiber } from './registry';
import { Context, Dispatcher, Fiber, HookSlot } from './types';
import { invariant, nextHookSlot } from './utils';

/**
 * Mounts a value-carrying slot: the persisted value when the owner's seed has
 * one for this position, the initial value otherwise. A seeded slot counts as
 * resolved from the start, since it no longer holds the initial value.
 */
function mountValueSlot(fiber: Fiber, tag: 'state' | 'reducer', initial: unknown): HookSlot {
  const index = fiber.hookIndex;
  const slot = nextHookSlot(fiber, tag);
  const seeded = fiber.seed?.has(index) ?? false;

  slot.value = seeded ? fiber.seed?.get(index) : initial;
  slot.initial = initial;
  slot.resolved = seeded;

  return slot;
}

/** Commits a new value into a slot and wakes the owner's session, unless nothing changed. */
function commit(fiber: Fiber, slot: HookSlot, next: unknown): void {
  if (Object.is(next, slot.value)) {
    return;
  }

  slot.value = next;

  if (!slot.resolved && !Object.is(next, slot.initial)) {
    slot.resolved = true;
  }

  scheduleLogicPass(fiber.owner);
}

function currentPlayer(): ReturnType<Dispatcher['usePlayer']> {
  const [fiber] = getCurrentFiber();

  invariant(fiber, 'usePlayer');

  return requirePlayer(fiber.owner, 'usePlayer');
}

/**
 * The handle `useExit` returns: a form closes for its player; a container
 * closes only on the client, so its handle is the press that becomes the
 * screen's close button.
 */
function exitHandle(): () => void {
  const [fiber] = getCurrentFiber();

  invariant(fiber, 'useExit');

  const { owner } = fiber;

  if (owner.kind !== 'player') {
    return containerExit;
  }

  return markExit((): void => {
    fiber.shouldRender = false;

    // If not in an interactive transaction (e.g., called from useEffect),
    if (!isInInteractiveTransaction(owner)) {
      triggerCleanup(owner, true);
    }
  });
}

export const MountDispatcher: Dispatcher = {
  useState<T>(initial: T | (() => T)) {
    const [fiber] = getCurrentFiber();

    invariant(fiber, 'useState');

    const slot = mountValueSlot(fiber, 'state', isFunction(initial) ? initial() : initial);

    const setter = (v: T | ((prev: T) => T)): void => {
      commit(fiber, slot, isFunction(v) ? v(slot.value) : v);
    };

    return [slot.value as T, setter];
  },

  useEffect(effect: () => (() => void) | void, deps?: readonly unknown[]) {
    const [fiber] = getCurrentFiber();

    invariant(fiber, 'useEffect');

    const slotIndex = fiber.hookIndex;
    const slot = nextHookSlot(fiber, 'effect');

    slot.deps = deps;

    fiber.pendingEffects.push({ slotIndex, effect, deps });
  },

  useRef<T>(initial: T) {
    const [fiber] = getCurrentFiber();

    invariant(fiber, 'useRef');

    const slot = nextHookSlot(fiber, 'ref');

    if (!slot.value) {
      slot.value = { current: initial };
    }

    return slot.value as { current: T };
  },

  useContext<T>(ctx: Context<T>) {
    const [fiber] = getCurrentFiber();

    invariant(fiber, 'useContext');

    const slot = nextHookSlot(fiber, 'context');
    const value = (fiber.contextSnapshot?.get(ctx as Context<unknown>)) ?? ctx.defaultValue;

    slot.value = value;

    return value as T;
  },

  useReducer<S, A>(reducer: (s: S, a: A) => S, initial: S) {
    const [fiber] = getCurrentFiber();

    invariant(fiber, 'useReducer');

    const slot = mountValueSlot(fiber, 'reducer', initial);

    const dispatch = (action: A): void => {
      commit(fiber, slot, reducer(slot.value as S, action));
    };

    return [slot.value as S, dispatch];
  },

  usePlayer() {
    return currentPlayer();
  },

  useExit() {
    return exitHandle();
  },

  useEvent<T, O>(
    signal: { subscribe(cb: (e: T) => void, options?: O): (e: T) => void; unsubscribe(cb: (e: T) => void): void },
    callback: (event: T) => void,
    options?: O,
    deps?: readonly unknown[],
  ) {
    const allDeps = deps ? [...deps, signal, callback, options] : [signal, callback, options];

    return this.useEffect(() => {
      signal.subscribe(callback, options);

      return () => {
        signal.unsubscribe(callback);
      };
    }, allDeps);
  },
};

export const UpdateDispatcher: Dispatcher = {
  useState<T>(initial: T | (() => T)) {
    const [fiber] = getCurrentFiber();

    invariant(fiber, 'useState');

    const slot = nextHookSlot(fiber, 'state');

    // On update, slot.value must exist; if not, hook order changed
    if (slot.value === undefined) {
      // initialize if genuinely first run on this position (edge case)
      slot.value = isFunction(initial) ? initial() : initial;

      if (slot.initial === undefined) {
        slot.initial = slot.value;
        slot.resolved = false;
      }
    }

    const setter = (v: T | ((prev: T) => T)): void => {
      commit(fiber, slot, isFunction(v) ? v(slot.value) : v);
    };

    return [slot.value as T, setter];
  },

  useEffect(effect: () => (() => void) | void, deps?: readonly unknown[]) {
    const [fiber] = getCurrentFiber();

    invariant(fiber, 'useEffect');

    const slotIndex = fiber.hookIndex;
    const slot = nextHookSlot(fiber, 'effect');

    // No deps = run every render; otherwise use shallow comparison of array items
    if (deps === undefined) {
      // Always schedule when no dependency list is provided
      slot.deps = undefined;
      fiber.pendingEffects.push({ slotIndex, effect, deps });

      return;
    }

    // If we have a dependency array, schedule only when changed
    const prevDeps = slot.deps;

    let changed = false;

    if (!prevDeps) {
      // First run after mount in update phase, or previously uninitialized
      changed = true;
    } else if (prevDeps.length !== deps.length) {
      changed = true;
    } else {
      for (let i = 0; i < deps.length; i++) {
        if (!Object.is(prevDeps[i], deps[i])) {
          changed = true;
          break;
        }
      }
    }

    if (changed) {
      slot.deps = deps;

      fiber.pendingEffects.push({ slotIndex, effect, deps });
    }
  },

  useRef<T>(initial: T) {
    const [fiber] = getCurrentFiber();

    invariant(fiber, 'useRef');

    const slot = nextHookSlot(fiber, 'ref');

    if (!slot.value) {
      slot.value = { current: initial };
    }

    return slot.value as { current: T };
  },

  useContext<T>(ctx: Context<T>) {
    const [fiber] = getCurrentFiber();

    invariant(fiber, 'useContext');

    const slot = nextHookSlot(fiber, 'context');
    const value = (fiber.contextSnapshot?.get(ctx as Context<unknown>)) ?? ctx.defaultValue;

    slot.value = value;

    return value as T;
  },

  useReducer<S, A>(reducer: (s: S, a: A) => S, initial: S) {
    const [fiber] = getCurrentFiber();

    invariant(fiber, 'useReducer');

    const slot = nextHookSlot(fiber, 'reducer');

    if (slot.value === undefined) {
      slot.value = initial;

      if (slot.initial === undefined) {
        slot.initial = slot.value;
        slot.resolved = false;
      }
    }

    const dispatch = (action: A): void => {
      commit(fiber, slot, reducer(slot.value as S, action));
    };

    return [slot.value as S, dispatch];
  },

  usePlayer() {
    return currentPlayer();
  },

  useExit() {
    return exitHandle();
  },

  useEvent<T, O>(
    signal: { subscribe(cb: (e: T) => void, options?: O): (e: T) => void; unsubscribe(cb: (e: T) => void): void },
    callback: (event: T) => void,
    options?: O,
    deps?: readonly unknown[],
  ) {
    const allDeps = deps ? [...deps, signal, callback, options] : [signal, callback, options];

    return this.useEffect(() => {
      signal.subscribe(callback, options);

      return () => {
        signal.unsubscribe(callback);
      };
    }, allDeps);
  },
};
