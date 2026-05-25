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

  return ctx.helpers;
}

/**
 * Hook to access the current route object within a screen.
 * Provides route name and typed params.
 *
 * Usage: useRoute<MyRoutes, 'Profile'>()
 */
export function useRoute<
  TRoutes extends Record<string, unknown>,
  K extends keyof TRoutes = keyof TRoutes,
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
    // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- Route.params is unknown internally; caller asserts TRoutes[K] at the hook call site
    params: focusedRoute.params as RouteObject<TRoutes[K]>['params'],
  };
}
