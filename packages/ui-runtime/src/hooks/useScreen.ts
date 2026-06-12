import { getPlayerScreen } from '../core/render/session';
import type { ScreenDescriptor } from '../screens';
import { usePlayer } from './usePlayer';

/**
 * Returns the screen descriptor in effect for the current build — the baseline
 * passed to `render()`, or the override set via `useSetScreen`.
 */
export function useScreen(): ScreenDescriptor {
  return getPlayerScreen(usePlayer());
}
