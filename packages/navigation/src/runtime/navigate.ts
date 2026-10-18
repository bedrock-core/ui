import type { Player } from '@minecraft/server';
import {
  endRender, render, screenForKey, staticScreen, screenMetadataFor as screenDescriptor,
  screenParametersError as screenParameterError, type FunctionComponent, type JSX, type RenderOptions,
} from '@bedrock-core/ui-runtime';
import {
  clearHistory, currentLocation, navigationSnapshot, noteLocation, popLocation, pushHistory, restoreNavigation,
  copyLocation, type NavigationCheckpoint, type NavigationSnapshot, type ScreenLocation, withNavigationLocation,
} from './history';
import { presentReference, staticReference, type ScreenReference } from './reference';
import { ensureNavigationLifecycle } from './lifecycle';

/**
 * Resolves compiled screen keys through a replaceable host driver.
 *
 * The default driver opens this bundle's components and static references.
 * Core integration adds owner discovery and transport without making the
 * runtime depend on a server framework. History stores public destinations;
 * each host rebuilds its private models when a destination opens again.
 */

/** A screen to navigate to: one this build compiled, or any other addon's. */
export type ScreenKey = string;

/** What a navigation carries beyond the key. */
export interface NavigateOptions extends RenderOptions {
  /** Confirmed page/tab selections to supply when reopening a destination. */
  checkpoint?: NavigationCheckpoint;
  /**
   * Props the screen is rendered with. A compiled screen's SHAPE is frozen, so
   * these fill what the layout already reserved — a generic screen's labels and
   * values — and can never add or drop a cell.
   *
   * A static screen takes none: it has no component, and its values were baked
   * with no props. Params that leave this bundle — in a static screen's table, or
   * to the realm that draws another addon's screen — must be plain data
   * ({@link whyNotPlainData}).
   */
  params?: Readonly<Record<string, unknown>>;
  /**
   * Show the screen in place of the current one rather than on top of it: the
   * player is not put behind it, so `back()` returns to wherever they already
   * could. What a redirect wants, and what `back()` itself uses.
   */
  replace?: boolean;
}

/**
 * True records the destination locally; false restores the previous state.
 * A handed-off host owns the transferred snapshot and releases the source session.
 */
export type Navigated = boolean | 'handed-off';

/** What resolves a key into a screen shown to a player. */
export type Navigator = (key: string, player: Player, options: NavigateOptions) => Navigated | Promise<Navigated>;

/** A host that resolves navigation destinations. */
export interface NavigationDriver {
  /** Resolves a key into a screen shown to a player. */
  show: Navigator;
}

/**
 * Renders a host component for its logical destination, including after an
 * asynchronous opener has loaded its model. Navigation hooks read this location
 * while the component renders; the renderer retains its compiled screen identity.
 */
export function renderDestination(
  root: JSX.Element | FunctionComponent,
  player: Player,
  location: ScreenLocation,
  options: RenderOptions = {},
): void {
  ensureNavigationLifecycle();
  withNavigationLocation(player.id, copyLocation(location), () => render(root, player, options));
}

/**
 * Opens the screen `key` names IN THIS BUNDLE, or false when this bundle
 * compiled no such screen. The half of navigation that needs nothing but the
 * registry, and the default {@link navigate} performs.
 */
export function openScreen(key: string, player: Player, options: NavigateOptions = {}): boolean {
  ensureNavigationLifecycle();
  const descriptor = screenDescriptor(key);

  key = descriptor?.key ?? key;

  const error = screenParameterError(descriptor?.parameters, options.params);

  if (error !== undefined) {
    console.warn(`[ui] cannot open "${key}": ${error}`);

    return false;
  }

  let location: ScreenLocation;

  try {
    location = copyLocation({ key, ...options.params === undefined ? {} : { params: options.params }, ...options.checkpoint });
  } catch (error: unknown) {
    console.warn(`[ui] cannot open "${key}": ${String(error)}`);

    return false;
  }

  if (descriptor?.kind === 'block' || descriptor?.kind === 'entity') {
    console.warn(`[ui] "${key}" needs its native ${descriptor.kind} host.`);

    return false;
  }

  // A screen the build described in full has no component to render: it is
  // shown from its table, exactly as another addon's screen is, and its links
  // are followed the same way. Its values were baked with no props, so params
  // have nothing to fill and are not passed.
  if (staticScreen(key) !== undefined) {
    // A back press on the first screen of the walk has nothing behind it in the
    // walk, so it is the player's own way back.
    void presentReference(ownTable, key, player).then((ended) => {
      if (ended === 'back') {
        back(player);
      }
    });

    return true;
  }

  const screen = screenForKey(key);

  if (screen === undefined) {
    return false;
  }

  const { params, ...renderOptions } = { ...options, params: location.params };
  const root: JSX.Element | typeof screen = params === undefined
    ? screen
    : { type: screen, props: { ...params } };

  renderDestination(root, player, location, renderOptions);

  return true;
}

/** This bundle's own static screens, as the walk reads them. */
const ownTable = (key: string): ScreenReference | undefined => staticReference(key);

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
 * Accepts a resolver function or a host driver. `undefined` restores the
 * default. Custom drivers can delegate local entries to `openScreen()`.
 */
export function setNavigator(next: Navigator | NavigationDriver | undefined): void {
  navigator = typeof next === 'function' ? next : next?.show ?? localOnly;
}

/**
 * Shows the screen `key` names to `player`, through whatever navigator is
 * installed.
 *
 * @returns Local acceptance or asynchronous dispatch. Use `navigateAsync()`
 *   when the caller needs the destination host's final acceptance.
 */
export function navigate(key: ScreenKey, player: Player, options: NavigateOptions = {}): boolean {
  const result = perform(key, player, options);

  if (result instanceof Promise) {
    void result.catch((error: unknown) => { console.warn(`[ui] navigation failed: ${String(error)}`); });

    return true;
  }

  return result;
}

/** Resolves after the destination host has accepted or rejected navigation. */
export async function navigateAsync(key: ScreenKey, player: Player, options: NavigateOptions = {}): Promise<boolean> {
  return perform(key, player, options);
}

const attempts = new Map<string, number>();
const pending = new Map<string, { readonly attempt: number; readonly before: NavigationSnapshot }>();

function settlePending(player: Player): void {
  const previous = pending.get(player.id);

  if (previous === undefined) { return; }

  pending.delete(player.id);

  const current = currentLocation(player);

  // A foreign host has not opened yet: its provisional push is not committed
  // history for a newer navigation. Keep any newly confirmed client context.
  if (current?.key === previous.before.current?.key) {
    restoreNavigation(player, { ...previous.before, ...current === undefined ? {} : { current } });
  }
}

function perform(key: string, player: Player, options: NavigateOptions, previous?: NavigationSnapshot): boolean | Promise<boolean> {
  ensureNavigationLifecycle();
  settlePending(player);

  const before = previous ?? navigationSnapshot(player);
  const descriptor = screenDescriptor(key);

  key = descriptor?.key ?? key;

  const error = screenParameterError(descriptor?.parameters, options.params);

  if (error !== undefined) {
    console.warn(`[ui] cannot navigate to "${key}": ${error}`);
    restoreNavigation(player, before);

    return false;
  }

  let destination: ScreenLocation;

  try {
    destination = copyLocation({ key, ...options.params === undefined ? {} : { params: options.params }, ...options.checkpoint });
  } catch (error: unknown) {
    console.warn(`[ui] cannot navigate to "${key}": ${String(error)}`);
    restoreNavigation(player, before);

    return false;
  }

  const { params, navigatorStates } = destination;

  options = { ...options, ...params === undefined ? {} : { params },
    ...options.checkpoint === undefined
      ? {}
      : { checkpoint: {
          ...navigatorStates === undefined ? {} : { navigatorStates },
        } } };

  const attempt = (attempts.get(player.id) ?? 0) + 1;

  attempts.set(player.id, attempt);

  if (options.replace !== true) { pushHistory(player.id); }

  const finish = (result: Navigated): boolean => {
    if (attempts.get(player.id) !== attempt) { return false; }

    pending.delete(player.id);

    if (result === false) {
      restoreNavigation(player, before);
    } else if (result === true) {
      noteLocation(player.id, destination);
    }

    return result !== false;
  };

  const failed = (error: unknown): never => {
    if (attempts.get(player.id) === attempt) {
      pending.delete(player.id);
      restoreNavigation(player, before);
    }

    throw error;
  };

  try {
    const result = withNavigationLocation(player.id, destination, () => navigator(key, player, options));

    if (result instanceof Promise) {
      pending.set(player.id, { attempt, before });

      return result.then(finish, failed);
    }

    return finish(result);
  } catch (error: unknown) {
    return failed(error);
  }
}

/**
 * Reopens the nearest destination with its public parameters and confirmed
 * page/tab context. A rejected destination leaves the current stack intact.
 * Returns false when there is no previous destination.
 */
export function back(player: Player, options: Omit<NavigateOptions, 'replace'> = {}): boolean {
  settlePending(player);

  const before = navigationSnapshot(player);
  const location = popLocation(player.id);

  if (location === undefined) {
    return false;
  }

  const { key, params, ...checkpoint } = location;
  const result = perform(key, player, { ...params === undefined ? {} : { params }, checkpoint, ...options, replace: true }, before);

  if (result instanceof Promise) {
    void result.catch((error: unknown) => { console.warn(`[ui] back navigation failed: ${String(error)}`); });

    return true;
  }

  return result;
}

/**
 * Ends this realm's session for a player another realm is now drawing for.
 *
 * The forms on screen are NOT closed: the realm that took the handoff has
 * already opened its own, and closing them would close that one. What ends is
 * this realm's side — its component tree, its input lock and the stack it kept
 * — so the session it rendered earlier cannot present itself again over a
 * player who has moved on.
 */
export function handOff(player: Player): void {
  clearHistory(player.id);
  endRender(player, { close: false, reason: 'released' });
}

/** Closes the current host and forgets destinations and pending opens. */
export function closeUi(player: Player): void {
  clearPlayerNavigation(player.id);
  endRender(player);
}

/** Discards disconnected-player state and invalidates outstanding host responses. */
export function clearPlayerNavigation(playerId: string): void {
  attempts.set(playerId, (attempts.get(playerId) ?? 0) + 1);
  pending.delete(playerId);
  clearHistory(playerId);
}
