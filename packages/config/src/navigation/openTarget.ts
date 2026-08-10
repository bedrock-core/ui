/**
 * Turning a fired command into a place in the UI.
 *
 * This runs on the ELECTED HOST, not necessarily on the realm whose command was typed, and that
 * is the whole point: what a request means is a decision the newest installed runtime gets to
 * make. Adding a scope, renaming one, fixing a mis-parse — all of it ships by installing one
 * updated addon, without touching the realm the player typed into.
 *
 * Arguments arrive as raw wire values and are read defensively for the same reason. The commands
 * in this version send only the addon id, but a scope and target are still understood: a caller
 * reaching {@link openTargetFrom} directly can deep-link, and a future command shape gets to
 * without the host having to change. Absent values arrive as `undefined` or (after JSON transit)
 * `null`, and {@link stringAt} flattens both.
 */
import { CONFIG_SCOPES, type ConfigScope } from '../types';

/**
 * What a fired command asked for, independent of the name it was typed under.
 *
 * Commands live in each addon's own namespace, so the name carries the addon rather than the
 * intent — `bt_gc_shop:config` and `bt_gc_graves:config` are the same request about different
 * addons. The addon travels in `args[0]`; this is the rest.
 */
export type OpenCommand = 'list' | 'guide' | 'config';

/** Where a command wants the UI to open. */
export type OpenTarget
  = | { kind: 'list'; addonId?: string }
    | { kind: 'guide'; addonId?: string }
    | { kind: 'config'; addonId?: string; scope?: ConfigScope; scopeId?: string };

/** Positional read that tolerates `undefined`, `null`, and anything non-string. */
function stringAt(args: readonly unknown[], index: number): string | undefined {
  const value = args[index];

  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

/**
 * Narrow a raw wire argument to a scope this build knows. Anything else — a newer realm's
 * scope, a typo, a hand-typed command — becomes `undefined` and the UI falls back to the scope
 * picker rather than deep-linking somewhere it cannot render.
 */
function resolveScope(scope: string | undefined): ConfigScope | undefined {
  return CONFIG_SCOPES.find(candidate => candidate === scope);
}

/**
 * Build the {@link OpenTarget} for a command and its raw arguments. An unrecognised command
 * falls back to the addon list, so a future realm forwarding a command this version has never
 * heard of still opens something usable instead of throwing at the player.
 */
export function openTargetFrom(command: OpenCommand, args: readonly unknown[]): OpenTarget {
  const addonId = stringAt(args, 0);

  if (command === 'guide') { return { kind: 'guide', addonId }; }

  if (command === 'config') {
    return {
      kind: 'config',
      addonId,
      scope: resolveScope(stringAt(args, 1)),
      scopeId: stringAt(args, 2),
    };
  }

  return { kind: 'list', addonId };
}
