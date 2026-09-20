import type { Vector3 } from '@minecraft/server';
import { getFibersForOwner, type Owner } from '../../../core/fabric';
import type { Fiber } from '../../../core/fabric/types';
import { setStateSeed, type StateSeed } from '../../../core/render/session';
import { ContainerScreenError } from '../../../core/types';
import { STATE_PROPERTY } from '../contract';

/**
 * Where a screen's state lives between opens: on its entity, as one dynamic
 * property.
 *
 * A container screen belongs to its entity rather than to a player — a
 * furnace keeps its fuel whoever walks away — so the values its hooks hold are
 * written to the entity after every render and handed back to the fibers at
 * the next open. The fiber path is the key, because it is the one name a
 * component instance has that survives a world reload: it is built from the
 * tree's shape, and a compiled screen's shape is frozen.
 */

/** Characters a dynamic property string can hold. */
export const PROPERTY_LIMIT = 32767;

/** The face of an entity the store needs. */
export interface StateHost {
  getDynamicProperty(identifier: string): boolean | number | string | Vector3 | undefined;
  setDynamicProperty(identifier: string, value?: boolean | number | string | Vector3): void;
}

/** Hook values by fiber path: `[slot index, value]` pairs, state and reducer slots only. */
type Snapshot = Record<string, [number, unknown][]>;

const isPlainObject = (value: object): boolean => {
  const prototype: unknown = Object.getPrototypeOf(value);

  return prototype === null || prototype === Object.prototype;
};

const kindOf = (value: object): string => {
  const prototype: unknown = Object.getPrototypeOf(value);
  const constructor = typeof prototype === 'object' && prototype !== null && 'constructor' in prototype
    ? prototype.constructor
    : undefined;

  return typeof constructor === 'function' && constructor.name !== '' ? `a ${constructor.name}` : 'a class instance';
};

const unstorable = (path: string, slot: number, what: string): ContainerScreenError =>
  new ContainerScreenError(
    `Container screen state at ${path} (hook #${slot}) holds ${what}, which cannot be persisted.\n`
    + '  State is written to the entity as JSON after every render, so it has to be plain:\n'
    + '  strings, finite numbers, booleans, arrays and plain objects. Keep anything else in a ref.',
  );

/**
 * Refuses a value JSON cannot carry back intact: a function, a symbol, a
 * bigint, a non-finite number, a class instance, a cycle. `undefined` has no
 * JSON form either, and is handled the way JSON handles it — dropped from an
 * object, `null` in an array.
 */
const check = (value: unknown, path: string, slot: number, seen: Set<object>): void => {
  if (typeof value === 'string' || typeof value === 'boolean' || value === undefined || value === null) {
    return;
  }

  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      throw unstorable(path, slot, `${value}`);
    }

    return;
  }

  if (typeof value !== 'object') {
    throw unstorable(path, slot, `a ${typeof value}`);
  }

  if (seen.has(value)) {
    throw unstorable(path, slot, 'a cycle');
  }

  seen.add(value);

  if (Array.isArray(value)) {
    const items: unknown[] = value;

    for (const item of items) {
      check(item, path, slot, seen);
    }
  } else if (isPlainObject(value)) {
    const items: unknown[] = Object.values(value);

    for (const item of items) {
      check(item, path, slot, seen);
    }
  } else {
    throw unstorable(path, slot, kindOf(value));
  }

  seen.delete(value);
};

/** The fiber's path within its tree: its id without the owner it was keyed by. */
const pathOf = (fiber: Fiber, ownerId: string): string => {
  const prefix = `${ownerId}:`;

  return fiber.id.startsWith(prefix) ? fiber.id.slice(prefix.length) : fiber.id;
};

/**
 * Every state and reducer value in the tree, as JSON keyed by fiber path.
 *
 * A slot holding `undefined` is left out: it has no JSON form, and mounting
 * from the initial value is what a missing entry means. Refs, effects and
 * contexts are not persisted — a ref is exactly the place for what must not
 * be.
 *
 * @throws ContainerScreenError naming the fiber and hook that hold a value JSON cannot carry.
 */
export const serializeState = (fibers: readonly Fiber[], ownerId: string): string => {
  const snapshot: Snapshot = {};

  for (const fiber of fibers) {
    const path = pathOf(fiber, ownerId);
    const values: [number, unknown][] = [];

    fiber.hookStates.forEach((hook, index) => {
      if ((hook.tag !== 'state' && hook.tag !== 'reducer') || hook.value === undefined) {
        return;
      }

      check(hook.value, path, index, new Set());
      values.push([index, hook.value]);
    });

    if (values.length > 0) {
      snapshot[path] = values;
    }
  }

  return JSON.stringify(snapshot);
};

const malformed = (why: string): ContainerScreenError =>
  new ContainerScreenError(`Container screen state on the entity is unreadable: ${why}.`);

/**
 * The seed a persisted snapshot hands to the next build: values by fiber id,
 * then by slot index, with the owner's key put back in front of each path.
 *
 * @throws ContainerScreenError when the text is not a snapshot.
 */
export const deserializeState = (json: string, ownerId: string): StateSeed => {
  let parsed: unknown;

  try {
    parsed = JSON.parse(json);
  } catch (error: unknown) {
    throw malformed(`not JSON (${String(error)})`);
  }

  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw malformed('not an object of fiber paths');
  }

  const seed = new Map<string, ReadonlyMap<number, unknown>>();
  const entries: [string, unknown][] = Object.entries(parsed);

  for (const [path, pairs] of entries) {
    if (!Array.isArray(pairs)) {
      throw malformed(`${path} does not hold a list of hook values`);
    }

    const values = new Map<number, unknown>();
    const list: unknown[] = pairs;

    for (const pair of list) {
      if (!Array.isArray(pair) || pair.length !== 2 || typeof pair[0] !== 'number') {
        throw malformed(`${path} holds a hook value without a slot index`);
      }

      values.set(pair[0], pair[1]);
    }

    seed.set(`${ownerId}:${path}`, values);
  }

  return seed;
};

/**
 * Hands the entity's persisted state to the fibers the next build creates.
 * Must run before that build: a fiber reads its seed as it is created.
 *
 * An unreadable snapshot is reported and dropped, so the screen opens from its
 * initial state rather than not at all.
 *
 * @returns the text found on the entity, so an unchanged state is not written
 *   straight back. Undefined when there was none worth keeping.
 */
export const hydrateState = (host: StateHost, owner: Owner): string | undefined => {
  const stored = host.getDynamicProperty(STATE_PROPERTY);

  if (typeof stored !== 'string') {
    return undefined;
  }

  try {
    setStateSeed(owner, deserializeState(stored, owner.id));

    return stored;
  } catch (error: unknown) {
    console.warn(`[core.ui] ${error instanceof Error ? error.message : String(error)} Starting from initial state.`);

    return undefined;
  }
};

/**
 * Writes the tree's state to the entity, unless it is what the entity already
 * holds.
 *
 * @param last - the text last written or read, from the previous call.
 * @returns the text now on the entity, for the next call.
 * @throws ContainerScreenError for a value JSON cannot carry, a snapshot too
 *   long for a dynamic property, or an entity that refuses the write.
 */
export const persistState = (host: StateHost, owner: Owner, last: string | undefined): string => {
  const json = serializeState(getFibersForOwner(owner), owner.id);

  if (json === last) {
    return json;
  }

  if (json.length > PROPERTY_LIMIT) {
    throw new ContainerScreenError(
      `Container screen state is ${json.length} characters and a dynamic property holds ${PROPERTY_LIMIT}.\n`
      + '  Keep less in state: large or derived data belongs in a ref, or outside the screen.',
    );
  }

  try {
    host.setDynamicProperty(STATE_PROPERTY, json);
  } catch (error: unknown) {
    throw new ContainerScreenError(`Container screen state could not be written to the entity: ${String(error)}`);
  }

  return json;
};
