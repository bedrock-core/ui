import { Player } from '@minecraft/server';
import { FunctionComponent, JSX } from '../../jsx';

/**
 * State hook storage for a single useState call
 */
export interface StateHook<T = unknown> {
  readonly type: 'state';
  value: T;
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
 * Represents a single hook call (useState, useEffect, etc)
 */
export type Hook = StateHook | EffectHook;

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
  componentType: FunctionComponent;
  props: JSX.Props;
  hooks: Hook[];
  hookIndex: number;
  mounted: boolean;
  dirty: boolean;
  renderContext?: {
    player: Player;
    options?: RenderOptions;
  };
  scheduleRerender?: () => void;
  isProgrammaticClose?: boolean;
}

/**
 * Render options for component rendering
 */
export interface RenderOptions { key?: string }
