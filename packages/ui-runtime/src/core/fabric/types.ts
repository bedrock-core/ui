import { EventSignal } from '../../hooks';
import { Player } from '@minecraft/server';

export interface HookSlot<T = unknown> {
  value: T;
  deps?: readonly unknown[] | undefined;
  cleanup?: (() => void) | undefined;
  tag: 'state' | 'effect' | 'ref' | 'reducer' | 'context';
}

export interface Context<T> {

  /* @internal */
  $$typeof: symbol;
  defaultValue: T;
}

export type ContextSnapshot = ReadonlyMap<symbol, unknown>;

export interface Dispatcher {
  useState<T>(initial: T | (() => T)): [T, (v: T | ((prev: T) => T)) => void];
  useEffect(effect: () => (() => void) | void | undefined, deps?: readonly unknown[]): void;
  useRef<T>(initial: T): { current: T };
  useContext<T>(ctx: Context<T>): T;
  useReducer<S, A>(reducer: (s: S, a: A) => S, initial: S): [S, (a: A) => void];

  usePlayer(): Player;
  useExit(): () => void;
  useEvent<T, O = Record<string, unknown>>(
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
  pendingEffects: { slotIndex: number; effect: () => (() => void) | void | undefined; deps?: readonly unknown[] | undefined }[];
  // Session metadata
  player: Player; // Player instance for this fiber
  shouldRender: boolean; // Flag for useExit to signal form should close

  // Suspense boundary metadata for this component (if this fiber is a Suspense boundary)
  suspense?: { id: string; timeout: number; isResolved: boolean };
  // Boundary association for descendant components: nearest Suspense boundary id
  nearestBoundaryId?: string;
}

export type SuspendedFiber<T extends Fiber = Fiber> = Omit<T, 'suspense'> & { suspense: NonNullable<T['suspense']> };
