import { system, type Player } from '@minecraft/server';
import type { DisplayText } from '@bedrock-core/ui-runtime';
import { endRender, renderSession, showCompiledTitle, staticScreen, staticScreens } from '@bedrock-core/ui-runtime';
import { currentLocation, noteShown, popHistory, pushHistory } from './history';
import { navigate } from './navigate';

/**
 * A screen as another addon can show it.
 *
 * The prose, the textures and the layout are already in the pack every client
 * holds — an addon's compiled screens ship with it. What a realm needs in order
 * to SHOW one it did not build is small: the title the client picks the layout
 * by, the value each entry is shown with, and where each press leads. That is a
 * reference, and it is what replicates.
 *
 * Only a STATIC screen has one. A screen is static when every press is a
 * `<Link>` or the way out: its behaviour is then data, and following it needs
 * none of the owner's script. A press running the owner's own handler cannot be
 * described, so it is `null` here and does nothing when a foreign realm draws
 * the screen — the screen still shows, and the presses that are links still
 * work. The way out needs no entry at all: the client closes the form, and the
 * walk ends with it.
 */
export interface ScreenReference {
  /** `<addon>:<name>`, the same key the screen is navigated by. */
  readonly key: string;
  /** The compiled title the client picks the layout by. */
  readonly title: string;
  /** The value each entry is shown with, in `selection` order. */
  readonly values: readonly DisplayText[];
  /** Where each `selection` leads: another screen, back, or nowhere describable. */
  readonly targets: readonly ReferenceTarget[];
}

/**
 * Where one press leads: another screen, the way back, or nowhere describable.
 *
 * `back` is the one a walk cannot infer. A screen closing and a press that does
 * nothing look identical from outside — the form answers `undefined` either way
 * — so a back control that is only a close leaves whoever opened the screen
 * unable to tell "take me back" from "I am done". As an entry it is neither
 * guess: the press is attributed, and the walk ends saying which it was.
 *
 * `params` are the props the press opens its target with, as the link wrote
 * them. A reference is written by the build and read by other realms, so they
 * are plain data.
 */
export type ReferenceTarget = { readonly to: string; readonly params?: Readonly<Record<string, unknown>>; readonly replace?: true } | { readonly back: true } | null;

/** This bundle's compiled screens, as the wire table published through Core. */
export function screenReferences(): Readonly<Record<string, ScreenReference>> {
  const screens: Record<string, ScreenReference> = {};

  for (const record of staticScreens()) {
    screens[record.key] = { key: record.key, title: record.title, values: record.values,
      targets: record.actions.map(action => isReferenceTarget(action) ? action : null) };
  }

  return screens;
}

function isReferenceTarget(value: unknown): value is ReferenceTarget {
  if (value === null) { return true; }

  if (typeof value !== 'object' || Array.isArray(value)) { return false; }

  return ('back' in value && value.back === true) || ('to' in value && typeof value.to === 'string');
}

/** A compiled static layout interpreted as navigation action data. */
export function staticReference(key: string): ScreenReference | undefined {
  const record = staticScreen(key);

  return record === undefined
    ? undefined
    : { key: record.key, title: record.title, values: record.values,
        targets: record.actions.map(action => isReferenceTarget(action) ? action : null) };
}

/** Narrows one screen's reference that arrived over the wire. */
export function isScreenReference(value: unknown): value is ScreenReference {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const candidate = value as Partial<ScreenReference>;

  return typeof candidate.title === 'string' && Array.isArray(candidate.values) && Array.isArray(candidate.targets);
}

/** A completed walk, a Back press, or ownership transferred to another operation. */
export type WalkResult = 'back' | 'done' | 'handed-off';

const walks = new Map<string, symbol>();

const nextTick = (): Promise<void> => new Promise((resolve) => { system.runTimeout(resolve, 2); });

/**
 * Shows a foreign screen and follows its links: each screen by its title with
 * its baked values, each press taken to the next, until a press leads nowhere
 * or the player leaves.
 *
 * The whole of presenting another addon's screens. The client draws every one
 * of them from the pack it already has, and no script of the owner's runs.
 *
 * Each screen shown is recorded on the player's stack, so a `back` target inside
 * the walk returns to the previous screen of the walk; a `back` from the FIRST
 * one has nothing left to return to and ends the walk with `'back'`, which is
 * how whoever opened it knows to show what the player came from.
 *
 * The previous render session and its native form close before the walk begins.
 * Its navigation history remains available to `back()`.
 *
 * A link to a key the table does not describe — a screen with handlers of its
 * own, or one only its owner's realm can draw — is still a link: the walk ends
 * by navigating to it with the link's params, with the screen it leaves recorded
 * as the one shown, so `back()` from there returns here.
 *
 * @param lookup - What resolves a key into a reference; a link to a key it does
 *   not know is navigated to instead.
 * @param key - Where to start.
 * @param player - Who is shown the screens.
 */
export async function presentReference(
  lookup: (key: string) => ScreenReference | undefined,
  key: string,
  player: Player,
): Promise<WalkResult> {
  const walked: string[] = [];
  let current = key;
  let screen = lookup(current);

  if (screen === undefined) { return 'done'; }

  const flush = renderSession(player.id) !== undefined || walks.has(player.id);
  const walk = Symbol(key);
  let shownKey: string | undefined;
  const ownsForm = (): boolean => walks.get(player.id) === walk
    && renderSession(player.id) === undefined;
  const isCurrent = (): boolean => ownsForm() && currentLocation(player)?.key === shownKey;

  const recordLocation = (): void => {
    noteShown(player.id, current);
    shownKey = currentLocation(player)?.key;
  };

  walks.set(player.id, walk);

  try {
    endRender(player, { reason: 'released' });

    if (!ownsForm()) { return 'handed-off'; }

    recordLocation();

    if (flush) {
      // A show queued during this tick must reach the native UI before its close.
      await nextTick();

      if (!isCurrent()) { return 'handed-off'; }

      endRender(player, { reason: 'released' });
      await nextTick();

      if (!isCurrent()) { return 'handed-off'; }
    }

    while (screen !== undefined) {
      const selection = await showCompiledTitle(player, screen.title, [...screen.values]);

      if (!isCurrent()) { return 'handed-off'; }

      const target = selection === undefined ? null : screen.targets[selection] ?? null;

      if (target === null) { return 'done'; }

      if ('back' in target) {
        const previous = walked.pop();

        if (previous === undefined) { return 'back'; }

        current = previous;
        popHistory(player.id);
        screen = lookup(current);
        recordLocation();
        continue;
      }

      if (target.replace !== true) { walked.push(current); }

      const next = lookup(target.to);

      if (next !== undefined && target.replace !== true) { pushHistory(player.id); }

      current = target.to;
      screen = next;

      // Only a destination with its own host can receive runtime parameters.
      if (screen === undefined) {
        const accepted = navigate(current, player, {
          ...target.params === undefined ? {} : { params: target.params },
          ...target.replace === true ? { replace: true } : {},
        });

        return accepted ? 'handed-off' : 'done';
      }

      recordLocation();
    }

    return 'done';
  } finally {
    if (walks.get(player.id) === walk) { walks.delete(player.id); }
  }
}
