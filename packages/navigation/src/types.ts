import type { JSX } from '@bedrock-core/ui-runtime';

/**
 * Rest-argument tuple for `navigate` / `push` calls.
 *
 * Driven by the **route-level** param type — four cases:
 * - `undefined`                   → params argument forbidden:  `[name]`
 * - `T | undefined`               → params argument optional:   `[name]` or `[name, params]`
 * - `T`                           → params argument required:   `[name, params]`
 * - `{ req: A; opt?: B }`         → params argument required, but individual properties
 *                                    inside the object can still be optional as normal
 *
 * Uses non-distributive `[T] extends [undefined]` so a union like `T | undefined`
 * falls through to the optional branch instead of splitting across both branches.
 * `Exclude<TParams, undefined>` strips only the route-level `undefined` from the union —
 * it never touches optional properties inside the params object.
 */
type NavigateArgs<K extends string, TParams> = [TParams] extends [undefined]
  ? [name: K]
  : [undefined] extends [TParams]
      ? [name: K] | [name: K, params: Exclude<TParams, undefined>]
      : [name: K, params: TParams];

/**
 * Navigation API injected into every screen and exposed via `useNavigation`.
 *
 * The generic `TRoutes` parameter constrains every call so route names and
 * their param shapes are validated at compile time.
 *
 * @example
 * ```ts
 * type AppRoutes = {
 *   Home:     undefined;
 *   Profile:  { userId: string };
 *   Settings: { tab?: string };
 * };
 *
 * function MyComponent({ navigation }: ScreenProps<AppRoutes, 'Home'>) {
 *   // undefined route — name only, params forbidden:
 *   navigation.navigate('Home');
 *
 *   // Required params — TypeScript errors if userId is missing:
 *   navigation.navigate('Profile', { userId: '42' });
 *
 *   // Optional params — both forms are valid:
 *   navigation.navigate('Feed');
 *   navigation.navigate('Feed', { sort: 'top' });
 *
 *   // Push always adds a new stack entry:
 *   navigation.push('Feed', { sort: 'latest' });
 *
 *   // Go back one screen:
 *   navigation.goBack();
 *
 *   // Guard against going back when there is nothing to go back to:
 *   if (navigation.canGoBack()) navigation.goBack();
 *
 *   // Replace the entire stack (e.g. after logout):
 *   navigation.reset({ routes: [{ name: 'Home' }], index: 0 });
 *
 *   // Merge new values into an already-mounted screen's params:
 *   navigation.setParams('Settings', { tab: 'account' });
 *
 *   // Read the current stack state:
 *   const state = navigation.getState();
 * }
 * ```
 */
export interface NavigationHelpers<TRoutes extends Record<string, unknown>> {
  /**
   * Navigate to a route by name.
   * If the route is already in the stack, navigates back to it instead of
   * pushing a new copy.
   *
   * Param rules mirror the route definition:
   * - `undefined` route  → only the name, no params argument
   * - `T` route          → name + required params object
   * - `T | undefined`    → name alone, or name + optional params object
   *
   * @example
   * ```ts
   * navigation.navigate('Home');                                        // undefined route
   * navigation.navigate('Profile', { userId: '42' });                  // required params
   * navigation.navigate('User', { userId: 1 });                        // mixed — req only
   * navigation.navigate('User', { userId: 1, username: 'Alice' });     // mixed — req + opt
   * navigation.navigate('Feed');                                        // optional — no params
   * navigation.navigate('Feed', { sort: 'latest' });                   // optional — with params
   * ```
   */
  navigate<K extends Extract<keyof TRoutes, string>>(
    ...args: NavigateArgs<K, TRoutes[K]>
  ): void;

  /**
   * Always push a new entry onto the stack, even if that route is already present.
   * Useful when you want multiple instances of the same screen (e.g. nested profiles).
   *
   * @example
   * ```ts
   * navigation.push('Profile', { userId: '99' });
   * ```
   */
  push<K extends Extract<keyof TRoutes, string>>(
    ...args: NavigateArgs<K, TRoutes[K]>
  ): void;

  /**
   * Pop the current screen and return to the previous one.
   * Has no effect when the stack only has one entry — check `canGoBack` first.
   *
   * @example
   * ```ts
   * navigation.goBack();
   * ```
   */
  goBack(): void;

  /**
   * Returns `true` when there is at least one screen behind the current one.
   *
   * @example
   * ```ts
   * if (navigation.canGoBack()) {
   *   navigation.goBack();
   * }
   * ```
   */
  canGoBack(): boolean;

  /**
   * Replace the entire navigation stack with a new one.
   * `index` must point to the focused route in the `routes` array.
   * Params inside `routes` are partial — omit any you want to keep at defaults.
   *
   * @example
   * ```ts
   * // After logout, reset to the Home screen:
   * navigation.reset({ routes: [{ name: 'Home' }], index: 0 });
   *
   * // Restore a two-screen stack with Profile focused:
   * navigation.reset({
   *   routes: [{ name: 'Home' }, { name: 'Profile', params: { userId: '42' } }],
   *   index: 1,
   * });
   * ```
   */
  reset(state: { routes: ResetRouteEntry<TRoutes>[]; index: number }): void;

  /**
   * Merge partial params into a screen that is already in the stack.
   * Only valid for routes that have a params type — TypeScript will error for
   * parameterless routes (`TRoutes[K] extends undefined`).
   *
   * @example
   * ```ts
   * // Switch the active tab on the Settings screen without re-mounting it:
   * navigation.setParams('Settings', { tab: 'privacy' });
   * ```
   */
  setParams<K extends Extract<keyof TRoutes, string>>(
    name: K,
    params: [TRoutes[K]] extends [undefined] ? never : Partial<Exclude<TRoutes[K], undefined> & Record<string, unknown>>,
  ): void;

  /**
   * Returns a snapshot of the current navigation state (stack, index, etc.).
   *
   * @example
   * ```ts
   * const { routes, index } = navigation.getState();
   * const currentRoute = routes[index];
   * ```
   */
  getState(): NavigationState<TRoutes>;
}

/**
 * Discriminated union of every valid `{ name, params }` pair for `TRoutes`.
 * Used internally for NAVIGATE and PUSH action payloads to guarantee that the
 * correct params type is paired with each route name.
 *
 * @example
 * ```ts
 * type AppRoutes = {
 *   Home:    undefined;
 *   Profile: { userId: string };
 *   User:    { userId: number; username?: string };
 *   Feed:    { sort: 'latest' | 'top' } | undefined;
 * };
 *
 * // Resolves to:
 * // | { name: 'Home';    params?: undefined }
 * // | { name: 'Profile'; params: { userId: string } }
 * // | { name: 'User';    params: { userId: number; username?: string } }
 * // | { name: 'Feed';    params?: { sort: 'latest' | 'top' } }
 * type Entry = RouteEntry<AppRoutes>;
 *
 * const a: Entry = { name: 'Home' };
 * const b: Entry = { name: 'Profile', params: { userId: '1' } };
 * const c: Entry = { name: 'Profile' };                              // TS error — missing params
 * const d: Entry = { name: 'User', params: { userId: 1 } };         // ok — username optional
 * const e: Entry = { name: 'User', params: { userId: 1, username: 'Alice' } }; // also ok
 * const f: Entry = { name: 'Feed' };                                // ok — params optional
 * const g: Entry = { name: 'Feed', params: { sort: 'top' } };      // also ok
 * ```
 */
export type RouteEntry<TRoutes extends Record<string, unknown>> = {
  [K in Extract<keyof TRoutes, string>]: [TRoutes[K]] extends [undefined]
    ? { name: K; params?: undefined }
    : [undefined] extends [TRoutes[K]]
        ? { name: K; params?: Exclude<TRoutes[K], undefined> }
        : { name: K; params: TRoutes[K] };
}[Extract<keyof TRoutes, string>];

/**
 * Like `RouteEntry` but params are always optional partial — used for RESET
 * payloads where you may want to omit params and fall back to screen defaults.
 *
 * @example
 * ```ts
 * type AppRoutes = { Home: undefined; Profile: { userId: string } };
 *
 * // Resolves to:
 * // | { name: 'Home'; params?: undefined }
 * // | { name: 'Profile'; params?: Partial<{ userId: string }> }
 * type Entry = ResetRouteEntry<AppRoutes>;
 *
 * const routes: Entry[] = [
 *   { name: 'Home' },
 *   { name: 'Profile' },          // params omitted — screen uses its initialParams
 *   { name: 'Profile', params: { userId: '5' } }, // or supply them explicitly
 * ];
 * ```
 */
export type ResetRouteEntry<TRoutes extends Record<string, unknown>> = {
  [K in Extract<keyof TRoutes, string>]: TRoutes[K] extends undefined
    ? { name: K; params?: undefined }
    : { name: K; params?: Partial<TRoutes[K] & Record<string, unknown>> };
}[Extract<keyof TRoutes, string>];

/**
 * Props injected into every screen component: `navigation` and `route`, both
 * typed to the specific route key `K` within `TRoutes`.
 *
 * **Recommended pattern** — create a single app-level alias so you only ever
 * pass one generic per screen:
 *
 * ```ts
 * // routes.ts — define once
 * export type AppRoutes = {
 *   Home:     undefined;
 *   Profile:  { userId: string };
 *   Settings: { tab?: string };
 * };
 * export type AppScreenProps<K extends keyof AppRoutes> = ScreenProps<AppRoutes, K>;
 * ```
 *
 * ```ts
 * // ProfileScreen.tsx — required params
 * import type { AppScreenProps } from './routes';
 *
 * function ProfileScreen({ route, navigation }: AppScreenProps<'Profile'>) {
 *   const { userId } = route.params;              // string — fully typed
 *   navigation.navigate('Feed');                  // optional route, no params
 *   navigation.navigate('Feed', { sort: 'top' }); // optional route, with params
 * }
 *
 * // FeedScreen.tsx — optional params (T | undefined)
 * function FeedScreen({ route, navigation }: AppScreenProps<'Feed'>) {
 *   const sort = route.params?.sort ?? 'latest';  // params may be undefined
 *   navigation.goBack();
 * }
 * ```
 *
 * You can also use `ScreenProps` directly without an alias:
 *
 * ```ts
 * function HomeScreen({ navigation }: ScreenProps<AppRoutes, 'Home'>) {
 *   navigation.navigate('Profile', { userId: '42' });
 * }
 * ```
 */
export type ScreenProps<
  TRoutes extends Record<string, unknown>,
  K extends keyof TRoutes,
> = {
  navigation: NavigationHelpers<TRoutes>;
  route: RouteObject<TRoutes[K]>;
};

/**
 * A screen component typed to a specific route key.
 * The component receives `navigation` and `route` props whose types are derived
 * from the `TRoutes` map and the route key `K`.
 *
 * @example
 * ```ts
 * type AppRoutes = { Profile: { userId: string } };
 *
 * const ProfileScreen: ScreenComponent<AppRoutes, 'Profile'> = ({ navigation, route }) => {
 *   return <Text onPress={() => navigation.goBack()}>{route.params.userId}</Text>;
 * };
 * ```
 */
export type ScreenComponent<
  TRoutes extends Record<string, unknown>,
  K extends Extract<keyof TRoutes, string>,
> = (props: ScreenProps<TRoutes, K>) => JSX.Element;

/**
 * The screens map passed to `createStackNavigator`.
 * Every key in `TRoutes` must be present. Each value is either a bare screen
 * component or an object with `screen` + optional `initialParams`.
 *
 * `initialParams` is only valid for routes that have a params type; it is
 * forbidden (`never`) for parameterless routes.
 *
 * @example
 * ```ts
 * type AppRoutes = {
 *   Home:     undefined;
 *   Profile:  { userId: string };
 *   Settings: { tab?: string };
 * };
 *
 * const screens: ScreensMap<AppRoutes> = {
 *   // Bare component — no initial params:
 *   Home: HomeScreen,
 *
 *   // Object form — also no initial params here:
 *   Profile: { screen: ProfileScreen },
 *
 *   // With initial params that apply when the screen has none:
 *   Settings: { screen: SettingsScreen, initialParams: { tab: 'general' } },
 * };
 * ```
 */
export type ScreensMap<TRoutes extends Record<string, unknown>> = {
  [K in Extract<keyof TRoutes, string>]:
    | ScreenComponent<TRoutes, K>
    | {
      screen: ScreenComponent<TRoutes, K>;
      initialParams?: [TRoutes[K]] extends [undefined]
        ? never
        : Partial<Exclude<TRoutes[K], undefined> & Record<string, unknown>>;
    };
};

/**
 * A single route entry in the navigation stack.
 * Loosely typed internally — type safety is enforced at action dispatch boundaries.
 *
 * @example
 * ```ts
 * const route: Route = {
 *   key: 'Profile-abc123',
 *   name: 'Profile',
 *   params: { userId: '42' },
 * };
 * ```
 */
export interface Route {
  /** Unique key for this route instance (generated on push). */
  key: string;
  /** Name of the route, matching a key in `TRoutes`. */
  name: string;
  /** Route parameters. Typed loosely here; narrowed at screen boundaries. */
  params?: unknown;
}

/**
 * Snapshot of a stack navigator's state.
 *
 * @example
 * ```ts
 * const state: NavigationState<AppRoutes> = {
 *   type: 'stack',
 *   key: 'stack-1',
 *   routeNames: ['Home', 'Profile', 'Settings'],
 *   routes: [
 *     { key: 'Home-abc', name: 'Home' },
 *     { key: 'Profile-xyz', name: 'Profile', params: { userId: '42' } },
 *   ],
 *   index: 1,   // Profile is currently focused
 *   stale: false,
 * };
 * ```
 */
export interface NavigationState<TRoutes extends Record<string, unknown> = Record<string, unknown>> {
  type: 'stack' | 'tab';
  /** Unique key for this navigator instance. */
  key: string;
  /** Ordered list of all possible route names registered in this navigator. */
  routeNames: Extract<keyof TRoutes, string>[];
  /** Current route stack — the last entry is the top of the stack. */
  routes: Route[];
  /** Zero-based index of the currently focused route in `routes`. */
  index: number;
  /** `true` when the state has not yet been sanitized/rehydrated. */
  stale: boolean;
}

/**
 * Options accepted by `createStackNavigator`.
 *
 * @example
 * ```ts
 * type AppRoutes = {
 *   Home:    undefined;
 *   Profile: { userId: string };
 * };
 *
 * const Navigator = createStackNavigator<AppRoutes>({
 *   initialRouteName: 'Home',   // shown first; defaults to the first key if omitted
 *   screens: {
 *     Home:    HomeScreen,
 *     Profile: { screen: ProfileScreen, initialParams: { userId: 'guest' } },
 *   },
 * });
 * ```
 */
export interface StackNavigatorOptions<TRoutes extends Record<string, unknown>> {
  /** The screens map — every route in `TRoutes` must be represented. */
  screens: ScreensMap<TRoutes>;
  /**
   * Name of the route to show when the navigator first mounts.
   * Defaults to the first key declared in `screens` if omitted.
   */
  initialRouteName?: Extract<keyof TRoutes, string>;
}

/**
 * Props passed to a tab navigator's `tabBar` render-prop. Mirrors React
 * Navigation: the bar reads `state.routes` / `state.index` to render a button
 * per tab and calls `navigation.navigate(name)` to switch the active tab.
 *
 * @example
 * ```tsx
 * tabBar: ({ state, navigation }) => (
 *   <Panel flexDirection="row" height={20}>
 *     {state.routes.map((route, i) => (
 *       <TabButton
 *         label={route.name}
 *         active={i === state.index}
 *         flexGrow={1}
 *         onPress={() => navigation.navigate(route.name)}
 *       />
 *     ))}
 *   </Panel>
 * )
 * ```
 */
export interface TabBarProps<TRoutes extends Record<string, unknown> = Record<string, unknown>> {
  /** Current tab navigator state (`type: 'tab'`); `routes` has one entry per tab. */
  state: NavigationState<TRoutes>;
  /** Navigation helpers — call `navigate(name)` to switch tabs. */
  navigation: NavigationHelpers<TRoutes>;
}

/**
 * Options accepted by `createTabNavigator`. Same factory shape as
 * `StackNavigatorOptions` (screens map + optional initial route), plus a
 * required `tabBar` render-prop — the tab navigator ships no default tab bar.
 *
 * @example
 * ```tsx
 * type TabRoutes = {
 *   Items:     undefined;
 *   Equipment: undefined;
 * };
 *
 * const { Navigator } = createTabNavigator<TabRoutes>({
 *   initialRouteName: 'Items',
 *   screens: { Items: ItemsTab, Equipment: EquipmentTab },
 *   tabBar: ({ state, navigation }) => (
 *     <Panel flexDirection="row" height={20}>
 *       {state.routes.map((route, i) => (
 *         <TabButton label={route.name} active={i === state.index}
 *           flexGrow={1} onPress={() => navigation.navigate(route.name)} />
 *       ))}
 *     </Panel>
 *   ),
 * });
 * ```
 */
export interface TabNavigatorOptions<TRoutes extends Record<string, unknown>> {
  screens: ScreensMap<TRoutes>;
  initialRouteName?: Extract<keyof TRoutes, string>;
  /** Renders the tab bar. Receives the live tab state + navigation helpers. */
  tabBar: (props: TabBarProps<TRoutes>) => JSX.Element;
}

/**
 * The route object passed to a screen component via `useRoute`.
 * `TParams` is `undefined` for parameterless routes, in which case `params`
 * is typed as `undefined` rather than an empty object.
 *
 * @example
 * ```ts
 * // In a parameterless screen:
 * const route = useRoute<RouteObject<undefined>>();
 * route.params; // undefined
 *
 * // In a screen with params:
 * const route = useRoute<RouteObject<{ userId: string }>>();
 * route.params.userId; // string
 * ```
 */
export interface RouteObject<TParams = undefined> {
  /** Unique key for this route instance. */
  key: string;
  /** Route name matching the key in the screens map. */
  name: string;
  /** Typed params — `undefined` for parameterless routes. */
  params: TParams extends undefined ? undefined : TParams;
}
