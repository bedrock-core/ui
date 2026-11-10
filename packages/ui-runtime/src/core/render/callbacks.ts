import { getCurrentFiber } from '../fabric/registry';
import type { Fiber } from '../fabric/types';
type Callback = (...args: never[]) => unknown;
interface Cache {
  entries: Map<string, {
    kind: 'callback' | 'value';
    dependencies: readonly unknown[];
    value: unknown;
  }>;
  visited: Set<string>;
  repeated: Set<string>;
}
const caches = new WeakMap<Fiber, Cache>();
const compiledCallbacks = new WeakSet<object>();

/** Only callbacks published by an active compiler cache can participate in child output reuse. */
export function isCompilerCallback(callback: object): boolean {
  return compiledCallbacks.has(callback);
}

/** Begin a component evaluation without allocating a cache for components that do not use it. */
export function beginCallbacks(fiber: Fiber): void {
  if (!fiber.compilerCacheEnabled) {
    caches.delete(fiber);
  } else {
    caches.get(fiber)?.visited.clear();
  }
}

/** Release inactive sites; failed evaluations cannot publish reusable values or closures. */
export function finishCallbacks(fiber: Fiber, completed: boolean): void {
  const cache = caches.get(fiber);

  if (!cache) {
    return;
  }

  if (!completed) {
    caches.delete(fiber);

    return;
  }

  for (const site of cache.entries.keys()) {
    if (!cache.visited.has(site)) {
      cache.entries.delete(site);
    }
  }
}

export function clearCallbacks(fiber: Fiber): void {
  caches.delete(fiber);
}

/** A render site reached more than once falls back to ordinary evaluation. */
function visitSite(site: string): Cache | undefined {
  const [fiber] = getCurrentFiber();

  if (!fiber?.compilerCacheEnabled) {
    return undefined;
  }

  fiber.memoUnsafe = true;
  let cache = caches.get(fiber);

  if (!cache) {
    cache = { entries: new Map(), visited: new Set(), repeated: new Set() };
    caches.set(fiber, cache);
  }

  if (cache.repeated.has(site)) {
    return undefined;
  }

  if (cache.visited.has(site)) {
    cache.repeated.add(site);
    cache.entries.delete(site);

    return undefined;
  }

  cache.visited.add(site);

  return cache;
}

const sameInputs = (previous: readonly unknown[], current: readonly unknown[]): boolean => previous.length === current.length && current.every((value, index) => Object.is(value, previous[index]));

/** Compiler-owned callback site: dependencies are inferred from immutable lexical bindings. */
export function cacheCallback<T extends Callback>(site: string, dependencies: readonly unknown[], callback: T): T {
  const cache = visitSite(site);

  if (!cache) {
    return callback;
  }

  const previous = cache.entries.get(site);

  if (previous?.kind === 'callback' && sameInputs(previous.dependencies, dependencies)) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- Each compiler site has one callback signature across evaluations.
    return previous.value as T;
  }

  cache.entries.set(site, { kind: 'callback', dependencies: [...dependencies], value: callback });
  compiledCallbacks.add(callback);

  return callback;
}

/** Only scalar inputs make render-time expression reuse independent of mutable object internals. */
export function cacheValue<T>(site: string, dependencies: readonly unknown[], compute: () => T): T {
  const cache = visitSite(site);

  if (!cache || dependencies.some(value => value !== null && (typeof value === 'object' || typeof value === 'function'))) {
    cache?.entries.delete(site);

    return compute();
  }

  const previous = cache.entries.get(site);

  if (previous?.kind === 'value' && sameInputs(previous.dependencies, dependencies)) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- A compiler site has one expression result type across evaluations.
    return previous.value as T;
  }

  const value = compute();

  cache.entries.set(site, { kind: 'value', dependencies: [...dependencies], value });

  return value;
}
