import type { Player } from '@minecraft/server';
import type { DisplayText } from '@bedrock-core/i18n';
import { showCompiledTitle } from '../hosts/form/runtime';
import { playerOwner } from './fabric';
import { noteShown } from './history';
import { navigate } from './navigate';
import { staticScreens } from './render/screens';
import { endSession } from './render/session';

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

/** Every static screen one addon publishes, keyed as they are navigated. */
export interface AddonReference {
  readonly v: 1;
  /** The owning addon's namespace. */
  readonly ns: string;
  readonly screens: Readonly<Record<string, ScreenReference>>;
}

/**
 * Every static screen this bundle carries, as the record an addon publishes.
 *
 * Read straight off what the build baked — there is nothing to walk, because a
 * static screen has no component here to walk. Announce it once at startup and
 * any realm can show this addon's screens.
 */
export function addonReference(ns: string): AddonReference {
  const screens: Record<string, ScreenReference> = {};

  for (const record of staticScreens()) {
    screens[record.key] = record;
  }

  return { v: 1, ns, screens };
}

/** Narrows one screen's reference that arrived over the wire. */
export function isScreenReference(value: unknown): value is ScreenReference {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const candidate = value as Partial<ScreenReference>;

  return typeof candidate.title === 'string' && Array.isArray(candidate.values) && Array.isArray(candidate.targets);
}

/** Narrows a reference that arrived over the wire: the envelope, not every screen. */
export function isAddonReference(value: unknown): value is AddonReference {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const candidate = value as Partial<AddonReference>;

  return candidate.v === 1
    && typeof candidate.ns === 'string'
    && typeof candidate.screens === 'object'
    && candidate.screens !== null;
}

/** How a walk ended: the player pressed back out of it, or it is simply over. */
export type WalkResult = 'back' | 'done';

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
 * Shown by title rather than rendered, so whatever session the player was in
 * ends first: it would otherwise present its last screen again over this one.
 * Where they have been is kept, for `back()`.
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

  if (screen !== undefined) {
    endSession(playerOwner(player));
  }

  while (screen !== undefined) {
    // The screen the player is on, so a navigation away from it puts it behind them.
    noteShown(player.id, current);

    const selection = await showCompiledTitle(player, screen.title, [...screen.values]);
    const target = selection === undefined ? null : screen.targets[selection] ?? null;

    if (target === null) {
      return 'done';
    }

    if ('back' in target) {
      const previous = walked.pop();

      if (previous === undefined) {
        return 'back';
      }

      current = previous;
      screen = lookup(current);
      continue;
    }

    // A replacing press leaves nothing behind it: the next back returns to
    // what was under this screen, not to this screen.
    if (target.replace !== true) {
      walked.push(current);
    }

    current = target.to;
    screen = lookup(current);

    // A described target is shown from values baked with no props, so only a
    // screen the walk hands on has anything for the params to fill.
    if (screen === undefined) {
      navigate(current, player, {
        ...target.params === undefined ? {} : { params: target.params },
        ...target.replace === true ? { replace: true } : {},
      });
    }
  }

  return 'done';
}
