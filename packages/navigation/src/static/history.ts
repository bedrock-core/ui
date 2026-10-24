import type { NavigationState } from './common';

/** Flat reading stacks retain one instance of each page and the most recent Back destinations. */
export function recentHistory(state: NavigationState, maxDepth: number): NavigationState {
  let routes: NavigationState['routes'][number][] = [];

  for (const route of state.routes.slice(0, state.index + 1)) {
    const previous = routes.findIndex(entry => entry.name === route.name);

    if (previous >= 0) { routes = routes.slice(0, previous); }

    routes.push({ ...route, key: `${state.key}/${route.name}:0` });
  }

  routes = routes.slice(-(maxDepth + 1));

  return { ...state, routes, index: routes.length - 1 };
}
