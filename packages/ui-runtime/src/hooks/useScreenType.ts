import type { ScreenType } from '../core/types';
import { setPlayerScreenType } from '../core/render/session';
import { usePlayer } from './usePlayer';

/**
 * Advanced override: switch the screen layout for the current build, overriding
 * the baseline passed to `render(root, player, screen)`. Must be called at
 * component render time (not inside effects or callbacks).
 *
 * The primary way to choose a screen is the `render()` baseline. Use this hook
 * only when a single render() call needs to switch types as you navigate — e.g.
 * a navigator or an item-capable screen self-declaring its layout.
 */
export function useScreenType(type: ScreenType): void {
  const player = usePlayer();

  setPlayerScreenType(player, type);
}
