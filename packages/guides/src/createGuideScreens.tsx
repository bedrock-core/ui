/** @jsxImportSource @bedrock-core/ui-runtime */
import type { ScreenComponent, ScreenProps } from '@bedrock-core/navigation';
import type { JSX } from '@bedrock-core/ui-runtime';
import { GuideContentsScreen, type GuideScreenOptions } from './screens/GuideContents';
import { GuidePageScreen } from './screens/GuidePage';
import type { GuideSource } from './source';
import type { GuideRoutes } from './types';

/**
 * Build the two guide screens bound to a {@link GuideSource}, ready to spread
 * into a host navigator's screens map:
 *
 * ```tsx
 * type AppRoutes = { Home: undefined } & GuideRoutes;
 *
 * const Stack = createStackNavigator<AppRoutes>({
 *   initialRouteName: 'Home',
 *   screens: {
 *     Home: HomeScreen,
 *     ...createGuideScreens<AppRoutes>(staticGuideSource(manifest)),
 *   },
 * });
 * ```
 *
 * A factory (instead of a self-contained NavigationContainer) because a render
 * root has exactly one container — this plugs guides into an existing stack.
 * For an addon with no UI of its own, use {@link GuideApp} instead.
 */

export function createGuideScreens<TRoutes extends GuideRoutes = GuideRoutes>(
  source: GuideSource,
  options: GuideScreenOptions = {},
): {
  GuideContents: ScreenComponent<TRoutes & GuideRoutes, 'GuideContents'>;
  GuidePage: ScreenComponent<TRoutes & GuideRoutes, 'GuidePage'>;
} {
  function GuideContents({ navigation, route }: ScreenProps<GuideRoutes, 'GuideContents'>): JSX.Element {
    return <GuideContentsScreen navigation={navigation} route={route} source={source} options={options} />;
  }

  function GuidePage({ navigation, route }: ScreenProps<GuideRoutes, 'GuidePage'>): JSX.Element {
    return <GuidePageScreen navigation={navigation} route={route} source={source} options={options} />;
  }

  return {
    GuideContents: forHostRoutes<TRoutes, 'GuideContents'>(GuideContents),
    GuidePage: forHostRoutes<TRoutes, 'GuidePage'>(GuidePage),
  };
}

/**
 * Re-tag a screen authored against {@link GuideRoutes} for a host route map that
 * merely *contains* those routes. Sound at runtime — the navigator only invokes
 * the screen for its guide route, so the `navigation`/`route` it receives are
 * always the guide-typed ones the component was written for. The compiler can't
 * infer it because {@link NavigationHelpers} is invariant in `TRoutes` (its
 * `reset` uses `TRoutes` in an array position), so the widening is stated here,
 * in one guarded place, instead of leaking `as` casts into the factory body.
 */
function forHostRoutes<TRoutes extends GuideRoutes, K extends Extract<keyof GuideRoutes, string>>(
  screen: ScreenComponent<GuideRoutes, K>,
): ScreenComponent<TRoutes & GuideRoutes, K> {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- widening a GuideRoutes-typed screen to the host's superset; sound because the navigator only ever invokes it for its guide route, but unprovable since NavigationHelpers is invariant in TRoutes (see the JSDoc)
  return screen as ScreenComponent<TRoutes & GuideRoutes, K>;
}
