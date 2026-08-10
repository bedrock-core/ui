/**
 * Shaping a replicated flat schema into what a screen renders.
 *
 * Everything here is pure and operates on the schema alone — no values, no RPC, no world.
 */
import type { ConfigScope, EntrySchema, FlatSchemaLike } from '../types';
import type { RemoteConfigAccessor } from '@bedrock-core/server-runtime';
import { buildNestedPatch } from './nested';

/** Get the scoped schema from an accessor (has scope prefixes on every key). */
export function getScopedSchema(accessor: RemoteConfigAccessor): FlatSchemaLike {
  return accessor.scopedSchema;
}

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

/**
 * A patch that puts every entry in a scope back to the value its addon's code declares.
 *
 * Nested rather than flat because that is what `patchScope` sends, and it deliberately names
 * every key: a `patch` only touches what it carries, so listing all of them is what makes this
 * a reset rather than a partial one.
 */
export function schemaDefaultsPatch(schema: FlatSchemaLike): Record<string, unknown> {
  const flat: Record<string, unknown> = {};

  for (const [key, entry] of Object.entries(schema)) { flat[key] = entry.default; }

  return buildNestedPatch(flat);
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
