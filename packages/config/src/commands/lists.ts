/**
 * List settings from a command.
 *
 * A list is the one entry type with no native modal control — a form has nothing to draw for it —
 * so chat is the only place it can be edited, and it used to be left out of the command enum
 * entirely for want of a spelling. `set` alone is not that spelling: replacing the whole list to
 * add one entry means retyping everything already in it, and getting one wrong silently drops it.
 * Hence `add` and `remove` beside it. All three end in the same place — a whole array of items.
 *
 * Storage is one flat key holding the array's JSON, which is what the runtime's own flattening
 * does with an array, so a list is patched exactly like a scalar with `JSON.stringify` standing in
 * for the value.
 *
 * Everything here is pure, so a command callback can refuse a bad item immediately — only the
 * write itself has to wait for a tick it is allowed to run in.
 */
import { getNestedValue } from '../config/nested';
import type { CoreT } from '../i18n';
import type { EntrySchema } from '../types';

/** The items a verb produced, or why it produced none. */
export type ListResult = { ok: true; items: string[] } | { ok: false; message: string };

/** What separates items in a `set` argument, and in what `get` prints back. */
const SEPARATOR = ',';

/**
 * The items currently at a dot-path, from the effective values a scope read returns.
 *
 * A scope read already parses a list back into an array, but the stored form is the JSON string;
 * both are accepted so a value that took some other route here is not reported as an empty list.
 */
export function readList(values: Record<string, unknown>, path: string): string[] {
  const value = getNestedValue(values, path);

  if (Array.isArray(value)) { return value.map(String); }

  if (typeof value === 'string') {
    try {
      const parsed: unknown = JSON.parse(value);

      return Array.isArray(parsed) ? parsed.map(String) : [];
    } catch { return []; }
  }

  return [];
}

/**
 * A list for chat: `[tnt, lava_bucket] (2/50)`.
 *
 * The count rides along only when the schema caps the list, since `(2/∞)` says nothing. An empty
 * list gets a word rather than an empty bracket pair — `[]` reads as much like a screen that
 * failed to render as like a setting with nothing in it.
 */
export function describeList(entry: EntrySchema, items: string[], t: CoreT): string {
  const value = items.length === 0 ? t($ => $.command.list.empty) : `[${items.join(`${SEPARATOR} `)}]`;

  if (entry.maxItems === undefined) { return value; }

  return `${value} ${t($ => $.command.list.count, { count: items.length, max: entry.maxItems })}`;
}

/** `set` — the whole list, from one comma-separated argument. */
export function setList(entry: EntrySchema, raw: string, t: CoreT): ListResult {
  const items: string[] = [];

  for (const part of raw.split(SEPARATOR)) {
    const item = part.trim();

    // An empty segment is a stray or trailing comma, not an item. It is also what an empty
    // argument splits into, which is what makes `set <key> ""` the way to clear a list rather
    // than a list holding one empty string.
    if (item === '') { continue; }

    const rejected = rejectItem(entry, item, t);

    if (rejected !== undefined) { return { ok: false, message: rejected }; }

    // `add` refuses a duplicate, so `set` accepting one would make the same list legal or not
    // depending on how it was typed.
    if (items.includes(item)) { return { ok: false, message: t($ => $.command.list.repeated, { item }) }; }

    items.push(item);
  }

  if (entry.maxItems !== undefined && items.length > entry.maxItems) {
    return { ok: false, message: t($ => $.command.list.tooMany, { count: items.length, max: entry.maxItems }) };
  }

  return { ok: true, items };
}

/** `add` — one item appended, refusing a duplicate and refusing to pass `maxItems`. */
export function addToList(entry: EntrySchema, current: string[], raw: string, t: CoreT): ListResult {
  const item = raw.trim();
  const rejected = rejectItem(entry, item, t);

  if (rejected !== undefined) { return { ok: false, message: rejected }; }

  // Checked before the cap: on a full list holding the item already, "it is in there" is the
  // answer that tells the player what to do next.
  if (current.includes(item)) { return { ok: false, message: t($ => $.command.list.duplicate, { item }) }; }

  if (entry.maxItems !== undefined && current.length >= entry.maxItems) {
    return { ok: false, message: t($ => $.command.list.full, { max: entry.maxItems }) };
  }

  return { ok: true, items: [...current, item] };
}

/**
 * `remove` — one item taken back out.
 *
 * An item that is not there is refused rather than quietly accepted: a no-op reported as success
 * reads exactly like a typo that landed, and the list is not shown again afterwards to contradict
 * it. Nothing validates the item against `options` here — what matters is whether the list holds
 * it, and a list that somehow holds a value no longer in `options` must still be clearable.
 */
export function removeFromList(current: string[], raw: string, t: CoreT): ListResult {
  const item = raw.trim();
  const items = current.filter(candidate => candidate !== item);

  if (items.length === current.length) { return { ok: false, message: t($ => $.command.list.absent, { item }) }; }

  return { ok: true, items };
}

/**
 * Why an item is not allowed in this list, or `undefined` when it is. Only an enum list
 * constrains its items, and the failure names every value that would have worked — the enum
 * autocompletes the SETTING, never the item, so the options are otherwise unreachable from chat.
 */
function rejectItem(entry: EntrySchema, item: string, t: CoreT): string | undefined {
  if (entry.itemType !== 'enum') { return undefined; }

  const options = entry.options ?? [];

  if (options.includes(item)) { return undefined; }

  return t($ => $.command.list.notAnOption, { item, options: options.join(`${SEPARATOR} `) });
}
