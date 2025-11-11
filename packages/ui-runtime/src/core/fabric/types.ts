import { FunctionComponent, JSX } from '@bedrock-core/ui/jsx-runtime';
import { EventSignal } from '../../hooks';
import { Player } from '@minecraft/server';

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
  useState<T>(initial: T | (() => T)): [T, (value: T | ((prev: T) => T)) => void];
  useEffect(effect: () => (() => void) | void, deps?: readonly unknown[]): void;
  useRef<T>(initial: T): { current: T };
  useContext<T>(ctx: Context<T>): T;
  useReducer<S, A>(reducer: (state: S, action: A) => S, initial: S): [S, (action: A) => void];

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
  // Session metadata
  player: Player; // Player instance for this fiber
  shouldRender: boolean; // Flag for useExit to signal form should close

  // Tree relations
  parent?: Fiber; // The parent Fiber
  child?: Fiber; // The first child Fiber
  sibling?: Fiber; // The next sibling Fiber
  index: number; // The position among siblings (0-based), -1 if unlinked
}
