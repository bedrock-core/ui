/**
 * Navigation context and provider for managing navigation state per player session.
 */

import { createContext, useContext, useState, JSX } from '@bedrock-core/ui';
import type {
  NavigationHelpers,
  NavigationState,
  ScreenComponent,
  ScreensMap,
  StackNavigatorOptions,
} from './types';
import { stackReducer, type StackAction } from './reducer';

/**
 * Navigation context type.
 */
export interface NavigationContextValue<TRoutes extends Record<string, unknown> = Record<string, unknown>> {
  state: NavigationState<TRoutes>;
  dispatch: (action: StackAction<TRoutes>) => void;
  helpers: NavigationHelpers<TRoutes>;
  routeNames: (keyof TRoutes & string)[];
  initialRouteName?: keyof TRoutes & string;
}

/**
 * Create navigation context.
 * Unparameterized at module level — type is recovered via casts in hooks and createStackNavigator.
 */
export const NavigationContext = createContext<NavigationContextValue | undefined>(undefined);

/**
 * NavigationContainer component that provides navigation state to child navigators.
 * Wraps your app root and wires up state management via useState + stackReducer.
 */
export function NavigationContainer({
  children,
  initialState,
}: {
  children: JSX.Node;
  initialState?: NavigationState;
}): JSX.Element {
  return {
    type: 'context-provider',
    props: {
      __context: NavigationContext,
      value: {
        state: initialState ?? {
          type: 'stack',
          key: 'stack-0',
          routeNames: [],
          routes: [],
          index: 0,
          stale: true,
        },
        dispatch: (): void => {},
        helpers: {},
        routeNames: [],
      },
      children,
    },
  };
}

/**
 * Create stack navigator factory.
 * Returns Navigator and Screen components for declaring a typed screen set.
 */
export function createStackNavigator<TRoutes extends Record<string, unknown>>(
  options: StackNavigatorOptions<TRoutes>,
) {
  const routeNames = Object.keys(options.screens) as (keyof TRoutes & string)[];
  const { initialRouteName } = options;

  /**
   * Resolves the screen component for a given route name from the screens map.
   */
  function resolveScreenComponent(name: keyof TRoutes & string): ScreenComponent<TRoutes, typeof name> | undefined {
    const entry = (options.screens)[name];

    if (!entry) { return undefined; }

    if (typeof entry === 'function') {
      return entry;
    }

    return (entry as { screen: ScreenComponent<TRoutes, typeof name> }).screen;
  }

  /**
   * Navigator component — a proper function component that reads navigation state
   * from context and renders the currently active screen.
   * No custom element types; fully transparent to the runtime serializer.
   */
  function Navigator({ initialRouteName: propInitialRouteName }: { initialRouteName?: keyof TRoutes & string }): JSX.Element {
    const finalInitialRouteName = propInitialRouteName ?? initialRouteName ?? routeNames[0];

    // Read existing context value (set by NavigationContainer above)
    const existingCtx = useContext(NavigationContext) as NavigationContextValue<TRoutes> | undefined;

    // Bootstrap state on first render (stale or missing)
    const [navState, setNavState] = useState<NavigationState<TRoutes>>(() => {
      if (existingCtx && !existingCtx.state.stale) {
        return existingCtx.state;
      }

      return stackReducer<TRoutes>(
        undefined,
        { type: 'GO_BACK' }, // dummy action to trigger initialization
        { routeNames, initialRouteName: finalInitialRouteName },
      );
    });

    // Build dispatch + helpers once, referencing setNavState
    const dispatch = (action: StackAction<TRoutes>): void => {
      setNavState(prev =>
        stackReducer<TRoutes>(prev, action, { routeNames, initialRouteName: finalInitialRouteName }),
      );
    };

    const helpers: NavigationHelpers<TRoutes> = {
      navigate(...args) {
        const [name, params] = args as [keyof TRoutes & string, unknown];

        dispatch({ type: 'NAVIGATE', payload: { name, params } } as unknown as StackAction<TRoutes>);
      },
      push(...args) {
        const [name, params] = args as [keyof TRoutes & string, unknown];

        dispatch({ type: 'PUSH', payload: { name, params } } as unknown as StackAction<TRoutes>);
      },
      goBack() {
        dispatch({ type: 'GO_BACK' });
      },
      canGoBack() {
        return navState.index > 0;
      },
      reset(resetState) {
        dispatch({ type: 'RESET', payload: resetState } as unknown as StackAction<TRoutes>);
      },
      setParams(name, params) {
        dispatch({ type: 'SET_PARAMS', payload: { name, params } } as unknown as StackAction<TRoutes>);
      },
      getState() {
        return navState;
      },
    };

    // Determine active screen
    const focusedRoute = navState.routes[navState.index];
    const activeRouteName = focusedRoute?.name ?? finalInitialRouteName;
    const ScreenComponent = resolveScreenComponent(activeRouteName);

    if (!ScreenComponent) {
      return { type: 'fragment', props: { children: [] } };
    }

    const routeObject = {
      key: focusedRoute?.key ?? activeRouteName,
      name: activeRouteName,
      params: (focusedRoute?.params ?? undefined) as TRoutes[typeof activeRouteName] extends undefined
        ? undefined
        : TRoutes[typeof activeRouteName],
    };

    // Provide updated context with live state + helpers to the screen tree
    const contextValue: NavigationContextValue<TRoutes> = {
      state: navState,
      dispatch,
      helpers,
      routeNames,
      initialRouteName: finalInitialRouteName,
    };

    return {
      type: 'context-provider',
      props: {
        __context: NavigationContext,
        value: contextValue,
        children: {
          type: ScreenComponent as (props: Record<string, unknown>) => JSX.Element,
          props: {
            navigation: helpers,
            route: routeObject,
          },
        },
      },
    };
  }

  /**
   * Screen component for declaring a route in navigator config (JSX declarative form).
   * This is a convenience for IDE discoverability — the runtime reads `options.screens` directly.
   */
  function Screen<K extends keyof TRoutes & string>({
    name: _name,
    component: _component,
    initialParams: _initialParams,
  }: {
    name: K;
    component: ScreenComponent<TRoutes, K>;
    initialParams?: TRoutes[K] extends undefined ? never : Partial<TRoutes[K] & Record<string, unknown>>;
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
