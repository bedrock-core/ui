/**
 * Where the UI should open, as something that can cross a realm.
 *
 * A screen is drawn by the addon whose pack holds it, so asking for one often means asking
 * another realm. What travels is plain data, read by whichever realm ends up showing it — and
 * what comes back the other way when the player leaves it.
 *
 * The `kind` is open. This package knows one of them, `screen`, because a key and its params are
 * the whole of what a cross-realm `navigate()` carries; every other kind belongs to the app that
 * serves it, and an app narrows the ones it draws. A kind nothing in this realm serves is a visible
 * failure rather than a guess at the nearest screen.
 */
import type { ReturnAddress } from '@bedrock-core/ui-runtime';

/** A place in the UI, as data. The fields beyond `kind` belong to whoever serves that kind. */
export interface UiTarget {
  readonly kind: string;

  /**
   * The addon this target is about, when it is about one.
   *
   * The one field the realm reads for itself rather than handing on: a kind nothing here serves
   * is sent to this addon's realm, which may have installed the app this one did not. Every app
   * whose targets are per-addon spells it the same way for that reason.
   */
  readonly addonId?: string;

  readonly [field: string]: unknown;
}

/** One compiled screen by the key it is navigated under — the kind this package serves itself. */
export interface ScreenTarget extends UiTarget {
  readonly kind: 'screen';
  readonly key: string;
  /** The props the screen is rendered with. Plain data, since a target crosses realms as JSON. */
  readonly params?: Readonly<Record<string, unknown>>;
}

/**
 * Narrow a target that arrived from somewhere this build does not control — off the wire, or out
 * of a return address another realm set.
 *
 * The envelope only: a `kind` that is a string, and for `screen` the key with nothing behind it
 * if it is missing. What an app's own kind requires is that app's to check.
 */
export function isUiTarget(value: unknown): value is UiTarget {
  if (typeof value !== 'object' || value === null || !('kind' in value)) { return false; }

  const { kind } = value;

  if (typeof kind !== 'string') { return false; }

  return kind !== 'screen' || ('key' in value && typeof value.key === 'string');
}

/** Whether a target names one compiled screen, with params that are an object when it has any. */
export function isScreenTarget(target: UiTarget): target is ScreenTarget {
  const { params } = target;

  return target.kind === 'screen'
    && typeof target.key === 'string'
    && (params === undefined || (typeof params === 'object' && params !== null && !Array.isArray(params)));
}

/** One realm a player crossed, with a target this UI can read back. */
export interface UiReturn extends ReturnAddress {
  readonly target: UiTarget;
}

/**
 * Narrows one hop of a way back that arrived over the wire.
 *
 * The realms that sent them may be older or newer than this one, so a path with anything
 * unreadable in it is dropped rather than half-walked.
 */
export function isUiReturn(value: unknown): value is UiReturn {
  if (typeof value !== 'object' || value === null) { return false; }

  const hop = value as { realm?: unknown; target?: unknown };

  return typeof hop.realm === 'string' && isUiTarget(hop.target);
}
