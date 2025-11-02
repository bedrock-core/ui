import { Player } from '@minecraft/server';

/**
 * Fiber Dispatcher Runtime (per UPDATE_PLAN.md)
 * -------------------------------------------------
 * This file implements a minimal, self-contained fiber system with
 * phase-specific dispatchers (mount/update), a global fiber registry,
 * dynamically-scoped current fiber/dispatcher, and hook proxies that
 * delegate to the active dispatcher.
 *
 * Notes:
 * - No external deps; avoids Node async_hooks to remain environment-agnostic.
 * - Async safety: `activateFiber` preserves and restores context; for awaited
 *   work inside the activation, callers should wrap those continuations with
 *   `runInFiber` if they need hook calls later. This mirrors the plan's
 *   "async execution frame" concept without relying on platform APIs.
 */

// =============== Core Types ===============

export type HookCleanup = (() => void) | void | null;

interface HookSlot<T = unknown> {
  // Generic storage for any hook value
  value: T;
  // For effect/deps-based hooks
  deps?: readonly unknown[] | undefined;
  cleanup?: (() => void) | null;
  // Debug/inspection
  tag?: 'state' | 'effect' | 'ref' | 'reducer' | 'context';
}

export interface Context<T> {
  id: symbol;
  defaultValue: T;
}

export interface Dispatcher {
  useState<T>(initial: T | (() => T)): [T, (v: T | ((prev: T) => T)) => void];
  useEffect(effect: () => HookCleanup, deps?: readonly unknown[]): void;
  useRef<T>(initial: T): { current: T };
  useContext<T>(ctx: Context<T>): T;
  useReducer<S, A>(reducer: (s: S, a: A) => S, initial: S): [S, (a: A) => void];
}

export interface Fiber {
  id: string;
  hookStates: HookSlot[];
  hookIndex: number;
  dispatcher: Dispatcher; // phase-specific
  // Track which contexts this fiber depends on
  contextDeps: Set<symbol>;
  // Effects scheduled during the last evaluation
  pendingEffects: { slotIndex: number; effect: () => HookCleanup; deps?: readonly unknown[] | undefined }[];
  // Session metadata
  player: Player; // Player instance for this fiber
  shouldRender: boolean; // Flag for useExit to signal form should close
}

// =============== Global Registry & Dynamic Scope ===============

const FiberRegistry = new Map<string, Fiber>();

let currentFiber: Fiber | null = null;
let currentDispatcher: Dispatcher | null = null;

function setCurrent(fiber: Fiber | null, dispatcher: Dispatcher | null): void {
  currentFiber = fiber;
  currentDispatcher = dispatcher;
}

export function getCurrentFiber(): Fiber | null {
  return currentFiber;
}

export function getCurrentDispatcher(): Dispatcher | null {
  return currentDispatcher;
}

// =============== Context Registry ===============

const ContextRegistry = new Map<symbol, unknown>();

export function createContext<T>(defaultValue: T): Context<T> {
  return { id: Symbol('ctx'), defaultValue };
}

export function setContextValue<T>(ctx: Context<T>, value: T): void {
  ContextRegistry.set(ctx.id, value);
}

export function getContextValue<T>(ctx: Context<T>): T {
  if (ContextRegistry.has(ctx.id)) return ContextRegistry.get(ctx.id) as T;

  return ctx.defaultValue;
}

// =============== Utilities ===============
function invariant(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`[fiber2] ${message}`);
}

function nextHookSlot(fiber: Fiber, tag?: HookSlot['tag']): HookSlot {
  const idx = fiber.hookIndex++;
  let slot = fiber.hookStates[idx];
  if (!slot) {
    slot = { value: undefined, tag };
    fiber.hookStates[idx] = slot;
  } else if (tag && slot.tag && slot.tag !== tag) {
    // Soft guard to aid debugging when hook order shifts across types
    slot.tag = tag;
  }

  return slot;
}

// =============== Dispatchers ===============

const MountDispatcher: Dispatcher = {
  useState<T>(initial: T | (() => T)) {
    const fiber = currentFiber!;
    invariant(fiber, 'useState called without an active fiber');
    const slot = nextHookSlot(fiber, 'state');
    const value = typeof initial === 'function' ? (initial as () => T)() : initial;
    slot.value = value;
    const setter = (v: T | ((prev: T) => T)): void => {
      const nextVal = typeof v === 'function' ? (v as (prev: T) => T)(slot.value as T) : v;
      slot.value = nextVal;
      // In a full system, we would enqueue a re-render for this fiber here
    };

    return [slot.value as T, setter];
  },

  useEffect(effect: () => HookCleanup, deps?: readonly unknown[]) {
    const fiber = currentFiber!;
    invariant(fiber, 'useEffect called without an active fiber');
    const slotIndex = fiber.hookIndex;
    const slot = nextHookSlot(fiber, 'effect');
    slot.deps = deps;
    fiber.pendingEffects.push({ slotIndex, effect, deps });
  },

  useRef<T>(initial: T) {
    const fiber = currentFiber!;
    invariant(fiber, 'useRef called without an active fiber');
    const slot = nextHookSlot(fiber, 'ref');
    if (!slot.value) slot.value = { current: initial } as unknown as { current: T };

    return slot.value as { current: T };
  },

  useContext<T>(ctx: Context<T>) {
    const fiber = currentFiber!;
    invariant(fiber, 'useContext called without an active fiber');
    const slot = nextHookSlot(fiber, 'context');
    fiber.contextDeps.add(ctx.id);
    const value = getContextValue(ctx);
    slot.value = value;

    return value;
  },

  useReducer<S, A>(reducer: (s: S, a: A) => S, initial: S) {
    const fiber = currentFiber!;
    invariant(fiber, 'useReducer called without an active fiber');
    const slot = nextHookSlot(fiber, 'reducer');
    slot.value = initial;
    const dispatch = (action: A): void => {
      slot.value = reducer(slot.value as S, action);
      // In a full system, we would enqueue a re-render for this fiber here
    };

    return [slot.value as S, dispatch];
  },
};

const UpdateDispatcher: Dispatcher = {
  useState<T>(initial: T | (() => T)) {
    const fiber = currentFiber!;
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

  useEffect(effect: () => HookCleanup, deps?: readonly unknown[]) {
    const fiber = currentFiber!;
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
    const fiber = currentFiber!;
    invariant(fiber, 'useRef called without an active fiber');
    const slot = nextHookSlot(fiber, 'ref');
    if (!slot.value) slot.value = { current: initial } as unknown as { current: T };

    return slot.value as { current: T };
  },

  useContext<T>(ctx: Context<T>) {
    const fiber = currentFiber!;
    invariant(fiber, 'useContext called without an active fiber');
    const slot = nextHookSlot(fiber, 'context');
    fiber.contextDeps.add(ctx.id);
    const value = getContextValue(ctx);
    slot.value = value;

    return value;
  },

  useReducer<S, A>(reducer: (s: S, a: A) => S, initial: S) {
    const fiber = currentFiber!;
    invariant(fiber, 'useReducer called without an active fiber');
    const slot = nextHookSlot(fiber, 'reducer');
    if (typeof slot.value === 'undefined') slot.value = initial;
    const dispatch = (action: A): void => {
      slot.value = reducer(slot.value as S, action);
    };

    return [slot.value as S, dispatch];
  },
};

// =============== Fiber Lifecycle API ===============

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
      slot.cleanup = null;
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
  const prevFiber = currentFiber;
  const prevDispatcher = currentDispatcher;

  fiber.hookIndex = 0;
  fiber.pendingEffects.length = 0;

  setCurrent(fiber, fiber.dispatcher);

  try {
    const result = fn();
    const awaited = result instanceof Promise ? await result : result;
    // After successful evaluation, move to Update phase for next runs
    fiber.dispatcher = UpdateDispatcher;
    // Flush effects after execution
    flushPendingEffects(fiber);

    return awaited;
  } finally {
    setCurrent(prevFiber, prevDispatcher);
  }
}

/**
 * Helper to run an arbitrary callback under the current fiber context.
 * Useful for async continuations where hooks are not called but code relies
 * on the same dynamic fiber (e.g., reading getCurrentFiber()).
 */
export function runInFiber<R>(fiber: Fiber, cb: () => R): R {
  const prevFiber = currentFiber;
  const prevDispatcher = currentDispatcher;
  setCurrent(fiber, fiber.dispatcher);
  try {
    return cb();
  } finally {
    setCurrent(prevFiber, prevDispatcher);
  }
}

function flushPendingEffects(fiber: Fiber): void {
  const pending = fiber.pendingEffects.splice(0, fiber.pendingEffects.length);
  for (const { slotIndex, effect } of pending) {
    const slot = fiber.hookStates[slotIndex];
    // Run previous cleanup before next effect
    if (slot?.cleanup) {
      try { slot.cleanup(); } catch { /* noop */ }
      slot.cleanup = null;
    }
    let cleanup: HookCleanup = null;
    try {
      cleanup = effect();
    } catch {
      cleanup = null;
    }
    if (typeof cleanup === 'function') slot.cleanup = cleanup as () => void;
  }
}

// =============== Hook Proxies (public surface) ===============

export function useState<T>(initial: T | (() => T)): [T, (v: T | ((prev: T) => T)) => void] {
  const d = currentDispatcher;
  invariant(d, 'useState called outside of an active fiber');

  return d.useState<T>(initial);
}

export function useEffect(effect: () => HookCleanup, deps?: readonly unknown[]): void {
  const d = currentDispatcher;
  invariant(d, 'useEffect called outside of an active fiber');

  return d.useEffect(effect, deps);
}

export function useRef<T>(initial: T): { current: T } {
  const d = currentDispatcher;
  invariant(d, 'useRef called outside of an active fiber');

  return d.useRef<T>(initial);
}

export function useContext<T>(ctx: Context<T>): T {
  const d = currentDispatcher;
  invariant(d, 'useContext called outside of an active fiber');

  return d.useContext<T>(ctx);
}

export function useReducer<S, A>(reducer: (s: S, a: A) => S, initial: S): [S, (a: A) => void] {
  const d = currentDispatcher;
  invariant(d, 'useReducer called outside of an active fiber');

  return d.useReducer<S, A>(reducer, initial);
}
