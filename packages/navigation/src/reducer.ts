/**
 * Pure stack navigation state reducer.
 * Handles all navigation actions without side effects.
 */

import type { NavigationState, Route, RouteEntry, ResetRouteEntry } from './types';

/** SET_PARAMS payload — only valid for routes that have params */
type SetParamsEntry<TRoutes extends Record<string, unknown>> = {
  [K in keyof TRoutes & string]: TRoutes[K] extends undefined
    ? never
    : { name: K; params: Partial<TRoutes[K] & Record<string, unknown>> };
}[keyof TRoutes & string];

/**
 * Navigation actions, fully typed from the routes map.
 */
export type StackAction<TRoutes extends Record<string, unknown> = Record<string, unknown>>
  = | { type: 'NAVIGATE'; payload: RouteEntry<TRoutes> }
    | { type: 'PUSH'; payload: RouteEntry<TRoutes> }
    | { type: 'GO_BACK' }
    | { type: 'RESET'; payload: { routes: ResetRouteEntry<TRoutes>[]; index: number } }
    | { type: 'SET_PARAMS'; payload: SetParamsEntry<TRoutes> };

/**
 * Generate a unique key for a route.
 */
function generateRouteKey(name: string): string {
  const suffix = Math.random().toString(36).slice(2, 11);

  return `${name}-${suffix}`;
}

/**
 * Reduce the navigation state based on an action.
 * Pure function with no side effects.
 */
export function stackReducer<TRoutes extends Record<string, unknown>>(
  state: NavigationState<TRoutes> | undefined,
  action: StackAction<TRoutes>,
  {
    routeNames,
    initialRouteName,
  }: {
    routeNames: (keyof TRoutes & string)[];
    initialRouteName?: keyof TRoutes & string;
  },
): NavigationState<TRoutes> {
  // Initialize state if not provided
  if (!state || state.stale === true) {
    const initialRoute = initialRouteName ?? routeNames[0];
    const index = Math.max(0, routeNames.indexOf(initialRoute));

    const suffix = Math.random().toString(36).slice(2, 11);

    return {
      type: 'stack',
      key: `stack-${suffix}`,
      routeNames,
      routes: [
        {
          key: generateRouteKey(routeNames[index]),
          name: routeNames[index],
          params: undefined,
        },
      ],
      index: 0,
      stale: false,
    };
  }

  switch (action.type) {
    case 'NAVIGATE': {
      const { name, params } = action.payload;

      if (!routeNames.includes(name)) {
        return state;
      }

      const existingIndex = state.routes.findIndex(r => r.name === name);

      if (existingIndex !== -1) {
        const updatedRoute: Route = {
          ...state.routes[existingIndex],
          params: {
            ...(state.routes[existingIndex].params as Record<string, unknown>),
            ...(params as Record<string, unknown>),
          },
        };

        return {
          ...state,
          routes: [
            ...state.routes.slice(0, existingIndex),
            updatedRoute,
            ...state.routes.slice(existingIndex + 1),
          ],
          index: existingIndex,
        };
      }

      const newRoute: Route = {
        key: generateRouteKey(name),
        name,
        params: params,
      };

      return {
        ...state,
        routes: [...state.routes, newRoute],
        index: state.routes.length,
      };
    }

    case 'PUSH': {
      const { name, params } = action.payload;

      if (!routeNames.includes(name)) {
        return state;
      }

      const newRoute: Route = {
        key: generateRouteKey(name),
        name,
        params: params,
      };

      return {
        ...state,
        routes: [...state.routes, newRoute],
        index: state.routes.length,
      };
    }

    case 'GO_BACK': {
      if (state.index <= 0) {
        return state;
      }

      return {
        ...state,
        index: state.index - 1,
        routes: state.routes.slice(0, state.index),
      };
    }

    case 'RESET': {
      const { routes: newRoutes, index: newIndex } = action.payload;

      const builtRoutes = newRoutes
        .filter(r => routeNames.includes(r.name))
        .map(r => ({
          key: generateRouteKey(r.name),
          name: r.name,
          params: r.params,
        }));

      if (builtRoutes.length === 0) {
        return state;
      }

      const clampedIndex = Math.max(0, Math.min(newIndex, builtRoutes.length - 1));

      return {
        ...state,
        routes: builtRoutes,
        index: clampedIndex,
      };
    }

    case 'SET_PARAMS': {
      const { name, params: newParams } = action.payload;

      const targetIndex = state.routes.findIndex(r => r.name === name);

      if (targetIndex === -1) {
        return state;
      }

      const updatedRoute: Route = {
        ...state.routes[targetIndex],
        params: {
          ...(state.routes[targetIndex].params as Record<string, unknown>),
          ...(newParams as Record<string, unknown>),
        },
      };

      return {
        ...state,
        routes: [
          ...state.routes.slice(0, targetIndex),
          updatedRoute,
          ...state.routes.slice(targetIndex + 1),
        ],
      };
    }

    default:
      return state;
  }
}
