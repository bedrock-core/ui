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

  // The screens only use the GuideRoutes subset of the host's route map, so
  // narrowing the navigation prop from TRoutes to GuideRoutes is safe.
  return { GuideContents, GuidePage } as unknown as {
    GuideContents: ScreenComponent<TRoutes & GuideRoutes, 'GuideContents'>;
    GuidePage: ScreenComponent<TRoutes & GuideRoutes, 'GuidePage'>;
  };
}
