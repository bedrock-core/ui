import { createNavigatorFactory } from './factory';
import type {
  CommonNavigationOptions, NavigationEventMap, NavigationListeners, NavigationProp,
  NavigationState, ParamListBase, PopToArgs, RouteName, RouteProp, ScreenArgs, ScreenSource, StaticConfig, StaticGroups,
  StaticScreenConfig, StaticScreens,
} from './common';
import type { ParamListFromConfig } from './inference';

export interface StackNavigationOptions extends CommonNavigationOptions {
  readonly headerBackVisible?: boolean;
}

export interface StackNavigationState<Params extends ParamListBase = ParamListBase> extends NavigationState<Params> {
  readonly type: 'stack';
}

export interface StackActionHelpers<Params extends ParamListBase> {
  /** Always add a distinct route instance, including repeated visits to the same name/params. */
  push(...args: ScreenArgs<Params>): void;
  replace(...args: ScreenArgs<Params>): void;
  /** Pop history entries, including entries created by pushParams. Default 1. */
  pop(count?: number): void;
  /** Matching visited destination, otherwise replace the current destination. */
  popTo(...args: PopToArgs<Params>): void;
  popToTop(): void;
  /** React Navigation 8: remove complete screens rather than individual param-history entries. */
  dismiss(count?: number): void;
}

export type StackNavigationProp<Params extends ParamListBase, Name extends RouteName<Params> = RouteName<Params>>
  = NavigationProp<Params, Name, StackNavigationOptions, StackNavigationState<Params>> & StackActionHelpers<Params>;

export interface StackNavigatorConfig<Screens extends StaticScreens = StaticScreens, Groups extends StaticGroups = Record<never, never>>
  extends StaticConfig {
  readonly screens?: Screens;
  readonly groups?: Groups;
  readonly initialRouteName?: RouteName<ParamListFromConfig<{ screens: Screens; groups: Groups }>>;
  readonly screenOptions?: StackNavigationOptions | ((props: {
    readonly route: RouteProp<ParamListFromConfig<{ screens: Screens; groups: Groups }>>;
    readonly navigation: StackNavigationProp<ParamListFromConfig<{ screens: Screens; groups: Groups }>>;
  }) => StackNavigationOptions);
  readonly screenListeners?: NavigationListeners;
}

/** Static API only. At least one route is required; duplicate route names in a navigator are rejected. */
export const createStackNavigator = createNavigatorFactory('stack');

export function createStackScreen<const Source extends ScreenSource>(
  config: StaticScreenConfig<Source, StackNavigationOptions, NavigationEventMap, StackNavigationProp<ParamListBase>>,
): StaticScreenConfig<Source, StackNavigationOptions, NavigationEventMap, StackNavigationProp<ParamListBase>> {
  return config;
}
