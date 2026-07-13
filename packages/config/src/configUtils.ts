import { DimensionTypes, world } from '@minecraft/server';
import type { RemoteConfigAccessor } from '@bedrock-core/server-runtime';

export type EntrySchema = {
  type: string;
  label: string;
  default: unknown;
  description?: string;
  min?: number;
  max?: number;
  step?: number;
  options?: readonly string[];
  maxItems?: number;
  itemType?: string;
};
export type FlatSchemaLike = Record<string, EntrySchema>;

export type ConfigScope = 'server' | 'dimension' | 'player';

/** Strip scope prefix from scoped flat schema keys (e.g. 'server.pricing.taxRate' → 'pricing.taxRate'). */
export function filterScope(
  schema: FlatSchemaLike,
  scope: ConfigScope,
): FlatSchemaLike {
  const prefix = `${scope}.`;
  const result: FlatSchemaLike = {};

  for (const [key, entry] of Object.entries(schema)) {
    if (key.startsWith(prefix)) { result[key.slice(prefix.length)] = entry; }
  }

  return result;
}

/** Get the scoped schema from an accessor (has scope prefixes on every key). */
export function getScopedSchema(accessor: RemoteConfigAccessor): FlatSchemaLike {
  return accessor.scopedSchema;
}

/** Narrow an unknown to a plain record without an unsafe assertion. */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

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

/**
 * Split a scoped flat schema into scalar entries (editable in one native modal
 * form) and list entries (each edited on its own screen — a list has no native
 * modal control).
 */
export function splitScalarsAndLists(schema: FlatSchemaLike): { scalars: FlatSchemaLike; lists: FlatSchemaLike } {
  const scalars: FlatSchemaLike = {};
  const lists: FlatSchemaLike = {};

  for (const [key, entry] of Object.entries(schema)) {
    if (entry.type === 'list') { lists[key] = entry; } else { scalars[key] = entry; }
  }

  return { scalars, lists };
}

/** Group flat schema entries by their first dot-segment. */
export function groupByTopLevel(schema: FlatSchemaLike): Map<string, [string, EntrySchema][]> {
  const groups = new Map<string, [string, EntrySchema][]>();

  for (const [key, entry] of Object.entries(schema)) {
    const dot = key.indexOf('.');
    const group = dot === -1 ? '' : key.slice(0, dot);
    const subKey = dot === -1 ? key : key.slice(dot + 1);
    let arr = groups.get(group);

    if (!arr) { arr = []; groups.set(group, arr); }

    arr.push([subKey, entry]);
  }

  return groups;
}

/** Read a value from a nested object using a dot-path. */
export function getNestedValue(obj: unknown, path: string): unknown {
  const parts = path.split('.');
  let cur = obj;

  for (const part of parts) {
    if (!isRecord(cur)) { return undefined; }

    cur = cur[part];
  }

  return cur;
}

/** Convert a flat Record<dotKey, value> to a nested object for patching. */
export function buildNestedPatch(flat: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const [dotPath, value] of Object.entries(flat)) {
    const parts = dotPath.split('.');
    let cur = result;

    for (let i = 0; i < parts.length - 1; i++) {
      const key = parts[i];
      const existing = cur[key];
      const next = isRecord(existing) ? existing : {};

      cur[key] = next;
      cur = next;
    }

    cur[parts[parts.length - 1]] = value;
  }

  return result;
}

/** Resolve the initial value for a flat key from nested current values. */
export function resolveInitialValue(
  flatKey: string,
  entry: EntrySchema,
  currentValues: Record<string, unknown>,
): unknown {
  const val = getNestedValue(currentValues, flatKey);

  if (val !== undefined) { return val; }

  if (entry.type === 'list' && typeof entry.default === 'string') {
    try {
      const parsed: unknown = JSON.parse(entry.default);

      return Array.isArray(parsed) ? parsed : [];
    } catch { return []; }
  }

  return entry.default;
}
