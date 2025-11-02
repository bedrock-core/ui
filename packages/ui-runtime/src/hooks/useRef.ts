import { getCurrentFiber, invariant } from '../core';

/**
 * Ref hook that provides a stable container whose `.current` field can be read and written.
 * The ref object identity is stable across renders.
 *
 * @typeParam T - Value type stored in the ref.
 * @param initial - Initial value assigned to `current` on first mount.
 * @returns A mutable ref object with a `current` property.
 */
export function useRef<T>(initial: T): { current: T } {
  const [, d] = getCurrentFiber();

  invariant(d, 'useRef');

  return d.useRef<T>(initial);
}
