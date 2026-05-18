/**
 * Navigation types and interfaces for the stack navigator MVP.
 */

import type { JSX } from '@bedrock-core/ui';

// ─── Forward declarations (types reference each other) ────────────────────────

export interface NavigationHelpers<TRoutes extends Record<string, unknown>> {
  navigate<K extends keyof TRoutes & string>(
    ...args: TRoutes[K] extends undefined ? [name: K] : [name: K, params: TRoutes[K]]
  ): void;
  push<K extends keyof TRoutes & string>(
    ...args: TRoutes[K] extends undefined ? [name: K] : [name: K, params: TRoutes[K]]
  ): void;
  goBack(): void;
  canGoBack(): boolean;
  reset(state: { routes: ResetRouteEntry<TRoutes>[]; index: number }): void;
  setParams<K extends keyof TRoutes & string>(
    name: K,
    params: TRoutes[K] extends undefined ? never : Partial<TRoutes[K] & Record<string, unknown>>,
  ): void;
  getState(): NavigationState<TRoutes>;
}

// ─── Utility types ────────────────────────────────────────────────────────────

/** Discriminated union for NAVIGATE/PUSH payloads — enforces params based on route */
export type RouteEntry<TRoutes extends Record<string, unknown>> = {
  [K in keyof TRoutes & string]: TRoutes[K] extends undefined
    ? { name: K; params?: undefined }
    : { name: K; params: TRoutes[K] };
}[keyof TRoutes & string];

/** Discriminated union for RESET payloads — params always optional */
export type ResetRouteEntry<TRoutes extends Record<string, unknown>> = {
  [K in keyof TRoutes & string]: TRoutes[K] extends undefined
    ? { name: K; params?: undefined }
    : { name: K; params?: Partial<TRoutes[K] & Record<string, unknown>> };
}[keyof TRoutes & string];

/** Props injected into every screen component by the navigator */
export type ScreenComponentProps<
  TRoutes extends Record<string, unknown>,
  K extends keyof TRoutes & string,
> = {
  navigation: NavigationHelpers<TRoutes>;
  route: RouteObject<TRoutes[K]>;
};

/** A screen component typed to its route key */
export type ScreenComponent<
  TRoutes extends Record<string, unknown>,
  K extends keyof TRoutes & string,
> = (props: ScreenComponentProps<TRoutes, K>) => JSX.Element;

/** The screens map — each key must be present, typed per route */
export type ScreensMap<TRoutes extends Record<string, unknown>> = {
  [K in keyof TRoutes & string]:
    | ScreenComponent<TRoutes, K>
    | {
      screen: ScreenComponent<TRoutes, K>;
      initialParams?: TRoutes[K] extends undefined
        ? never
        : Partial<TRoutes[K] & Record<string, unknown>>;
    };
};

// ─── Core interfaces ──────────────────────────────────────────────────────────

/**
 * A single route entry in the navigation stack.
 * Loosely typed internally — type safety is enforced at action dispatch boundaries.
 */
export interface Route {
  /** Unique key for this route instance */
  key: string;
  /** Name of the route (screen name) */
  name: string;
  /** Route parameters */
  params?: unknown;
}

/**
 * Navigation state for a stack navigator.
 */
export interface NavigationState<TRoutes extends Record<string, unknown> = Record<string, unknown>> {
  /** Navigator type identifier */
  type: 'stack';
  /** Unique key for this navigator */
  key: string;
  /** Ordered list of all possible route names in the navigator */
  routeNames: (keyof TRoutes & string)[];
  /** Current route stack */
  routes: Route[];
  /** Index of the currently focused route in routes array */
  index: number;
  /** Whether the state needs rehydration (sanitization) */
  stale: boolean;
}

/**
 * Options for createStackNavigator.
 */
export interface StackNavigatorOptions<TRoutes extends Record<string, unknown>> {
  screens: ScreensMap<TRoutes>;
  initialRouteName?: keyof TRoutes & string;
}

/**
 * Route object passed to screen components via useRoute hook.
 */
export interface RouteObject<TParams = undefined> {
  key: string;
  name: string;
  params: TParams extends undefined ? undefined : TParams;
}

/**
 * Options for Screen component in navigator config.
 */
export interface ScreenOptions {
  title?: string;
  [key: string]: unknown;
}
