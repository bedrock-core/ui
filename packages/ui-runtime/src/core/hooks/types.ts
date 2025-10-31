import { Player } from '@minecraft/server';
import { FunctionComponent, JSX } from '../../jsx';

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
 * Component fiber instance - tracks state, effects, and render information for a component
 */
export interface ComponentInstance {
  id: string;
  player: Player;
  componentType: FunctionComponent;
  props: JSX.Props;
  hooks: Hook[];
  hookIndex: number;
  mounted: boolean;
  dirty: boolean;
  isProgrammaticClose?: boolean;

  /** System interval ID for background effect loop - runs effects when state changes */
  effectLoopId?: number;
}
