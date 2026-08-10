/**
 * Moving between the flat dot-paths a schema is keyed by and the nested objects the config
 * transport carries.
 *
 * Pure and dependency-free — used by the screens and by the config commands alike, neither of
 * which should have to care that the two shapes exist.
 */
import type { EntrySchema } from '../types';

/** Narrow an unknown to a plain record without an unsafe assertion. */
export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

/** As {@link isRecord}, but for callers that want a record either way — a copy, or an empty one. */
export function asRecord(value: unknown): Record<string, unknown> {
  return isRecord(value) ? { ...value } : {};
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
