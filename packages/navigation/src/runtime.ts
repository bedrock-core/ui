/** Shared construction and host support for navigator libraries. */
import type { Player } from '@minecraft/server';
import { checkpoint as saveCheckpoint, currentLocation as readLocation, type NavigationCheckpoint, type ScreenLocation } from './runtime/history';
import { ensureNavigationLifecycle } from './runtime/lifecycle';

export { createNavigatorFactory } from './static/factory';
export type { NavigatorFactory, NavigatorLayoutProps, NavigatorLayout } from './static/factory';
export { openScreen, renderDestination, setNavigator } from './runtime/navigate';
export type { Navigated, NavigationDriver, Navigator } from './runtime/navigate';
export type { NavigationCheckpoint, ScreenLocation } from './runtime/history';

/** Reads the current destination after attaching to existing renderer sessions. */
export function currentLocation(player: Player | string): ScreenLocation | undefined {
  ensureNavigationLifecycle();

  return readLocation(player);
}

/** Saves confirmed router state for the next host opening or handoff. */
export function checkpoint(player: Player | string, selection: NavigationCheckpoint): void {
  ensureNavigationLifecycle();
  saveCheckpoint(player, selection);
}
