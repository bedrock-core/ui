import { setPlayerScreen } from '../core/render/session';
import type { ScreenDescriptor } from '../screens';
import { usePlayer } from './usePlayer';

/**
 * Sets the screen layout for the current build, overriding the baseline passed
 * to `render(root, player, screen)`. Call at component render time (not inside
 * effects or callbacks) — typically a screen component declaring that it is an
 * inventory or fixed screen.
 *
 * Choosing the screen is the screen's own responsibility, not the navigator's:
 *
 * ```tsx
 * function InventoryScreen() {
 *   useSetScreen(Screen.Inventory);
 *   return <Tabs.Navigator tabBar={...} />;
 * }
 * ```
 */
export function useSetScreen(screen: ScreenDescriptor): void {
  setPlayerScreen(usePlayer(), screen);
}
