import type { ScreenType } from '../core/serializer';
import { setPlayerScreenType } from '../core/render/session';
import { usePlayer } from './usePlayer';

/**
 * Signals the presenter to use a specific screen layout for the current render.
 * Must be called at component render time (not inside effects or callbacks).
 * Used internally by InventoryScreen — consumer code should not call this directly.
 */
export function useScreenType(type: ScreenType): void {
  const player = usePlayer();

  setPlayerScreenType(player, type);
}
