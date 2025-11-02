import { Context, getCurrentFiber, invariant } from '../core';

/**
 * Context hook that returns the current value for a given context.
 * Reads the nearest Provider value above the calling component or the context default.
 *
 * @typeParam T - Context value type.
 * @param ctx - Context object created by `createContext`.
 * @returns The current context value for the calling component.
 */
export function useContext<T>(ctx: Context<T>): T {
  const [, d] = getCurrentFiber();

  invariant(d, 'useContext');

  return d.useContext<T>(ctx);
}
