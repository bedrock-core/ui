import { createContext, JSX } from '@bedrock-core/ui-runtime';
import type { NavigationHelpers, NavigationState } from './types';
import type { StackAction } from './reducer';

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
 * Types are recovered via casts inside the hooks and the navigators.
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
