/**
 * Plain data: what is written as JSON and read back unchanged.
 *
 * A link's params stop belonging to the component that wrote them once they
 * are described — baked into a static screen's table, or sent to the realm
 * that draws a screen — and both of those are JSON. Strings, finite numbers,
 * booleans, null, and arrays and plain objects of those come out as they went
 * in. A function, a class instance, `undefined` or `NaN` would arrive changed or
 * not at all, with nothing to say so, which is why they are refused up front.
 */

/** A key that reads as `path.key`; anything else reads as `path["key"]`. */
const IDENTIFIER = /^[A-Za-z_$][\w$]*$/;

const member = (path: string, key: string): string =>
  (IDENTIFIER.test(key) ? `${path}.${key}` : `${path}[${JSON.stringify(key)}]`);

/**
 * Why a value is not plain data, or undefined when it is.
 *
 * @param value - What to check.
 * @param path - How the author names `value`, so the answer points at the part
 *   that is not data rather than at the whole.
 * @returns The first part that is not data, in the author's words:
 *   `` `params.onPick` is a function ``.
 */
export function whyNotPlainData(value: unknown, path: string): string | undefined {
  return visit(value, path, []);
}

function visit(value: unknown, path: string, ancestors: readonly object[]): string | undefined {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') {
    return undefined;
  }

  if (typeof value === 'number') {
    return Number.isFinite(value) ? undefined : `\`${path}\` is ${String(value)}`;
  }

  if (value === undefined) {
    return `\`${path}\` is undefined`;
  }

  // A function, a bigint or a symbol: nothing JSON writes back as it was.
  if (typeof value !== 'object') {
    return `\`${path}\` is a ${typeof value}`;
  }

  // JSON cannot write a value that contains itself at all.
  if (ancestors.includes(value)) {
    return `\`${path}\` contains itself`;
  }

  const inside = [...ancestors, value];

  if (Array.isArray(value)) {
    const items: readonly unknown[] = value;

    for (let index = 0; index < items.length; index += 1) {
      const why = visit(items[index], `${path}[${String(index)}]`, inside);

      if (why !== undefined) {
        return why;
      }
    }

    return undefined;
  }

  const prototype: unknown = Object.getPrototypeOf(value);

  if (prototype !== Object.prototype && prototype !== null) {
    const name = typeof prototype === 'object' && 'constructor' in prototype && typeof prototype.constructor === 'function'
      ? prototype.constructor.name
      : '';

    return `\`${path}\` is ${name === '' ? 'an instance of a class' : `an instance of ${name}`}`;
  }

  if (Object.getOwnPropertySymbols(value).length > 0) {
    return `\`${path}\` has a symbol key`;
  }

  const entries: [string, unknown][] = Object.entries(value);

  for (const [key, entry] of entries) {
    const why = visit(entry, member(path, key), inside);

    if (why !== undefined) {
      return why;
    }
  }

  return undefined;
}
