import type { Player } from '@minecraft/server';
import type { JSX } from '../jsx';
import { popHistory, pushHistory } from './history';
import { render, type RenderOptions } from './render';
import { screenForKey } from './render/screens';

/**
 * Navigating by KEY rather than by component.
 *
 * A screen is compiled, so the component that draws it lives in the bundle that
 * built it — which is exactly what another addon does not have. What every
 * addon does have is the key: `<addon>:<name>`, the same string the build wrote
 * into the compiled title. So a press that opens a screen names the key, and
 * what resolves it is decided by whoever is listening.
 *
 * Two resolutions, in order:
 *
 * 1. **This bundle.** The key was registered by the generated module, so the
 *    component is in hand and the screen renders exactly as `render()` draws it.
 * 2. **Somebody else's.** The key belongs to an addon whose script this realm is
 *    not running. It is still drawable — the layout is in the pack every client
 *    holds — from a replicated reference: the title, the entry values, and where
 *    each press leads. That resolution needs the feed, so it is installed by
 *    whoever owns it ({@link setNavigator}) rather than reached for from here.
 *
 * The default navigator is step 1 alone, which is what an addon with no server
 * framework gets: its own screens navigate, a foreign key warns.
 */

/**
 * The keys the addons in this build compiled.
 *
 * Empty here, and filled by the module each addon's build generates:
 *
 * ```ts
 * declare module '@bedrock-core/ui-runtime' {
 *   interface ScreenKeys extends Record<ScreenKey, true> {}
 * }
 * ```
 *
 * So an addon's own keys autocomplete and a typo is an error, while a key
 * belonging to an addon this build has never seen still passes — which it must,
 * since resolving one of those is what the reference table is for.
 */
export interface ScreenKeys {}

/** A screen to navigate to: one this build compiled, or any other addon's. */
export type ScreenKey = keyof ScreenKeys | (string & {});

/** What a navigation carries beyond the key. */
export interface NavigateOptions extends RenderOptions {
  /**
   * Props the screen is rendered with. A compiled screen's SHAPE is frozen, so
   * these fill what the layout already reserved — a generic screen's labels and
   * values — and can never add or drop a cell.
   */
  params?: Readonly<Record<string, unknown>>;
  /**
   * Show the screen in place of the current one rather than on top of it: the
   * player is not put behind it, so `back()` returns to wherever they already
   * could. What a redirect wants, and what `back()` itself uses.
   */
  replace?: boolean;
}

/** What resolves a key into a screen shown to a player. Returns whether it was shown. */
export type Navigator = (key: string, player: Player, options: NavigateOptions) => boolean;

/**
 * Opens the screen `key` names IN THIS BUNDLE, or false when this bundle
 * compiled no such screen. The half of navigation that needs nothing but the
 * registry, and the default {@link navigate} performs.
 */
export function openScreen(key: string, player: Player, options: NavigateOptions = {}): boolean {
  const screen = screenForKey(key);

  if (screen === undefined) {
    return false;
  }

  const { params, ...renderOptions } = options;
  const root: JSX.Element | typeof screen = params === undefined
    ? screen
    : { type: screen, props: { ...params } };

  render(root, player, renderOptions);

  return true;
}

const localOnly: Navigator = (key, player, options) => {
  if (openScreen(key, player, options)) {
    return true;
  }

  console.warn(`[ui] no screen "${key}" in this bundle, and nothing is installed to resolve another addon's screens`);

  return false;
};

let navigator: Navigator = localOnly;

/**
 * Installs what resolves a key, replacing the local-only default.
 *
 * `@bedrock-core/navigation` installs one that keeps a per-player stack and
 * falls back to the replicated references; a realm running neither keeps the
 * default. Called with `undefined` to put the default back.
 */
export function setNavigator(next: Navigator | undefined): void {
  navigator = next ?? localOnly;
}

/**
 * Shows the screen `key` names to `player`, through whatever navigator is
 * installed.
 *
 * @returns Whether a screen was shown. A false is a key nothing could resolve —
 *   a screen that did not compile, an addon nobody in this world is running, or
 *   a typo — and is warned about where it is decided, not thrown.
 */
export function navigate(key: ScreenKey, player: Player, options: NavigateOptions = {}): boolean {
  if (options.replace !== true) {
    // Pushed BEFORE the screen changes, because what goes on the stack is the
    // screen being left — which is the one `render()` last recorded.
    pushHistory(player.id);
  }

  const shown = navigator(key, player, options);

  if (!shown && options.replace !== true) {
    // Nothing was drawn, so nothing was left: the stack must not gain a step
    // that would send a later `back()` to the screen the player is still on.
    popHistory(player.id);
  }

  return shown;
}

/**
 * Goes back to the screen the player navigated from, and returns whether there
 * was one.
 *
 * The stack is keys, not components — a compiled screen's shape is frozen, so
 * going back means showing that screen again rather than restoring a tree. What
 * it was showing at the time is not restored either: a screen is drawn from its
 * own state, and the state of the one being returned to went with its fibers.
 */
export function back(player: Player, options: Omit<NavigateOptions, 'replace'> = {}): boolean {
  const key = popHistory(player.id);

  if (key === undefined) {
    return false;
  }

  return navigator(key, player, { ...options, replace: true });
}
