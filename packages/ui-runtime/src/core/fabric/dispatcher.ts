import { isFunction } from '../';
import { getCurrentFiber } from './registry';
import { Dispatcher, Context, HookSlot } from './types';
import { invariant, nextHookSlot } from './utils';

export const MountDispatcher: Dispatcher = {
  useState<T>(initial: T | (() => T)) {
    const [fiber] = getCurrentFiber();
    invariant(fiber, 'useState');

    const slot: HookSlot = nextHookSlot(fiber, 'state');
    const value: T = isFunction(initial) ? initial() : initial;

    slot.value = value;
    slot.initial = value;
    slot.resolved = false;

    const setter = (v: T | ((prev: T) => T)): void => {
      const nextVal = isFunction(v) ? v(slot.value) : v;

      slot.value = nextVal;

      if (!slot.resolved && !Object.is(nextVal, slot.initial)) {
        slot.resolved = true;
      }
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
    const value = (fiber.contextSnapshot?.get(ctx as Context<unknown>) as T) ?? ctx.defaultValue;

    slot.value = value;

    return value;
  },

  useReducer<S, A>(reducer: (s: S, a: A) => S, initial: S) {
    const [fiber] = getCurrentFiber();
    invariant(fiber, 'useReducer');

    const slot = nextHookSlot(fiber, 'reducer');

    slot.value = initial;
    slot.initial = initial;
    slot.resolved = false;

    const dispatch = (action: A): void => {
      const nextVal = reducer(slot.value as S, action);
      slot.value = nextVal;

      if (!slot.resolved && !Object.is(nextVal, slot.initial)) {
        slot.resolved = true;
      }
    };

    return [slot.value as S, dispatch];
  },

  usePlayer() {
    const [fiber] = getCurrentFiber();
    invariant(fiber, 'usePlayer');

    return fiber.player;
  },

  useExit() {
    const [fiber] = getCurrentFiber();
    invariant(fiber, 'useExit');

    return (): void => {
      fiber.shouldRender = false;
    };
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
      const nextVal = isFunction(v) ? v(slot.value as T) : v;

      slot.value = nextVal;

      if (!slot.resolved && !Object.is(nextVal, slot.initial)) {
        slot.resolved = true;
      }
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
    const value = (fiber.contextSnapshot?.get(ctx as Context<unknown>) as T) ?? ctx.defaultValue;

    slot.value = value;

    return value;
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
      const nextVal = reducer(slot.value as S, action);
      slot.value = nextVal;

      if (!slot.resolved && !Object.is(nextVal, slot.initial)) {
        slot.resolved = true;
      }
    };

    return [slot.value as S, dispatch];
  },

  usePlayer() {
    const [fiber] = getCurrentFiber();
    invariant(fiber, 'usePlayer');

    return fiber.player;
  },

  useExit() {
    const [fiber] = getCurrentFiber();
    invariant(fiber, 'useExit');

    return (): void => {
      fiber.shouldRender = false;
    };
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
