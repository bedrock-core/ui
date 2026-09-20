/**
 * `@bedrock-core/navigation` — going from one screen to another, by key.
 *
 * A compiled screen is drawn from the pack by its title, and its shape is frozen
 * at build. That rules out the navigator every React app has — a stack of
 * components swapped inside one root — and leaves the one that actually fits:
 * a stack of KEYS. `navigate('shop:home')` shows that screen and puts the
 * current one behind the player; `back()` returns to it.
 *
 * The key is `<addon>:<name>`, which is what makes this work across addons: the
 * key of a screen nobody in this realm compiled still resolves, through the
 * reference its owner replicated ({@link provideReferences}).
 */
import type { Player } from '@minecraft/server';
import {
  back as runtimeBack,
  clearHistory,
  historyOf as runtimeHistoryOf,
  navigate as runtimeNavigate,
  shownKey,
  usePlayer,
  type NavigateOptions,
  type ScreenKey,
} from '@bedrock-core/ui-runtime';

// The key types live with `render()`, which is what every addon already imports
// and therefore the one module a generated registration module can augment.
export type { NavigateOptions, ScreenKey, ScreenKeys } from '@bedrock-core/ui-runtime';

// Where a player came from when another realm asked this one to show them a
// screen: recorded by whatever serves that request, read by `back()`.
export { pathThrough, returnPathOf, setReturnPath } from '@bedrock-core/ui-runtime';
export type { ReturnAddress } from '@bedrock-core/ui-runtime';

// The cross-addon feeds a key resolves through: an addon's compiled screens as
// references, and its page in the shared addon list.
export { ScreensRegistry, isAddonScreens, screens, type AddonScreens } from './screens';
export { PagesRegistry, addonPageReference, isAddonPageReference, pages, pageTargeted } from './pages';
export type { AddonPageReference, PageTarget, TargetedPress } from './pages';

// What resolves a key this bundle did not compile.
export { provideReferences } from './references';
export type { CrossRealm } from './references';

// The realm's one UI presence: the transport a foreign screen is fetched over, the
// navigator, the way back, and where this realm has each player.
export { methodFor, uiOf } from './ui';
export type { ReferenceSource, TargetOpener, UiPresence } from './ui';

// Where the UI opens, as data that crosses a realm.
export { isScreenTarget, isUiReturn, isUiTarget } from './target';
export type { ScreenTarget, UiReturn, UiTarget } from './target';

// What the build declared for this addon, for the realm to publish.
export { declaredParts, registerDeclared } from './declared';
export type { DeclaredParts } from './declared';

/**
 * Shows the screen `key` names to `player`, putting the one they are on behind
 * them.
 *
 * @returns Whether a screen was shown. False is a key nothing resolved: a screen
 *   that did not compile, or an addon nobody in this world is running.
 */
export function navigate(key: ScreenKey, player: Player, options: NavigateOptions = {}): boolean {
  return runtimeNavigate(key, player, options);
}

/** Goes back to the screen navigated from, and returns whether there was one. */
export function back(player: Player, options: Omit<NavigateOptions, 'replace'> = {}): boolean {
  return runtimeBack(player, options);
}

/**
 * Shows the screen `key` names in place of the one the player is on, without
 * putting it behind them.
 *
 * A redirect, and what `back()` uses to return: the player ends up on `key`
 * with the stack exactly as deep as it already was.
 */
export function replace(key: ScreenKey, player: Player, options: Omit<NavigateOptions, 'replace'> = {}): boolean {
  return runtimeNavigate(key, player, { ...options, replace: true });
}

/**
 * Shows `key` as the only screen the player has been on: the stack is emptied
 * first, so `back()` from there has nowhere to go.
 *
 * What a menu's root wants — going back out of the first screen of a flow should
 * end the flow, not walk into whatever the player was looking at before it.
 */
export function reset(key: ScreenKey, player: Player, options: Omit<NavigateOptions, 'replace'> = {}): boolean {
  clearHistory(player.id);

  return runtimeNavigate(key, player, { ...options, replace: true });
}

/** The keys behind a player, oldest first. */
export function historyOf(player: Player): readonly string[] {
  return runtimeHistoryOf(player.id);
}

/** The key of the screen a player is looking at, when they were navigated to it. */
export function currentKey(player: Player): ScreenKey | undefined {
  return shownKey(player.id);
}

/** Whether there is a screen behind the one a player is on. */
export function canGoBack(player: Player): boolean {
  return runtimeHistoryOf(player.id).length > 0;
}

/** What a screen calls to move: bound to the player looking at it. */
export interface Navigation {
  /** Show that screen, putting this one behind the player. */
  navigate(key: ScreenKey, options?: NavigateOptions): boolean;
  /** Show that screen in this one's place, leaving the stack as deep as it is. */
  replace(key: ScreenKey, options?: Omit<NavigateOptions, 'replace'>): boolean;
  /** Show that screen as the only one the player has been on. */
  reset(key: ScreenKey, options?: Omit<NavigateOptions, 'replace'>): boolean;
  /** Go back to the screen navigated from; false when there is none. */
  back(options?: Omit<NavigateOptions, 'replace'>): boolean;
  /** Whether there is a screen behind this one. */
  canGoBack: boolean;
  /** The key of the screen this is, when it was navigated to. */
  key: ScreenKey | undefined;
  /** The keys behind it, oldest first. */
  history: readonly string[];
}

/**
 * Navigation bound to the player the screen is being shown to.
 *
 * The same calls as the free functions, with the player already in hand — which
 * inside a screen is the only player there is.
 */
export function useNavigation(): Navigation {
  const player = usePlayer();

  return {
    navigate: (key, options = {}): boolean => runtimeNavigate(key, player, options),
    replace: (key, options = {}): boolean => replace(key, player, options),
    reset: (key, options = {}): boolean => reset(key, player, options),
    back: (options = {}): boolean => runtimeBack(player, options),
    canGoBack: runtimeHistoryOf(player.id).length > 0,
    key: shownKey(player.id),
    history: runtimeHistoryOf(player.id),
  };
}
