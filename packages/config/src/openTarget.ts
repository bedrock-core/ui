/**
 * Turning a fired command into a place in the UI.
 *
 * This runs on the ELECTED HOST, never on the realm that owns the commands, and that is the
 * whole point: what `core:config bc_shop player Steve` means is a decision the newest
 * installed runtime gets to make. Adding a scope, renaming one, fixing a mis-parse — all of
 * it ships by installing one updated addon, without touching the realm the player typed into.
 *
 * Arguments arrive as raw wire values. Bedrock's optional command parameters are positional
 * and can only be omitted from the right, so index-by-position is safe; absent ones arrive as
 * `undefined` or (after JSON transit) `null`, and {@link stringAt} flattens both to `undefined`.
 */
import type { OpenCommand } from './commands';
import type { ConfigScope } from './routes';

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

function resolveScope(scope: string | undefined): ConfigScope | undefined {
  if (scope === 'server' || scope === 'dimension' || scope === 'player') {
    return scope;
  }

  return undefined;
}

/**
 * Build the {@link OpenTarget} for a command and its raw arguments. An unrecognised command
 * falls back to the addon list, so a future realm forwarding a command this version has never
 * heard of still opens something usable instead of throwing at the player.
 */
export function openTargetFrom(command: OpenCommand, args: readonly unknown[]): OpenTarget {
  const addonId = stringAt(args, 0);

  if (command === 'core:guide') { return { kind: 'guide', addonId }; }

  if (command === 'core:config') {
    return {
      kind: 'config',
      addonId,
      scope: resolveScope(stringAt(args, 1)),
      scopeId: stringAt(args, 2),
    };
  }

  return { kind: 'list', addonId };
}
