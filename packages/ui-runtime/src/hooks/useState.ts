import { getCurrentFiber, invariant } from '../core';

/**
 * State hook that persists a value across renders for the current component.
 *
 * @typeParam T - State value type.
 * @param initial - Initial state value or a lazy initializer function invoked once on mount.
 * @returns A tuple with the current state and a setter. The setter accepts a value
 *          or an updater function that receives the previous value.
 */
export function useState<T>(initial: T | (() => T)): [T, (v: T | ((prev: T) => T)) => void] {
  const [, d] = getCurrentFiber();

  invariant(d, 'useState called outside of an active fiber');

  return d.useState<T>(initial);
}
