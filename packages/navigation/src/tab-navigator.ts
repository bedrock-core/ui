/* eslint-disable @typescript-eslint/no-unsafe-type-assertion --
    Type assertions are required at the navigation context boundary (same pattern as context.ts). */

import { useState, useScreenType, JSX, Panel, TabButton } from '@bedrock-core/ui-runtime';
import type {
  NavigationHelpers,
  NavigationState,
  ScreenComponent,
  TabNavigatorOptions,
} from './types';
import { NavigationContext } from './context';
import type { NavigationContextValue } from './context';

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type -- inferred generic return
export function createTabNavigator<TRoutes extends Record<string, unknown>>(
  options: TabNavigatorOptions<TRoutes>,
) {
  const routeNames = Object.keys(options.screens) as Extract<keyof TRoutes, string>[];
  const { initialRouteName } = options;

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

  function Navigator(): JSX.Element {
    // A tab navigator drives the inventory RP layout (tab bar + item grid),
    // so it self-declares its screen type regardless of the render baseline.
    useScreenType('inventory');

    const effectiveInitialTab = initialRouteName ?? routeNames[0];

    const [activeTab, setActiveTab] = useState<Extract<keyof TRoutes, string>>(effectiveInitialTab);

    const helpers = buildTabHelpers<TRoutes>(activeTab, setActiveTab, routeNames);

    const ActiveScreen = resolveScreenComponent(activeTab);

    const navState: NavigationState<TRoutes> = {
      type: 'stack',
      key: `tab-${activeTab as string}`,
      routeNames,
      routes: [{ key: activeTab, name: activeTab }],
      index: 0,
      stale: false,
    };

    const contextValue: NavigationContextValue<TRoutes> = {
      state: navState,
      dispatch: (): void => {},
      helpers,
      routeNames,
      initialRouteName: effectiveInitialTab,
    };

    const routeObject = {
      key: activeTab as string,
      name: activeTab as string,
      params: undefined as TRoutes[typeof activeTab] extends undefined ? undefined : TRoutes[typeof activeTab],
    };

    // Tab bar: one TabButton per route, equal width, 20px tall
    const tabBarChildren: JSX.Element[] = routeNames.map(name => ({
      type: TabButton as unknown as (props: Record<string, unknown>) => JSX.Element,
      props: {
        label: name,
        active: name === activeTab,
        flexGrow: 1,
        height: 20,
        onPress: (): void => { setActiveTab(name); },
      },
    }));

    const tabBarPanel: JSX.Element = {
      type: Panel as unknown as (props: Record<string, unknown>) => JSX.Element,
      props: {
        width: '100%',
        height: 20,
        flexDirection: 'row',
        children: tabBarChildren,
      },
    };

    const contentChildren: JSX.Element[] = ActiveScreen
      ? [{
          type: ActiveScreen as unknown as (props: Record<string, unknown>) => JSX.Element,
          props: { navigation: helpers, route: routeObject },
        }]
      : [];

    const contentPanel: JSX.Element = {
      type: Panel as unknown as (props: Record<string, unknown>) => JSX.Element,
      props: {
        width: '100%',
        flexGrow: 1,
        children: contentChildren,
      },
    };

    const innerPanel: JSX.Element = {
      type: Panel as unknown as (props: Record<string, unknown>) => JSX.Element,
      props: {
        width: '100%',
        height: '100%',
        flexDirection: 'column',
        children: [tabBarPanel, contentPanel],
      },
    };

    return {
      type: 'context-provider',
      props: {
        __context: NavigationContext,
        value: contextValue,
        children: innerPanel,
      },
    };
  }

  return {
    Navigator,
    routeNames,
    initialRouteName: initialRouteName ?? routeNames[0],
  };
}

function buildTabHelpers<TRoutes extends Record<string, unknown>>(
  activeTab: Extract<keyof TRoutes, string>,
  setActiveTab: (name: Extract<keyof TRoutes, string>) => void,
  routeNames: Extract<keyof TRoutes, string>[],
): NavigationHelpers<TRoutes> {
  return {
    navigate(...args): void {
      const [name] = args as [Extract<keyof TRoutes, string>, unknown];

      if (routeNames.includes(name)) {
        setActiveTab(name);
      }
    },
    push(...args): void {
      const [name] = args as [Extract<keyof TRoutes, string>, unknown];

      if (routeNames.includes(name)) {
        setActiveTab(name);
      }
    },
    goBack(): void {
      // No-op for tab navigators — use the outer stack navigator's goBack if needed.
    },
    canGoBack(): boolean {
      return false;
    },
    reset(state): void {
      const targetRoute = state.routes[state.index];

      if (targetRoute && routeNames.includes(targetRoute.name)) {
        setActiveTab(targetRoute.name);
      }
    },
    setParams(): void {
      // Tab screens don't use stack-style params; this is a no-op.
    },
    getState(): NavigationState<TRoutes> {
      return {
        type: 'stack',
        key: `tab-${activeTab as string}`,
        routeNames,
        routes: [{ key: activeTab, name: activeTab }],
        index: 0,
        stale: false,
      };
    },
  };
}
