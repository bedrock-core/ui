/**
 * Shaping a replicated flat schema into what a screen renders.
 *
 * Everything here is pure and operates on the schema alone — no values, no RPC, no world.
 */
import type { ConfigScope, EntrySchema, FlatGroupsLike, FlatSchemaLike } from '../types';
import type { RemoteConfigAccessor } from '@bedrock-core/server-runtime';
import { buildNestedPatch } from './nested';

/** Get the scoped schema from an accessor (has scope prefixes on every key). */
export function getScopedSchema(accessor: RemoteConfigAccessor): FlatSchemaLike {
  return accessor.scopedSchema;
}

/**
 * Group display strings from an accessor, keyed the same way the schema is.
 *
 * Read defensively even though the property is typed: `@bedrock-core/server-runtime` is a PEER
 * dependency, so a consumer can pair this package with a runtime published before the group key
 * existed, and the getter would simply not be there. `{}` then means what it means for an addon
 * that names no group — fall back to the key-derived titles.
 */
export function getScopedGroups(accessor: RemoteConfigAccessor): FlatGroupsLike {
  return accessor.scopedGroups ?? {};
}

/** {@link filterScope} for the group map — same prefix rule, same result shape. */
export function filterScopeGroups(groups: FlatGroupsLike, scope: ConfigScope): FlatGroupsLike {
  const prefix = `${scope}.`;
  const result: FlatGroupsLike = {};

  for (const [key, meta] of Object.entries(groups)) {
    if (key.startsWith(prefix)) { result[key.slice(prefix.length)] = meta; }
  }

  return result;
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

/** Whether an entry has a native modal control, and so belongs in a form. */
export function isFormField(entry: EntrySchema): boolean {
  return entry.type !== 'list';
}

/**
 * Split a scoped flat schema into form fields (editable in one native modal form) and lists.
 *
 * A list is the one entry type with no native modal control — there is nothing for a form to
 * draw — so it is edited on a screen of its own. `multiselect` is NOT in that camp despite also
 * holding an array: its option set is fixed and known, so it draws as one checkbox per option.
 */
export function splitScalarsAndLists(schema: FlatSchemaLike): { scalars: FlatSchemaLike; lists: FlatSchemaLike } {
  const scalars: FlatSchemaLike = {};
  const lists: FlatSchemaLike = {};

  for (const [key, entry] of Object.entries(schema)) {
    if (isFormField(entry)) { scalars[key] = entry; } else { lists[key] = entry; }
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

/** One level of the section tree: what it is called, what it holds, and what nests under it. */
export interface SectionNode {
  /** Dot-path of this section within the scope. `''` for the scope root. */
  path: string;

  /** Display title. The group's `$label` when it declared one, else derived from the key. */
  label: string;
  description?: string;

  /** Leaf entries sitting directly on this section, keyed by FULL dot-path, in declared order. */
  entries: [string, EntrySchema][];

  /** Sections nested under this one, in the order their first entry was declared. */
  children: SectionNode[];
}

/**
 * The flat schema as the tree it was authored as.
 *
 * Splits on EVERY dot rather than only the first, so depth is unbounded — the old
 * `groupByTopLevel` collapsed `economy.pricing.taxRate` into a group `economy` holding a
 * literal `pricing.taxRate` key, which is why a third level could never render as its own
 * section. Order follows the flat schema, which the runtime emits depth-first in declaration
 * order, so a screen reads in the order the addon wrote it.
 */
export function buildSectionTree(schema: FlatSchemaLike, groups: FlatGroupsLike = {}): SectionNode {
  const root = newSection('', groups);

  for (const [key, entry] of Object.entries(schema)) {
    const parts = key.split('.');
    let node = root;

    // Everything but the last segment names a section; walk it into existence.
    for (let i = 0; i < parts.length - 1; i++) {
      const path = parts.slice(0, i + 1).join('.');
      let child = node.children.find(c => c.path === path);

      if (!child) { child = newSection(path, groups); node.children.push(child); }

      node = child;
    }

    node.entries.push([key, entry]);
  }

  return root;
}

/** A section with its declared strings resolved, or the key-derived title when it declared none. */
function newSection(path: string, groups: FlatGroupsLike): SectionNode {
  const meta = groups[path];
  const leaf = path.slice(path.lastIndexOf('.') + 1);

  return {
    path,
    label: meta?.label ?? `${leaf.charAt(0).toUpperCase()}${leaf.slice(1)}`,
    ...(meta?.description !== undefined ? { description: meta.description } : {}),
    entries: [],
    children: [],
  };
}

/** The entries of a section that need a form — everything except its lists. */
export function formEntries(node: SectionNode): [string, EntrySchema][] {
  return node.entries.filter(([, entry]) => isFormField(entry));
}

/** The list entries of a section, each of which gets a row and a screen of its own. */
export function listEntries(node: SectionNode): [string, EntrySchema][] {
  return node.entries.filter(([, entry]) => !isFormField(entry));
}

/**
 * Whether a section renders as a screen of buttons rather than as a form.
 *
 * A native modal has exactly two controls — its submit and its dismiss — so there is no third
 * one to navigate with; a level holding settings therefore HAS to be the form, and can only show
 * its sub-sections inline. A level holding none is free to be a screen of buttons, which is the
 * only way a deep tree stays navigable.
 *
 * Lists do not count against it. A list has no native modal control either, so it never needed
 * the form in the first place — on a button screen it becomes a row and gets a real editor, and
 * only when it is stranded on a form level does it fall back to naming the command that edits
 * it. That is the whole rule: where a button can be offered, it is.
 */
export function isPureSection(node: SectionNode): boolean {
  return formEntries(node).length === 0 && (node.children.length > 0 || listEntries(node).length > 0);
}

/** Find a section by dot-path — how a section screen re-locates itself from its route params. */
export function findSection(root: SectionNode, path: string): SectionNode | undefined {
  if (path === '') { return root; }

  let node: SectionNode | undefined = root;

  for (let i = 1; i <= path.split('.').length; i++) {
    const prefix = path.split('.').slice(0, i).join('.');

    node = node?.children.find(c => c.path === prefix);

    if (!node) { return undefined; }
  }

  return node;
}
