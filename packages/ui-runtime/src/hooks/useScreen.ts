import { getPlayerScreen } from '../core/render/session';
import type { ScreenDescriptor } from '../screens';
import { usePlayer } from './usePlayer';

/**
 * Returns the screen descriptor in effect for the current build — the baseline
 * passed to `render()`, or whatever a `useScreenType` override set this build.
 * ItemRenderer uses this to decide whether item rendering is permitted.
 */
export function useScreen(): ScreenDescriptor {
  return getPlayerScreen(usePlayer());
}
