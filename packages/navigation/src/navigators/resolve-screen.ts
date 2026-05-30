import type { ScreenComponent, ScreensMap } from '../types';

/**
 * Resolve a screen component from a screens map entry.
 * Each entry is either a bare component or an object `{ screen, initialParams? }`.
 * Returns `undefined` when the route name has no entry.
 *
 * Shared by both the stack and tab navigators.
 */
export function resolveScreenComponent<
  TRoutes extends Record<string, unknown>,
  K extends Extract<keyof TRoutes, string>,
>(
  screens: ScreensMap<TRoutes>,
  name: K,
): ScreenComponent<TRoutes, K> | undefined {
  const entry = screens[name];

  if (entry == null) {
    return undefined;
  }

  if (typeof entry === 'function') {
    return entry;
  }

  return entry.screen;
}
