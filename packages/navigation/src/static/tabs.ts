import { createNavigatorFactory } from './factory';
import type { DisplayText, JSX } from '@bedrock-core/ui-runtime';
import type {
  CommonNavigationOptions, NavigationEventMap, NavigationListeners, NavigationProp,
  NavigationDestination, NavigationState, ParamListBase, RouteName, RouteProp, ScreenArgs, ScreenSource, StaticConfig, StaticGroups,
  StaticScreenConfig, StaticScreens,
} from './common';
import type { ParamListFromConfig, TabParams } from './inference';

export interface TopTabNavigationEventMap extends NavigationEventMap {
  tabPress: undefined;
  tabLongPress: undefined;
}

export interface TopTabNavigationOptions extends CommonNavigationOptions {
  readonly tabBarLabel?: DisplayText;
  readonly tabBarShowLabel?: boolean;
  /** Pure renderer, compiled for focused and unfocused variants. A native focus change does not invoke JS. */
  readonly tabBarIcon?: (props: { readonly focused: boolean; readonly size: number }) => JSX.Element;
  readonly tabBarBadge?: string | number;
}

export interface TabNavigationState<Params extends ParamListBase = ParamListBase> extends NavigationState<Params> {
  readonly type: 'tab';
  readonly history: readonly { readonly type: 'route'; readonly key: string; readonly params?: object }[];
}

export interface TabActionHelpers<Params extends ParamListBase> {
  /** Select an existing tab and preserve that tab's nested stack within the current local window. */
  jumpTo(...args: ScreenArgs<Params>): void;
}

export type TopTabNavigationProp<Params extends ParamListBase, Name extends RouteName<Params> = RouteName<Params>>
  = NavigationProp<Params, Name, TopTabNavigationOptions, TabNavigationState<Params>, TopTabNavigationEventMap>
    & TabActionHelpers<Params>;

/** Pure tab-bar renderers receive compile-known focus variants and declarative actions for local selection. */
export interface TopTabBarProps<Params extends ParamListBase = TabParams> {
  readonly state: TabNavigationState<Params>;
  readonly descriptors: Readonly<Record<string, { readonly options: TopTabNavigationOptions }>>;
  readonly navigation: TopTabNavigationProp<Params>;
  readonly actions: { readonly [Name in RouteName<Params>]: {
    readonly type: 'JUMP_TO';
    readonly payload: Extract<NavigationDestination<Params>, { readonly name: Name }>;
  } };
}

export interface TopTabNavigatorConfig<Screens extends StaticScreens = StaticScreens, Groups extends StaticGroups = Record<never, never>>
  extends StaticConfig {
  readonly screens?: Screens;
  readonly groups?: Groups;
  readonly initialRouteName?: RouteName<ParamListFromConfig<{ screens: Screens; groups: Groups }>>;
  /** Default firstRoute, matching React Navigation 8. History modes remain bounded by the form budget. */
  readonly backBehavior?: 'firstRoute' | 'initialRoute' | 'order' | 'history' | 'fullHistory' | 'none';
  readonly screenOptions?: TopTabNavigationOptions | ((props: {
    readonly route: RouteProp<ParamListFromConfig<{ screens: Screens; groups: Groups }>>;
    readonly navigation: TopTabNavigationProp<ParamListFromConfig<{ screens: Screens; groups: Groups }>>;
  }) => TopTabNavigationOptions);
  readonly screenListeners?: NavigationListeners<TopTabNavigationEventMap>;
  /** Evaluated for finite view states; must not contain navigation side effects. */
  readonly tabBar?: (props: TopTabBarProps<ParamListFromConfig<{ screens: Screens; groups: Groups }>>) => JSX.Element;
}

/** Minecraft-style tab bar above its peer pages. Each tab can contain its own stack navigator. */
export const createTopTabNavigator = createNavigatorFactory('tab');

export function createTopTabScreen<const Source extends ScreenSource>(
  config: StaticScreenConfig<Source, TopTabNavigationOptions, TopTabNavigationEventMap, TopTabNavigationProp<ParamListBase>>,
): StaticScreenConfig<Source, TopTabNavigationOptions, TopTabNavigationEventMap, TopTabNavigationProp<ParamListBase>> {
  return config;
}
