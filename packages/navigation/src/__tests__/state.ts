/** Portable state used by host and cross-realm boundary tests. */
export function stateFor(key: string, ...names: string[]) {
  return { key, type: 'stack' as const, stale: false as const, index: names.length - 1,
    routeNames: [...new Set(names)], routes: names.map((name, index) => ({ key: `${key}/${name}:${index}`, name })) };
}
