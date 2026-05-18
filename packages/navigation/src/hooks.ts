/**
 * Navigation hooks for accessing navigation and route information within screens.
 */

import { useContext } from '@bedrock-core/ui';
import type { NavigationHelpers, RouteObject } from './types';
import { NavigationContext } from './context';

/**
 * Hook to access the navigation object within a screen.
 * Provides methods like navigate, goBack, push, etc.
 *
 * Always pass TRoutes to get full type safety: useNavigation<MyRoutes>()
 */
export function useNavigation<TRoutes extends Record<string, unknown>>(): NavigationHelpers<TRoutes> {
  const ctx = useContext(NavigationContext);

  if (!ctx) {
    throw new Error(
      'useNavigation must be called within a NavigationContainer. '
      + 'Make sure your component is rendered inside a NavigationContainer.',
    );
  }

  // Safe cast: context is populated by createStackNavigator<TRoutes>, caller asserts the same TRoutes.
  return ctx.helpers as NavigationHelpers<TRoutes>;
}

/**
 * Hook to access the current route object within a screen.
 * Provides route name and typed params.
 *
 * Usage: useRoute<MyRoutes, 'Profile'>()
 */
export function useRoute<
  TRoutes extends Record<string, unknown>,
  K extends keyof TRoutes & string = keyof TRoutes & string,
>(): RouteObject<TRoutes[K]> {
  const ctx = useContext(NavigationContext);

  if (!ctx) {
    throw new Error(
      'useRoute must be called within a NavigationContainer. '
      + 'Make sure your component is rendered inside a NavigationContainer.',
    );
  }

  const focusedRoute = ctx.state.routes[ctx.state.index];

  if (!focusedRoute) {
    throw new Error('No focused route found in navigation state');
  }

  return {
    key: focusedRoute.key,
    name: focusedRoute.name,
    params: focusedRoute.params as RouteObject<TRoutes[K]>['params'],
  };
}
