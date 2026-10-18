/** Static route inference for nested navigator definitions. */
import type {
  AnyStaticNavigator, NavigationProp, NavigatorScreenParams, ParamListBase,
  NavigationEventMap, RootNavigator, RouteProp, ScreenKey, ScreenParams, ScreenReferenceRoute, ScreenSource, StaticGroups, StaticNavigator, StaticScreens,
} from './common';
import type { StackActionHelpers, StackNavigationOptions, StackNavigationState } from './stack';
import type { TopTabNavigationEventMap, TopTabNavigationOptions, TabActionHelpers, TabNavigationState } from './tabs';

type UnionToIntersection<Union> = (Union extends unknown ? (value: Union) => void : never) extends
(value: infer Intersection) => void ? Intersection : never;

type ScreenMap<Config> = Config extends { readonly screens?: infer Screens } ? NonNullable<Screens> : Record<never, never>;
type GroupMaps<Config> = Config extends { readonly groups?: infer Groups }
  ? { [Name in keyof Groups]: ScreenMap<Groups[Name]> }[keyof Groups] : never;
type ScreensFor<Config> = ScreenMap<Config> & ([GroupMaps<Config>] extends [never] ? Record<never, never> : UnionToIntersection<GroupMaps<Config>>);

export type SourceOf<Screen> = Screen extends { readonly screen: infer Source } ? Source : Screen;

export type ParamsForScreen<Screen> = SourceOf<Screen> extends infer Source
  ? Source extends AnyStaticNavigator ? NavigatorScreenParams<Source> | undefined
    : Source extends ScreenKey ? ScreenParams<Source>
      : Source extends ScreenReferenceRoute<infer Params> ? Params
        : Source extends (props: infer Props) => unknown
          ? Props extends { readonly route: { readonly params: infer Params extends object | undefined } } ? Params : undefined
          : undefined
  : never;

type ScreenValues<Source extends ScreenSource, Options extends object> = {
  readonly initialParams?: Partial<NonNullable<ParamsForScreen<Source>>>;
  readonly options?: Options | ((props: never) => Options);
  readonly getId?: (props: { readonly params: ParamsForScreen<Source> }) => string | undefined;
};

export type CheckedScreens<Screens extends StaticScreens, Options extends object> = {
  readonly [Name in keyof Screens]: Screens[Name] extends { readonly screen: infer Source extends ScreenSource }
    ? Screens[Name] & ScreenValues<Source, Options> : Screens[Name];
};

export type CheckedGroups<Groups extends StaticGroups, Options extends object> = {
  readonly [Name in keyof Groups]: Groups[Name] & {
    readonly screens: CheckedScreens<Groups[Name]['screens'], Options>;
    readonly screenOptions?: Options | ((props: never) => Options);
  };
};

export type ParamListFromConfig<Config> = { [Name in Extract<keyof ScreensFor<Config>, string>]: ParamsForScreen<ScreensFor<Config>[Name]> };
export type StaticParamList<Navigator extends AnyStaticNavigator> = ParamListFromConfig<Navigator['config']>;
export type ParamListFor<Value extends AnyStaticNavigator | ParamListBase> = Value extends AnyStaticNavigator
  ? StaticParamList<Value> : Value extends ParamListBase ? Value : never;

type Merge<Parent, Own> = Omit<Parent, keyof Own> & Own;
type Helpers<Navigator extends AnyStaticNavigator> = Navigator['type'] extends 'stack'
  ? StackActionHelpers<StaticParamList<Navigator>> : TabActionHelpers<StaticParamList<Navigator>>;
type Options<Navigator extends AnyStaticNavigator> = Navigator['type'] extends 'stack'
  ? StackNavigationOptions : TopTabNavigationOptions;
type State<Navigator extends AnyStaticNavigator> = Navigator['type'] extends 'stack'
  ? StackNavigationState<StaticParamList<Navigator>> : TabNavigationState<StaticParamList<Navigator>>;
type Events<Navigator extends AnyStaticNavigator> = Navigator['type'] extends 'stack'
  ? NavigationEventMap : TopTabNavigationEventMap;

type Entries<
  Navigator extends AnyStaticNavigator,
  Parents extends ParamListBase = Record<never, never>,
  ParentHelpers = object,
  Depth extends readonly unknown[] = [1, 1, 1, 1, 1, 1, 1, 1],
> = [Navigator] extends [never] ? never : Depth extends readonly [unknown, ...infer Rest] ? {
  [Name in Extract<keyof ScreensFor<Navigator['config']>, string>]:
    | { readonly name: Name; readonly kind: Navigator['type']; readonly params: StaticParamList<Navigator>[Name]; readonly scope: StaticParamList<Navigator>; readonly route: RouteProp<StaticParamList<Navigator>, Name>;
      readonly navigation: NavigationProp<Merge<Parents, StaticParamList<Navigator>>, Name, Options<Navigator>, State<Navigator>, Events<Navigator>>
        & Helpers<Navigator> & ParentHelpers; }
        | (SourceOf<ScreensFor<Navigator['config']>[Name]> extends infer Child extends AnyStaticNavigator
          ? Entries<Child, Merge<Parents, StaticParamList<Navigator>>, Helpers<Navigator> & ParentHelpers, Rest> : never)
}[Extract<keyof ScreensFor<Navigator['config']>, string>] : never;

export type RegisteredRoot = RootNavigator extends StaticNavigator<infer Type, infer Config> ? StaticNavigator<Type, Config> : never;
export type RootParams = [RegisteredRoot] extends [never] ? ParamListBase : StaticParamList<RegisteredRoot>;
export type RegisteredEntries = Entries<RegisteredRoot>;
export type RegisteredScreenName = RegisteredEntries['name'];
export type RegisteredParams = [RegisteredRoot] extends [never] ? ParamListBase
  : { [Name in RegisteredScreenName]: Extract<RegisteredEntries, { name: Name }>['params'] };
export type StackParams = [RegisteredRoot] extends [never] ? ParamListBase
  : { [Name in Extract<RegisteredEntries, { kind: 'stack' }>['name']]: Extract<RegisteredEntries, { kind: 'stack'; name: Name }>['params'] };
export type TabParams = [RegisteredRoot] extends [never] ? ParamListBase
  : { [Name in Extract<RegisteredEntries, { kind: 'tab' }>['name']]: Extract<RegisteredEntries, { kind: 'tab'; name: Name }>['params'] };
export type RegisteredNavigation<Name extends RegisteredScreenName> = Extract<RegisteredEntries, { name: Name }>['navigation'];
export type RegisteredRoute<Name extends RegisteredScreenName = RegisteredScreenName> = [RegisteredRoot] extends [never]
  ? RouteProp<ParamListBase> : Extract<RegisteredEntries, { name: Name }>['route'];

export type ParamsIn<Scope extends RegisteredScreenName | undefined> = Scope extends RegisteredScreenName
  ? Extract<RegisteredEntries, { name: Scope }>['scope'] : RootParams;
