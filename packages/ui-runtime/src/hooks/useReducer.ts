import { getCurrentFiber, invariant } from '../core';
import type { Immutable, ReducerSlot } from '../core';

/**
 * Reducer hook for managing state transitions via actions.
 *
 * @typeParam S - State type.
 * @typeParam A - Action type.
 * @param reducer - Pure function that maps (state, action) to next state. It reads
 *                  the current state as deeply readonly and returns a new one.
 * @param initial - Initial state value used on first mount.
 * @returns A tuple with the current state and a dispatch function for actions.
 */
export function useReducer<S, A>(reducer: (s: Immutable<S>, a: A) => S, initial: S): ReducerSlot<S, A> {
  const [, d] = getCurrentFiber();

  invariant(d, 'useReducer');

  return d.useReducer<S, A>(reducer, initial);
}
