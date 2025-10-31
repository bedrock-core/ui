/**
 * State hook storage for a single useState call
 */
export interface StateHook<T = unknown> {
  readonly type: 'state';
  value: T;
  initialValue: T;
  setValue: (nextValue: T | ((prevValue: T) => T)) => void;
}

/**
 * Effect hook storage for a single useEffect call
 */
export interface EffectHook {
  readonly type: 'effect';
  create: () => void | (() => void);
  deps?: unknown[];
  prevDeps?: unknown[];
  cleanup?: () => void;
  hasRun: boolean;
}

/**
 * Ref hook storage for a single useRef call
 */
export interface RefHook<T = unknown> {
  readonly type: 'ref';
  value: { current: T };
}

/**
 * Context hook storage for a single useContext call
 */
export interface ContextHook<T = unknown> {
  readonly type: 'context';
  context: unknown; // Context<T> from context.ts - using unknown to avoid circular dependency
  value: T;
}

/**
 * Reducer hook storage for a single useReducer call
 */
export interface ReducerHook<S = unknown, A = unknown> {
  readonly type: 'reducer';
  state: S;
  dispatch: (action: A) => void;
  reducer: (state: S, action: A) => S;
}

/**
 * Represents a single hook call (useState, useEffect, useRef, useContext, useReducer, etc)
 */
export type Hook = StateHook | EffectHook | RefHook | ContextHook | ReducerHook;

/**
 * Represents a single hook call (useState, useEffect, etc)
 */
export interface HookCall {
  type: 'state' | 'effect';
  index: number;
  hook: Hook;
}

/**
 * Type representing a Minecraft event signal that can be subscribed to.
 * Compatible with Minecraft's event signal pattern (world.afterEvents.*, world.beforeEvents.*, etc.)
 *
 * Pattern: signal.subscribe(callback, options?) returns the callback itself,
 * and signal.unsubscribe(callback) must be called explicitly to remove the listener.
 */
export interface EventSignal<T, TOptions = Record<string, unknown>> {

  /**
   * Subscribe to the event signal with a callback
   * @param callback Function to call when the event fires
   * @param options Optional subscription options (e.g., BlockEventOptions with blockTypes, permutations)
   * @returns The callback that was registered (Minecraft pattern)
   */
  subscribe(callback: (event: T) => void, options?: TOptions): (event: T) => void;

  /**
   * Unsubscribe a callback from the event signal
   * @param callback Function to remove from listeners
   */
  unsubscribe(callback: (event: T) => void): void;
}
