/* eslint-disable @typescript-eslint/no-unsafe-type-assertion --
    Type assertions are required at the navigation context boundary (same pattern as stack-navigator.ts). */

import { useState, JSX, Panel } from '@bedrock-core/ui-runtime';
import type {
  NavigationHelpers,
  NavigationState,
  TabNavigatorOptions,
} from '../types';
import { NavigationContext } from '../context';
import type { NavigationContextValue } from '../context';
import { resolveScreenComponent } from './resolve-screen';

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type -- inferred generic return
export function createTabNavigator<TRoutes extends Record<string, unknown>>(
  options: TabNavigatorOptions<TRoutes>,
) {
  const routeNames = Object.keys(options.screens) as Extract<keyof TRoutes, string>[];
  const { initialRouteName, tabBar } = options;

  function Navigator(): JSX.Element {
    const effectiveInitialTab = initialRouteName ?? routeNames[0];

    const [activeTab, setActiveTab] = useState<Extract<keyof TRoutes, string>>(effectiveInitialTab);

    const navState = buildTabState<TRoutes>(routeNames, activeTab);
    const helpers = buildTabHelpers<TRoutes>(routeNames, activeTab, setActiveTab);

    const ActiveScreen = resolveScreenComponent(options.screens, activeTab);

    const contextValue: NavigationContextValue<TRoutes> = {
      state: navState,
      dispatch: (): void => {},
      helpers,
      routeNames,
      initialRouteName: effectiveInitialTab,
    };

    const focusedRoute = navState.routes[navState.index];

    const routeObject = {
      key: focusedRoute.key,
      name: focusedRoute.name,
      params: focusedRoute.params as TRoutes[typeof activeTab] extends undefined ? undefined : TRoutes[typeof activeTab],
    };

    // Consumer-supplied tab bar — the navigator ships none of its own.
    const tabBarElement = tabBar({ state: navState, navigation: helpers });

    const contentPanel: JSX.Element = {
      type: Panel as unknown as (props: Record<string, unknown>) => JSX.Element,
      props: {
        width: '100%',
        flexGrow: 1,
        children: ActiveScreen
          ? [{
              type: ActiveScreen as unknown as (props: Record<string, unknown>) => JSX.Element,
              props: { navigation: helpers, route: routeObject },
            }]
          : [],
      },
    };

    const layout: JSX.Element = {
      type: Panel as unknown as (props: Record<string, unknown>) => JSX.Element,
      props: {
        width: '100%',
        height: '100%',
        flexDirection: 'column',
        children: [tabBarElement, contentPanel],
      },
    };

    return {
      type: 'context-provider',
      props: {
        __context: NavigationContext,
        value: contextValue,
        children: layout,
      },
    };
  }

  return {
    Navigator,
    routeNames,
    initialRouteName: initialRouteName ?? routeNames[0],
  };
}

/** Build the tab navigator's state: one route per tab, `index` = active tab. */
function buildTabState<TRoutes extends Record<string, unknown>>(
  routeNames: Extract<keyof TRoutes, string>[],
  activeTab: Extract<keyof TRoutes, string>,
): NavigationState<TRoutes> {
  return {
    type: 'tab',
    key: 'tab',
    routeNames,
    routes: routeNames.map(name => ({ key: `tab-${name}`, name })),
    index: Math.max(0, routeNames.indexOf(activeTab)),
    stale: false,
  };
}

function buildTabHelpers<TRoutes extends Record<string, unknown>>(
  routeNames: Extract<keyof TRoutes, string>[],
  activeTab: Extract<keyof TRoutes, string>,
  setActiveTab: (name: Extract<keyof TRoutes, string>) => void,
): NavigationHelpers<TRoutes> {
  const switchTo = (name: Extract<keyof TRoutes, string>): void => {
    if (routeNames.includes(name)) {
      setActiveTab(name);
    }
  };

  return {
    navigate(...args): void {
      const [name] = args as [Extract<keyof TRoutes, string>, unknown];

      switchTo(name);
    },
    push(...args): void {
      const [name] = args as [Extract<keyof TRoutes, string>, unknown];

      switchTo(name);
    },
    goBack(): void {
      // No-op for tab navigators — use the outer stack navigator's goBack if needed.
    },
    canGoBack(): boolean {
      return false;
    },
    reset(state): void {
      const targetRoute = state.routes[state.index];

      if (targetRoute) {
        switchTo(targetRoute.name);
      }
    },
    setParams(): void {
      // Tab screens don't use stack-style params; this is a no-op.
    },
    getState(): NavigationState<TRoutes> {
      return buildTabState<TRoutes>(routeNames, activeTab);
    },
  };
}
