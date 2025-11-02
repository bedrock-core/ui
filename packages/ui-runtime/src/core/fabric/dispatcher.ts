import { getFiberContextValue, getCurrentFiber } from './registry';
import { Dispatcher, FiberContext } from './types';
import { invariant, nextHookSlot } from './utils';

export const MountDispatcher: Dispatcher = {
  useState<T>(initial: T | (() => T)) {
    const [fiber] = getCurrentFiber();

    invariant(fiber, 'useState called without an active fiber');
    const slot = nextHookSlot(fiber, 'state');
    const value = typeof initial === 'function' ? (initial as () => T)() : initial;
    slot.value = value;
    const setter = (v: T | ((prev: T) => T)): void => {
      const nextVal = typeof v === 'function' ? (v as (prev: T) => T)(slot.value as T) : v;
      slot.value = nextVal;
    };

    return [slot.value as T, setter];
  },

  useEffect(effect: () => (() => void) | void | undefined, deps?: readonly unknown[]) {
    const [fiber] = getCurrentFiber();

    invariant(fiber, 'useEffect called without an active fiber');
    const slotIndex = fiber.hookIndex;
    const slot = nextHookSlot(fiber, 'effect');
    slot.deps = deps;
    fiber.pendingEffects.push({ slotIndex, effect, deps });
  },

  useRef<T>(initial: T) {
    const [fiber] = getCurrentFiber();

    invariant(fiber, 'useRef called without an active fiber');
    const slot = nextHookSlot(fiber, 'ref');
    if (!slot.value) slot.value = { current: initial } as unknown as { current: T };

    return slot.value as { current: T };
  },

  useContext<T>(ctx: FiberContext<T>) {
    const [fiber] = getCurrentFiber();

    invariant(fiber, 'useContext called without an active fiber');
    const slot = nextHookSlot(fiber, 'context');
    fiber.contextDeps.add(ctx.id);
    const value = getFiberContextValue(ctx);
    slot.value = value;

    return value;
  },

  useReducer<S, A>(reducer: (s: S, a: A) => S, initial: S) {
    const [fiber] = getCurrentFiber();

    invariant(fiber, 'useReducer called without an active fiber');
    const slot = nextHookSlot(fiber, 'reducer');
    slot.value = initial;
    const dispatch = (action: A): void => {
      slot.value = reducer(slot.value as S, action);
      // In a full system, we would enqueue a re-render for this fiber here
    };

    return [slot.value as S, dispatch];
  },

  usePlayer() {
    const [fiber] = getCurrentFiber();
    invariant(fiber, 'usePlayer called without an active fiber');

    return fiber.player;
  },

  useExit() {
    const [fiber] = getCurrentFiber();
    invariant(fiber, 'useExit called without an active fiber');

    return (): void => {
      fiber.shouldRender = false;
    };
  },

  useEvent<T, O = Record<string, unknown>>(
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

    invariant(fiber, 'useState called without an active fiber');
    const slot = nextHookSlot(fiber, 'state');
    // On update, slot.value must exist; if not, hook order changed
    if (typeof slot.value === 'undefined') {
      // initialize if genuinely first run on this position (edge case)
      slot.value = typeof initial === 'function' ? (initial as () => T)() : initial;
    }
    const setter = (v: T | ((prev: T) => T)): void => {
      const nextVal = typeof v === 'function' ? (v as (prev: T) => T)(slot.value as T) : v;
      slot.value = nextVal;
    };

    return [slot.value as T, setter];
  },

  useEffect(effect: () => (() => void) | void | undefined, deps?: readonly unknown[]) {
    const [fiber] = getCurrentFiber();

    invariant(fiber, 'useEffect called without an active fiber');
    const slotIndex = fiber.hookIndex;
    const slot = nextHookSlot(fiber, 'effect');
    // No deps = run every render; otherwise check if deps changed
    const hasNoDeps = deps === undefined;
    const hasChanged = hasNoDeps || !Object.is(slot.deps, deps);
    if (hasChanged) {
      slot.deps = deps;
      fiber.pendingEffects.push({ slotIndex, effect, deps });
    }
  },

  useRef<T>(initial: T) {
    const [fiber] = getCurrentFiber();

    invariant(fiber, 'useRef called without an active fiber');
    const slot = nextHookSlot(fiber, 'ref');
    if (!slot.value) slot.value = { current: initial } as unknown as { current: T };

    return slot.value as { current: T };
  },

  useContext<T>(ctx: FiberContext<T>) {
    const [fiber] = getCurrentFiber();

    invariant(fiber, 'useContext called without an active fiber');
    const slot = nextHookSlot(fiber, 'context');
    fiber.contextDeps.add(ctx.id);
    const value = getFiberContextValue(ctx);
    slot.value = value;

    return value;
  },

  useReducer<S, A>(reducer: (s: S, a: A) => S, initial: S) {
    const [fiber] = getCurrentFiber();

    invariant(fiber, 'useReducer called without an active fiber');
    const slot = nextHookSlot(fiber, 'reducer');
    if (typeof slot.value === 'undefined') slot.value = initial;
    const dispatch = (action: A): void => {
      slot.value = reducer(slot.value as S, action);
    };

    return [slot.value as S, dispatch];
  },

  usePlayer() {
    const [fiber] = getCurrentFiber();
    invariant(fiber, 'usePlayer called without an active fiber');

    return fiber.player;
  },

  useExit() {
    const [fiber] = getCurrentFiber();
    invariant(fiber, 'useExit called without an active fiber');

    return (): void => {
      fiber.shouldRender = false;
    };
  },

  useEvent<T, O = Record<string, unknown>>(
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
