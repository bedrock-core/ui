import { ActionFormData, ActionFormResponse } from '@minecraft/server-ui';
import { FunctionComponent, JSX } from '../jsx';

// For now we will only be supporting ActionFormData, in future will add support for ModalFormData for "Forms"
export type CoreUIFormData = ActionFormData;

export type ReservedBytes = {

  /* @internal */
  __type: 'reserved';
  bytes: number;
};

export type SerializablePrimitive = string | number | boolean | ReservedBytes;

export type SerializableProps = Record<string, SerializablePrimitive>;

export interface SerializationContext {

  /** Maps button index to their onPress callbacks */
  buttonCallbacks: Map<number, () => void>;

  /** Current button index counter */
  buttonIndex: number;
}

/**
 * Options for render() to control suspension behavior.
 */
export interface RenderOptions {

  /**
   * When true, waits for all useState values to differ from their initial values
   * before showing the main UI. Shows fallback UI during waiting period.
   *
   * @default false
   */
  awaitStateResolution?: boolean;

  /**
   * Maximum time in milliseconds to wait for state resolution.
   * After timeout, shows main UI regardless of state resolution status.
   * Only applies when awaitStateResolution is true.
   *
   * @default 10000 (10 seconds)
   */
  awaitTimeout?: number;

  /**
   * Fallback UI to show while waiting for state resolution.
   * Only applies when awaitStateResolution is true.
   * If not provided, shows a default "Loading..." panel.
   *
   * @default <Panel><Text text="Loading..." /></Panel>
   */
  fallback?: JSX.Element | FunctionComponent;
}

export class SerializationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SerializationError';
  }
}

/**
 * ============= Runtime/Renderer Core Contracts =============
 * These types define the high-level architecture contracts for the React-like
 * renderer/runtime. They are additive and do not modify current behavior.
 *
 * Context API is intentionally out-of-scope for this phase.
 */

/**
 * A normalized representation of a JSX node used by the builder/reconciler.
 * Children should already be normalized to JSX.Elements (no primitives/nulls).
 */
export interface VirtualNode {
  type: string | FunctionComponent;
  props: JSX.Props & { children?: JSX.Node[] };
  key?: string;
}

/** Identifier for a component instance (stable per player/component path). */
export type InstanceId = string;

/**
 * Predicate function registered by components to inform the runtime when a
 * render should be requested. Evaluated by the runtime loop.
 */
export type RenderCondition = () => boolean;

/** Handle returned by render() to control lifecycle and rendering. */
export interface RuntimeHandle {

  /** Stop logic loop but keep state/instances. */
  stop(): void;

  /** Fully cleanup instances and cancel scheduling. */
  destroy(): void;

  /** Enqueue a render request (debounced by the scheduler). */
  triggerRender(reason?: string): void;

  /** Subscribe to runtime events. */
  on(event: 'shouldRender' | 'teardown', cb: () => void): void;

  /** Return and clear whether there is a pending render request. */
  consumePending?(): boolean;

  /** Evaluate registered render conditions once, without side effects. */
  evaluateConditionsNow?(): boolean;
}

/** Options for the runtime engine and scheduler. */
export interface RuntimeOptions {

  /** Tick interval in game ticks for evaluating conditions/effects. Default: 1 */
  tickInterval?: number;
}

/** Minimal scheduler abstraction over @minecraft/server system.* APIs. */
export interface Scheduler {

  /** Start ticking with the provided callback. Safe to call idempotently. */
  start(tick: () => void, intervalTicks?: number): void;

  /** Stop ticking. Safe to call if not running. */
  stop(): void;

  /** Whether the scheduler is currently running. */
  isRunning(): boolean;
}

/** Renderer adapter that turns a VirtualNode/JSX tree into a form snapshot. */
export interface Renderer {

  /**
   * Produce a form snapshot for the given tree and serialization context.
   * The implementation is expected to call current serializer/withControl rules.
   */
  snapshot(tree: JSX.Element, ctx: SerializationContext): ActionFormData;

  /** Show the form and resolve with the raw response. */
  show(player: import('@minecraft/server').Player, form: ActionFormData): Promise<ActionFormResponse>;
}

/**
 * Hook-adjacent contracts for render conditions and explicit render control.
 * These are types only; actual hook functions will live under hooks/.
 */
export type TriggerRender = (reason?: string) => void;

/** Register a predicate; runtime evaluates it and triggers render when true. */
export type UseRenderCondition = (predicate: RenderCondition, deps?: unknown[]) => void;

/** Get an imperative triggerRender function bound to the current runtime. */
export type UseTriggerRender = () => TriggerRender;
