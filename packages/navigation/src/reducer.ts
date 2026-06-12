/**
 * Pure stack navigation state reducer.
 * Handles all navigation actions without side effects.
 */

import type { NavigationState, Route, RouteEntry, ResetRouteEntry } from './types';

/**
 * Per-screen default params applied when a route is first created and no params
 * are supplied by the action. Action params always win on top of these defaults.
 */
export type ScreenDefaults<TRoutes extends Record<string, unknown>> = {
  [K in Extract<keyof TRoutes, string>]?: Partial<
    Exclude<TRoutes[K], undefined> & Record<string, unknown>
  >;
};

/**
 * SET_PARAMS payload — only valid for routes that have params (not `undefined` routes).
 */
type SetParamsEntry<TRoutes extends Record<string, unknown>> = {
  [K in Extract<keyof TRoutes, string>]: [TRoutes[K]] extends [undefined]
    ? never
    : { name: K; params: Partial<Exclude<TRoutes[K], undefined> & Record<string, unknown>> };
}[Extract<keyof TRoutes, string>];

/**
 * Navigation actions, fully typed from the routes map.
 */
export type StackAction<TRoutes extends Record<string, unknown> = Record<string, unknown>>
  = | { type: 'NAVIGATE'; payload: RouteEntry<TRoutes> }
    | { type: 'PUSH'; payload: RouteEntry<TRoutes> }
    | { type: 'GO_BACK' }
    | { type: 'RESET'; payload: { routes: ResetRouteEntry<TRoutes>[]; index: number } }
    | { type: 'SET_PARAMS'; payload: SetParamsEntry<TRoutes> };

// ─── Helpers ──────────────────────────────────────────────────────────────────

function generateRouteKey(name: string): string {
  return `${name}-${Math.random().toString(36).slice(2, 11)}`;
}

/**
 * Merge action params on top of screen defaults. Both may be absent.
 * `incoming` is typed as unknown because Route.params is loosely typed internally;
 * type safety is enforced at the NavigationHelpers dispatch boundary.
 */
function mergeParams(
  defaults: Record<string, unknown> | undefined,
  incoming: unknown,
): unknown {
  if (defaults == null && incoming == null) {
    return undefined;
  }

  // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- params are always plain objects or undefined at runtime; Route.params is typed as unknown for internal flexibility
  return { ...defaults, ...(incoming as Record<string, unknown> | undefined) };
}

// ─── Reducer ──────────────────────────────────────────────────────────────────

/**
 * Reduce the navigation state based on an action.
 * Pure function with no side effects.
 */
export function stackReducer<TRoutes extends Record<string, unknown>>(
  state: NavigationState<TRoutes> | undefined,
  action: StackAction<TRoutes>,
  config: {
    routeNames: Extract<keyof TRoutes, string>[];
    initialRouteName?: Extract<keyof TRoutes, string>;
    screenDefaults?: ScreenDefaults<TRoutes>;
  },
): NavigationState<TRoutes> {
  const { routeNames, initialRouteName, screenDefaults } = config;

  // ── Initialization ──────────────────────────────────────────────────────────
  if (state == null || state.stale) {
    const firstName = initialRouteName ?? routeNames[0];

    if (firstName == null) {
      throw new Error('stackReducer: routeNames is empty — at least one screen is required.');
    }

    const defaults = screenDefaults?.[firstName] as Record<string, unknown> | undefined;

    return {
      type: 'stack',
      key: `stack-${Math.random().toString(36).slice(2, 11)}`,
      routeNames,
      routes: [{ key: generateRouteKey(firstName), name: firstName, params: defaults }],
      index: 0,
      stale: false,
    };
  }

  switch (action.type) {
    // ── NAVIGATE ──────────────────────────────────────────────────────────────
    // Navigate to a route. If it already exists in the stack, pop back to it
    // (discard everything after it). If it is new, push it onto the stack.
    case 'NAVIGATE': {
      const { name, params } = action.payload;

      if (!routeNames.includes(name)) {
        return state;
      }

      const defaults = screenDefaults?.[name] as Record<string, unknown> | undefined;
      const mergedParams = mergeParams(defaults, params);

      const existingIndex = state.routes.findIndex(r => r.name === name);

      if (existingIndex !== -1) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- Route.params is typed as unknown internally; safe to spread as Record at runtime
        const existingParams = state.routes[existingIndex].params as Record<string, unknown> | undefined;
        const updatedRoute: Route = {
          ...state.routes[existingIndex],
          params: mergeParams(existingParams, mergedParams),
        };

        return {
          ...state,
          // Slice to existingIndex + 1 to discard all forward history (pop-to behavior).
          routes: [...state.routes.slice(0, existingIndex), updatedRoute],
          index: existingIndex,
        };
      }

      return {
        ...state,
        routes: [...state.routes, { key: generateRouteKey(name), name, params: mergedParams }],
        index: state.routes.length,
      };
    }

    // ── PUSH ─────────────────────────────────────────────────────────────────
    // Always push a new entry, even if the route is already in the stack.
    case 'PUSH': {
      const { name, params } = action.payload;

      if (!routeNames.includes(name)) {
        return state;
      }

      const defaults = screenDefaults?.[name] as Record<string, unknown> | undefined;

      return {
        ...state,
        routes: [
          ...state.routes,
          { key: generateRouteKey(name), name, params: mergeParams(defaults, params) },
        ],
        index: state.routes.length,
      };
    }

    // ── GO_BACK ───────────────────────────────────────────────────────────────
    case 'GO_BACK': {
      if (state.index <= 0) {
        return state;
      }

      return {
        ...state,
        routes: state.routes.slice(0, state.index),
        index: state.index - 1,
      };
    }

    // ── RESET ─────────────────────────────────────────────────────────────────
    case 'RESET': {
      const { routes: incoming, index: requestedIndex } = action.payload;

      const built = incoming
        .filter(r => routeNames.includes(r.name))
        .map((r) => {
          const defaults = screenDefaults?.[r.name] as Record<string, unknown> | undefined;

          return {
            key: generateRouteKey(r.name),
            name: r.name,
            params: mergeParams(defaults, r.params),
          };
        });

      if (built.length === 0) {
        return state;
      }

      return {
        ...state,
        routes: built,
        index: Math.max(0, Math.min(requestedIndex, built.length - 1)),
      };
    }

    // ── SET_PARAMS ────────────────────────────────────────────────────────────
    case 'SET_PARAMS': {
      const { name, params: incoming } = action.payload;

      const targetIndex = state.routes.findIndex(r => r.name === name);

      if (targetIndex === -1) {
        return state;
      }

      // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- Route.params is typed as unknown internally; safe to spread as Record at runtime
      const existing = state.routes[targetIndex].params as Record<string, unknown> | undefined;
      const updatedRoute: Route = {
        ...state.routes[targetIndex],

        params: { ...existing, ...(incoming as Record<string, unknown>) },
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
