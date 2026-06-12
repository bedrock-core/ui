/* eslint-disable @typescript-eslint/no-unsafe-type-assertion --
    Type assertions are required at the navigation context boundary: Object.keys casts,
    unparameterized context recovery, discriminated-union action payloads, and JSX element
    construction. Type safety is enforced at the NavigationHelpers / NavigationContextValue
    interfaces rather than at each individual assertion site. */

import { useContext, useState, JSX } from '@bedrock-core/ui-runtime';
import type {
  NavigationHelpers,
  NavigationState,
  StackNavigatorOptions,
} from '../types';
import { NavigationContext } from '../context';
import type { NavigationContextValue } from '../context';
import { stackReducer, type StackAction, type ScreenDefaults } from '../reducer';
import { resolveScreenComponent } from './resolve-screen';

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type -- return type is a complex generic object; consumers use the inferred type via `typeof Stack`
export function createStackNavigator<TRoutes extends Record<string, unknown>>(
  options: StackNavigatorOptions<TRoutes>,
) {
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

  function Navigator({
    initialRouteName: propInitialRouteName,
  }: {
    initialRouteName?: Extract<keyof TRoutes, string>;
  }): JSX.Element {
    const effectiveInitialRoute
      = propInitialRouteName ?? initialRouteName ?? routeNames[0];

    const cfg = { ...reducerConfig, initialRouteName: effectiveInitialRoute };

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

    const activeRouteName = (focusedRoute?.name ?? effectiveInitialRoute) as Extract<keyof TRoutes, string>;

    const ActiveScreen = resolveScreenComponent(options.screens, activeRouteName);

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
          type: ActiveScreen as (props: Record<string, unknown>) => JSX.Element,
          props: { navigation: helpers, route: routeObject },
        },
      },
    };
  }

  return {
    Navigator,
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
      const [name, params] = args as [Extract<keyof TRoutes, string>, unknown];

      dispatch({ type: 'NAVIGATE', payload: { name, params } } as unknown as StackAction<TRoutes>);
    },
    push(...args): void {
      const [name, params] = args as [Extract<keyof TRoutes, string>, unknown];

      dispatch({ type: 'PUSH', payload: { name, params } } as unknown as StackAction<TRoutes>);
    },
    goBack(): void {
      dispatch({ type: 'GO_BACK' });
    },
    canGoBack(): boolean {
      return navState.index > 0;
    },
    reset(resetState): void {
      dispatch({ type: 'RESET', payload: resetState } as unknown as StackAction<TRoutes>);
    },
    setParams(name, params): void {
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

  return { ...defaults, ...(stored as Record<string, unknown>) };
}
