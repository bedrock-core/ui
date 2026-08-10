/**
 * Where a scoped command reads from and writes to.
 *
 * A `[target]` argument means a different thing per scope — nothing for server, a dimension id,
 * or a player name — so it is resolved once, into a value discriminated by scope. After that the
 * read and write helpers never have to sniff what they were handed.
 *
 * These reach the addon's OWN config through `core.config.local`, not over RPC: the command is
 * registered by the realm that owns the data, so there is nobody to ask.
 */
import { Player, world } from '@minecraft/server';
import type { Dimension } from '@minecraft/server';
import type { Runtime } from '@bedrock-core/server-runtime';
import type { ConfigScope } from '../types';
import { asRecord, getNestedValue } from '../config/nested';

/** Where a scoped read or write lands, or why it could not be resolved. */
export type Target
  = | { ok: true; scope: 'server' }
    | { ok: true; scope: 'dimension'; dimension: Dimension }
    | { ok: true; scope: 'player'; player: Player }
    | { ok: false; message: string };

/** A resolved target — the shape the read and write helpers accept. */
export type ResolvedTarget = Extract<Target, { ok: true }>;

/**
 * Resolve the optional `[target]` argument. Server scope has none. Dimension and player scope
 * default to the runner, so `_setat player.allowGifts false` means "for me" — a command block
 * has no runner and must name one.
 */
export function resolveTarget(
  scope: ConfigScope,
  targetId: string | undefined,
  runner: Player | undefined,
): Target {
  if (scope === 'server') { return { ok: true, scope: 'server' }; }

  if (targetId === undefined) {
    if (!runner) { return { ok: false, message: `A ${scope} must be named when no player is running the command` }; }

    return scope === 'player'
      ? { ok: true, scope: 'player', player: runner }
      : { ok: true, scope: 'dimension', dimension: runner.dimension };
  }

  if (scope === 'player') {
    const match = world.getAllPlayers().find(candidate => candidate.name === targetId || candidate.id === targetId);

    return match
      ? { ok: true, scope: 'player', player: match }
      : { ok: false, message: `No player named '${targetId}' is online` };
  }

  try {
    return { ok: true, scope: 'dimension', dimension: world.getDimension(targetId) };
  } catch {
    return { ok: false, message: `No dimension named '${targetId}'` };
  }
}

/** Effective values for a resolved target, as the nested object the dot-paths index into. */
export function read(core: Runtime, target: ResolvedTarget): Record<string, unknown> {
  const local = core.config.local;

  if (!local) { return {}; }

  if (target.scope === 'server') { return asRecord(local.server.get()); }

  if (target.scope === 'player') { return asRecord(local.player.get(target.player)); }

  return asRecord(local.dimension.get(target.dimension));
}

export function write(core: Runtime, target: ResolvedTarget, patch: Record<string, unknown>): void {
  const local = core.config.local;

  if (!local) { return; }

  if (target.scope === 'server') {
    local.server.patch(patch);
  } else if (target.scope === 'player') {
    local.player.patch(target.player, patch);
  } else {
    local.dimension.patch(target.dimension, patch);
  }
}

/** Render one value for chat, distinguishing "not set" from a value that is literally empty. */
export function describe(values: Record<string, unknown>, path: string): string {
  const value = getNestedValue(values, path);

  return value === undefined ? '(unset)' : String(value);
}
