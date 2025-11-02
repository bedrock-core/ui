import { getCurrentFiber, invariant } from '../core';

/**
 * Effect hook for running side effects after a render commits.
 * The cleanup function (if returned) runs before the next effect or on unmount.
 *
 * @param effect - Function invoked after commit; may return a cleanup function.
 * @param deps - Optional dependency list to control re-execution. Omit to run after every render.
 */
export function useEffect(effect: () => (() => void) | void | undefined, deps?: readonly unknown[]): void {
  const [, d] = getCurrentFiber();

  invariant(d, 'useEffect');

  return d.useEffect(effect, deps);
}
