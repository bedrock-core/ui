/**
 * Reading and writing another addon's config values, and enumerating what a scope can target.
 *
 * This is the side of the config domain that leaves the process: every `get`/`patch` here is an
 * RPC round trip to the owning addon, which authorizes it against the `actorId` the accessor was
 * built with. Screens obtain that accessor from `core.config.of(addonId, { actorId })` — passing
 * the viewing player, never omitting it.
 */
import { DimensionTypes, world } from '@minecraft/server';
import type { RemoteConfigAccessor } from '@bedrock-core/server-runtime';
import type { ConfigScope } from '../types';
import { isRecord } from './nested';

/** Fetch current values for a scope + entityId from a remote accessor (RPC round trip). */
export async function getScopeValues(
  accessor: RemoteConfigAccessor,
  scope: ConfigScope,
  entityId?: string,
): Promise<Record<string, unknown>> {
  let raw: unknown;

  if (scope === 'server') {
    raw = await accessor.server.get();
  } else if (scope === 'dimension') {
    raw = entityId ? await accessor.dimension.get(entityId) : undefined;
  } else {
    raw = entityId ? await accessor.player.get(entityId) : undefined;
  }

  return isRecord(raw) ? raw : {};
}

/** Patch a scope with staged values. */
export function patchScope(
  accessor: RemoteConfigAccessor,
  scope: ConfigScope,
  entityId: string | undefined,
  patch: Record<string, unknown>,
): void {
  if (scope === 'server') {
    void accessor.server.patch(patch);
  } else if (scope === 'dimension' && entityId) {
    void accessor.dimension.patch(entityId, patch);
  } else if (scope === 'player' && entityId) {
    void accessor.player.patch(entityId, patch);
  }
}

/**
 * List the selectable entities for a 'dimension' or 'player' scope. World-global facts —
 * enumerated locally in this realm rather than replicated per addon over the transport.
 */
export function getRoster(scope: 'dimension' | 'player'): { id: string; name: string }[] {
  return scope === 'dimension'
    ? DimensionTypes.getAll().map(d => ({ id: d.typeId, name: d.typeId }))
    : world.getAllPlayers().map(p => ({ id: p.id, name: p.name }));
}
