import { FunctionComponent, JSX } from '@bedrock-core/ui/jsx-runtime';
import { EventSignal } from '../../hooks';
import { Player } from '@minecraft/server';
import type { Owner } from './owner';
import type { Immutable, ReducerSlot, StateSlot } from '../immutable';

export interface HookSlot<T = unknown> {
  value: T;
  initial?: T;
  deps?: readonly unknown[] | undefined;
  cleanup?: (() => void) | undefined;
  tag: 'state' | 'effect' | 'ref' | 'reducer' | 'context';
  resolved?: boolean;
}

export interface ContextProps<T> {
  value: T;
  children?: JSX.Node;
}

export type Context<T> = FunctionComponent<ContextProps<T>> & { defaultValue: T };

export type ContextSnapshot = ReadonlyMap<Context<unknown>, unknown>;

export interface Dispatcher {
  useState<T>(initial: T | (() => T)): StateSlot<T>;
  useEffect(effect: () => (() => void) | void, deps?: readonly unknown[]): void;
  useRef<T>(initial: T): { current: T };
  useContext<T>(ctx: Context<T>): T;
  useReducer<S, A>(reducer: (state: Immutable<S>, action: A) => S, initial: S): ReducerSlot<S, A>;

  usePlayer(): Player;
  useExit(): () => void;
  useEvent<T, O>(
    signal: EventSignal<T, O>,
    callback: (event: T) => void,
    options?: O,
    deps?: readonly unknown[],
  ): void;
}

export interface Fiber {
  id: string;
  hookStates: HookSlot[];
  hookIndex: number;
  dispatcher: Dispatcher; // phase-specific
  // Snapshot of context values visible during last evaluation
  contextSnapshot?: ContextSnapshot;
  // Effects scheduled during the last evaluation
  pendingEffects: { slotIndex: number; effect: () => (() => void) | void; deps?: readonly unknown[] | undefined }[];
  /** Who this render belongs to: keys the fiber and decides what its hooks may reach. */
  owner: Owner;
  /**
   * Persisted values for `state` and `reducer` slots, by slot index, handed
   * over when the fiber is created and read once as each slot mounts. This is
   * how a container screen's state comes back from the entity it lives on.
   */
  seed?: ReadonlyMap<number, unknown>;
  shouldRender: boolean; // Flag for useExit to signal form should close

  // Tree relations
  parent?: Fiber; // The parent Fiber
  child?: Fiber; // The first child Fiber
  sibling?: Fiber; // The next sibling Fiber
  index: number; // The position among siblings (0-based), -1 if unlinked
}
