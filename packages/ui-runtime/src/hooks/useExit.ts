import { getCurrentFiber, invariant } from '../core';

/**
 * Hook that returns a function to request the current UI to close.
 * Useful for programmatically dismissing the active form from within a component.
 *
 * @returns A function that, when invoked, signals the runtime to exit the current form.
 */
export function useExit(): () => void {
  const [, d] = getCurrentFiber();

  invariant(d, 'useExit called outside of an active fiber');

  return d.useExit();
}
