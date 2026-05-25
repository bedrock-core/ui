import { createContext, useContext, useState, JSX } from '@bedrock-core/ui-runtime';
import type {
  NavigationHelpers,
  NavigationState,
  ScreenComponent,
  StackNavigatorOptions,
} from './types';
import { stackReducer, type StackAction, type ScreenDefaults } from './reducer';

export interface NavigationContextValue<
  TRoutes extends Record<string, unknown> = Record<string, unknown>,
> {
  state: NavigationState<TRoutes>;
  dispatch: (action: StackAction<TRoutes>) => void;
  helpers: NavigationHelpers<TRoutes>;
  routeNames: Extract<keyof TRoutes, string>[];
  initialRouteName?: Extract<keyof TRoutes, string>;
}

/**
 * Module-level context — unparameterized so it can be created once at module load.
 * Types are recovered via casts inside hooks and createStackNavigator.
 */
export const NavigationContext = createContext<NavigationContextValue | undefined>(undefined);

/**
 * Provides a navigation context boundary. Wrap your app root with this.
 * The actual state is owned by the Navigator inside; this just establishes
 * the context slot with a stale placeholder so hooks can detect missing providers.
 */
export function NavigationContainer({
  children,
  initialState,
}: {
  children: JSX.Node;
  initialState?: NavigationState;
}): JSX.Element {
  const placeholder: NavigationContextValue = {
    state: initialState ?? {
      type: 'stack',
      key: 'stack-placeholder',
      routeNames: [],
      routes: [],
      index: 0,
      stale: true,
    },
    dispatch: (): void => {},
    helpers: buildNoopHelpers(),
    routeNames: [],
    initialRouteName: undefined,
  };

  return {
    type: 'context-provider',
    props: { __context: NavigationContext, value: placeholder, children },
  };
}

/** No-op helpers for the placeholder context before Navigator mounts. */
function buildNoopHelpers(): NavigationHelpers<Record<string, unknown>> {
  return {
    navigate: (): void => {},
    push: (): void => {},
    goBack: (): void => {},
    canGoBack: (): boolean => false,
    reset: (): void => {},
    setParams: (): void => {},
    getState: (): NavigationState<Record<string, unknown>> => ({
      type: 'stack', key: '', routeNames: [], routes: [], index: 0, stale: true,
    }),
  };
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type -- return type is a complex generic object; consumers use the inferred type via `typeof Stack`
export function createStackNavigator<TRoutes extends Record<string, unknown>>(
  options: StackNavigatorOptions<TRoutes>,
) {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- Object.keys always returns string[]; TRoutes keys are guaranteed strings by Record<string, unknown>
  const routeNames = Object.keys(options.screens) as Extract<keyof TRoutes, string>[];
  const { initialRouteName } = options;

  // Extract initialParams from each screen entry into a screenDefaults map.
  const screenDefaults: ScreenDefaults<TRoutes> = {};

  for (const key of routeNames) {
    const entry = options.screens[key];

    //
    if (entry != null && typeof entry === 'object' && 'initialParams' in entry) {
      (screenDefaults as Record<string, unknown>)[key] = (entry as { initialParams?: unknown }).initialParams;
    }
  }

  const reducerConfig = { routeNames, initialRouteName, screenDefaults };

  function resolveScreenComponent(
    name: Extract<keyof TRoutes, string>,
  ): ScreenComponent<TRoutes, typeof name> | undefined {
    const entry = options.screens[name];

    if (entry == null) {
      return undefined;
    }

    if (typeof entry === 'function') {
      return entry;
    }

    return (entry as { screen: ScreenComponent<TRoutes, typeof name> }).screen;
  }

  function Navigator({
    initialRouteName: propInitialRouteName,
  }: {
    initialRouteName?: Extract<keyof TRoutes, string>;
  }): JSX.Element {
    const effectiveInitialRoute
      = propInitialRouteName ?? initialRouteName ?? routeNames[0];

    const cfg = { ...reducerConfig, initialRouteName: effectiveInitialRoute };

    // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- context is module-level unparameterized; createStackNavigator guarantees it was populated with TRoutes
    const existingCtx = useContext(NavigationContext) as NavigationContextValue<TRoutes> | undefined;

    const [navState, setNavState] = useState<NavigationState<TRoutes>>(() =>
      existingCtx != null && !existingCtx.state.stale
        ? existingCtx.state
        : stackReducer<TRoutes>(undefined, { type: 'GO_BACK' }, cfg),
    );

    const dispatch = (action: StackAction<TRoutes>): void => {
      setNavState(prev => stackReducer<TRoutes>(prev, action, cfg));
    };

    const helpers = buildHelpers<TRoutes>(navState, dispatch);

    // ── Resolve active screen ─────────────────────────────────────────────────

    const focusedRoute = navState.routes[navState.index];

    // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- route name is always a registered screen key; narrowed from string to Extract at the runtime boundary
    const activeRouteName = (focusedRoute?.name ?? effectiveInitialRoute) as Extract<keyof TRoutes, string>;

    const ActiveScreen = resolveScreenComponent(activeRouteName);

    if (ActiveScreen == null) {
      return { type: 'fragment', props: { children: [] } };
    }

    const routeObject = {
      key: focusedRoute?.key ?? activeRouteName,
      name: activeRouteName,
      // Stored params win over defaults; screen always sees at least its initialParams.
      params: mergeRouteParams(
        screenDefaults[activeRouteName],
        focusedRoute?.params,
      ),
    };

    const contextValue: NavigationContextValue<TRoutes> = {
      state: navState,
      dispatch,
      helpers,
      routeNames,
      initialRouteName: effectiveInitialRoute,
    };

    return {
      type: 'context-provider',
      props: {
        __context: NavigationContext,
        value: contextValue,
        children: {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- JSX element object construction requires an unparameterized function type; screen receives correctly typed props via ScreenProps
          type: ActiveScreen as (props: Record<string, unknown>) => JSX.Element,
          props: { navigation: helpers, route: routeObject },
        },
      },
    };
  }

  function Screen<K extends Extract<keyof TRoutes, string>>(_props: {
    name: K;
    component: ScreenComponent<TRoutes, K>;
    initialParams?: Partial<Exclude<TRoutes[K], undefined> & Record<string, unknown>>;
  }): JSX.Element {
    return { type: 'fragment', props: { children: [] } };
  }

  return {
    Navigator,
    Screen,
    routeNames,
    initialRouteName: initialRouteName ?? routeNames[0],
  };
}

function buildHelpers<TRoutes extends Record<string, unknown>>(
  navState: NavigationState<TRoutes>,
  dispatch: (action: StackAction<TRoutes>) => void,
): NavigationHelpers<TRoutes> {
  return {
    navigate(...args): void {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- rest args are validated by NavigateArgs<K, TRoutes[K]> at the call site; destructured here for dispatch
      const [name, params] = args as [Extract<keyof TRoutes, string>, unknown];

      // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- RouteEntry discriminated union cannot be constructed without assertion; type safety enforced at NavigationHelpers interface
      dispatch({ type: 'NAVIGATE', payload: { name, params } } as unknown as StackAction<TRoutes>);
    },
    push(...args): void {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- same as navigate above
      const [name, params] = args as [Extract<keyof TRoutes, string>, unknown];

      // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- same as navigate above
      dispatch({ type: 'PUSH', payload: { name, params } } as unknown as StackAction<TRoutes>);
    },
    goBack(): void {
      dispatch({ type: 'GO_BACK' });
    },
    canGoBack(): boolean {
      return navState.index > 0;
    },
    reset(resetState): void {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- ResetRouteEntry union cannot be verified at this level; enforced at NavigationHelpers interface
      dispatch({ type: 'RESET', payload: resetState } as unknown as StackAction<TRoutes>);
    },
    setParams(name, params): void {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- SetParamsEntry union cannot be verified at this level; enforced at NavigationHelpers interface
      dispatch({ type: 'SET_PARAMS', payload: { name, params } } as unknown as StackAction<TRoutes>);
    },
    getState(): NavigationState<TRoutes> {
      return navState;
    },
  };
}

function mergeRouteParams(
  defaults: Record<string, unknown> | undefined,
  stored: unknown,
): unknown {
  if (defaults == null) {
    return stored;
  }

  if (stored == null) {
    return defaults;
  }

  // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- Route.params is unknown internally; always a plain object at runtime
  return { ...defaults, ...(stored as Record<string, unknown>) };
}
