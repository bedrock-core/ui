/**
 * Turning a command argument into a config value.
 *
 * A command carries strings; a schema entry describes a boolean, a bounded number, a string with
 * a length cap, or one of a fixed set. This is the whole conversion, and it is pure so the
 * command callbacks can answer a bad value immediately — validation happens in the callback,
 * while the write itself has to wait for a tick it is allowed to run in.
 */
import { CONFIG_SCOPES, type ConfigScope, type EntrySchema, type FlatSchemaLike } from '../types';

/** This addon's own flat schema, per scope. */
export type ScopedSchemas = Record<ConfigScope, FlatSchemaLike>;

/** What a command argument turned into, or why it could not. */
export type Parsed = { ok: true; value: boolean | number | string } | { ok: false; message: string };

/**
 * Keys a command can carry — every key the schema declares.
 *
 * Lists used to be filtered out here for want of a single-value spelling, which made autocomplete
 * offer a key only to fail on submit. `add`, `remove` and a comma-separated `set` are that
 * spelling, and chat is the only place a list can be edited at all, so hiding them was hiding the
 * setting. Nothing else is held back either: an entry whose `type` this build has never seen still
 * reads with `get`, and only refuses on the write, which is the same bargain the screens make.
 */
export function editableKeys(schema: FlatSchemaLike): string[] {
  return Object.keys(schema);
}

/** `server.pricing.taxRate` → `['server', 'pricing.taxRate']`. */
export function splitScopedKey(key: string): [ConfigScope, string] {
  const dot = key.indexOf('.');
  const head = dot === -1 ? key : key.slice(0, dot);
  const scope = CONFIG_SCOPES.find(candidate => candidate === head);

  // Unreachable through the enum, which only offers prefixed keys; a bare key is treated as
  // server scope so a hand-typed one still means something rather than throwing.
  return scope ? [scope, key.slice(dot + 1)] : ['server', key];
}

/** Convert one command argument to the value its schema entry describes. */
export function parseValue(entry: EntrySchema | undefined, raw: string): Parsed {
  if (!entry) { return { ok: false, message: 'Unknown setting' }; }

  if (entry.type === 'boolean') {
    if (raw === 'true' || raw === 'false') { return { ok: true, value: raw === 'true' }; }

    return { ok: false, message: 'Expected true or false' };
  }

  if (entry.type === 'number') {
    const value = Number(raw);

    if (raw.trim() === '' || !Number.isFinite(value)) { return { ok: false, message: 'Expected a number' }; }

    if (entry.min !== undefined && value < entry.min) { return { ok: false, message: `Minimum is ${entry.min}` }; }

    if (entry.max !== undefined && value > entry.max) { return { ok: false, message: `Maximum is ${entry.max}` }; }

    return { ok: true, value };
  }

  if (entry.type === 'enum') {
    if (entry.options?.includes(raw)) { return { ok: true, value: raw }; }

    return { ok: false, message: `Expected one of: ${(entry.options ?? []).join(', ')}` };
  }

  if (entry.type === 'string') {
    if (entry.maxLength !== undefined && raw.length > entry.maxLength) {
      return { ok: false, message: `Longer than the ${entry.maxLength} character limit` };
    }

    return { ok: true, value: raw };
  }

  return { ok: false, message: `'${entry.type}' settings cannot be changed from a command` };
}
