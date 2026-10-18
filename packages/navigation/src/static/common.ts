import type { DisplayText, JSX, PressEvent } from '@bedrock-core/ui-runtime';
import type { Player } from '@minecraft/server';
import type { ParamsForScreen, ParamListFor, StaticParamList } from './inference';
import { NAVIGATION_ADAPTER } from './symbols';

declare const nestedNavigator: unique symbol;
declare const referenceParams: unique symbol;

export type ParamListBase = Record<string, object | undefined>;
export type RouteName<Params extends ParamListBase> = Extract<keyof Params, string>;
export type NavigatorType = 'stack' | 'tab';
export type Unsubscribe = () => void;

/** Route params are copied and validated as finite, acyclic JSON data at a server boundary. */
export type JsonValue = null | boolean | number | string | readonly JsonValue[] | { readonly [key: string]: JsonValue };

/** Augment @bedrock-core/navigation with `interface RootNavigator extends MyRootType {}`. */
export interface RootNavigator {}

export type ScreenKey = `${string}:${string}`;

/** Optional generated or authored mapping of published screen keys to their public params. */
export interface PublishedScreens {}

export type ScreenParams<Key extends ScreenKey> = Key extends keyof PublishedScreens
  ? Extract<PublishedScreens[Key], object | undefined> : Readonly<Record<string, JsonValue>> | undefined;

/** Params for a reference route whose destination is chosen at runtime, such as a Catalog selection. */
export interface PublishedScreenParams {
  readonly screen: ScreenKey;
  readonly params?: Readonly<Record<string, JsonValue>>;
}

export interface ScreenReferenceRoute<Params extends object | undefined = PublishedScreenParams> {
  readonly type: 'reference';
  readonly [referenceParams]?: Params;
}

/** Register one ordinary route that can open any discovered published screen through the root adapter. */
export { createScreenReference } from './definitions';

/** Opaque resolution/transport backend. The navigator retains ownership of route state, history and Back. */
export interface NavigationAdapter {
  readonly [NAVIGATION_ADAPTER]: true;
}

export type Route<Name extends string = string, Params extends object | undefined = object | undefined> = Readonly<{
  key: string;
  name: Name;
}> & (undefined extends Params ? { readonly params?: Params } : { readonly params: Params });

export type RouteProp<Params extends ParamListBase, Name extends RouteName<Params> = RouteName<Params>>
  = Name extends unknown ? Route<Name, Params[Name]> : never;

/** React Navigation 8's route-based static screen props; navigation comes from a named hook. */
export interface StaticScreenProps<Params extends object | undefined = undefined> {
  readonly route: Route<string, Params>;
}

export type NavigationDestination<Params extends ParamListBase> = {
  [Name in RouteName<Params>]: Readonly<{ name: Name }> & (
    undefined extends Params[Name] ? { readonly params?: Params[Name] } : { readonly params: Params[Name] }
  );
}[RouteName<Params>];

export type NavigatorScreenParams<Navigator extends AnyStaticNavigator | ParamListBase> = {
  [Name in RouteName<ParamListFor<Navigator>>]: Readonly<{ screen: Name; initial?: boolean }> & (
    undefined extends ParamListFor<Navigator>[Name]
      ? { readonly params?: ParamListFor<Navigator>[Name] }
      : { readonly params: ParamListFor<Navigator>[Name] }
  );
}[RouteName<ParamListFor<Navigator>>] & { readonly [nestedNavigator]?: Navigator };

type ChildParams<Value> = Value extends object ? typeof nestedNavigator extends keyof Value
  ? NonNullable<Value[typeof nestedNavigator]> extends infer Child extends AnyStaticNavigator | ParamListBase
    ? ParamListFor<Child> : never
  : never : never;

type InitialRoute<Params extends ParamListBase> = {
  [Name in RouteName<Params>]: Extract<NavigationDestination<Params>, { readonly name: Name }> & (
    string extends RouteName<Params> ? { readonly state?: InitialState }
      : [ChildParams<Params[Name]>] extends [never] ? { readonly state?: never } : { readonly state?: InitialState<ChildParams<Params[Name]>> }
  );
}[RouteName<Params>];

/** Last server-confirmed logical state; client-only changes are observed at the next checkpoint. */
export interface NavigationStateShape {
  readonly key: string;
  readonly type: NavigatorType;
  readonly stale: false;
  readonly index: number;
  readonly routeNames: readonly string[];
  readonly routes: readonly { readonly key: string; readonly name: string; readonly params?: object; readonly state?: NavigationStateShape }[];
  readonly history?: readonly { readonly type: 'route'; readonly key: string; readonly params?: object }[];
}

export interface NavigationState<Params extends ParamListBase = ParamListBase> extends NavigationStateShape {
  readonly routeNames: readonly RouteName<Params>[];
  readonly routes: readonly (RouteProp<Params> & { readonly state?: NavigationState })[];
}

/** Serializable restoration input. Unknown names, invalid params and incompatible state are rejected. */
export interface InitialState<Params extends ParamListBase = ParamListBase> {
  readonly index?: number;
  readonly routes: readonly InitialRoute<Params>[];
}

export interface NavigateOptions {
  /** Replace existing params by default; true shallow-merges them. */
  readonly merge?: boolean;
  /** Stack only: pop to an existing matching route instead of pushing. Default false. */
  readonly pop?: boolean;
}

export type NavigateArgs<Params extends ParamListBase> = {
  [Name in RouteName<Params>]: undefined extends Params[Name]
    ? [name: Name, params?: Params[Name], options?: NavigateOptions]
    : [name: Name, params: Params[Name], options?: NavigateOptions];
}[RouteName<Params>];

export type PopToArgs<Params extends ParamListBase> = {
  [Name in RouteName<Params>]: undefined extends Params[Name]
    ? [name: Name, params?: Params[Name], options?: Pick<NavigateOptions, 'merge'>]
    : [name: Name, params: Params[Name], options?: Pick<NavigateOptions, 'merge'>];
}[RouteName<Params>];

export type ScreenArgs<Params extends ParamListBase> = {
  [Name in RouteName<Params>]: undefined extends Params[Name]
    ? [name: Name, params?: Params[Name]]
    : [name: Name, params: Params[Name]];
}[RouteName<Params>];

export type NavigationAction<Params extends ParamListBase = ParamListBase> = Readonly<{
  source?: string;
  target?: string;
}> & (
  | { readonly type: 'NAVIGATE'; readonly payload: NavigationDestination<Params> & NavigateOptions }
  | { readonly type: 'PUSH' | 'REPLACE' | 'POP_TO' | 'JUMP_TO'; readonly payload: NavigationDestination<Params> & { readonly merge?: boolean } }
  | { readonly type: 'GO_BACK' | 'POP_TO_TOP' }
  | { readonly type: 'POP' | 'DISMISS'; readonly payload: { readonly count: number } }
  | { readonly type: 'RESET'; readonly payload: InitialState<Params> }
  | { readonly type: 'SET_PARAMS'; readonly payload: { readonly params: object } }
  | { readonly type: 'REPLACE_PARAMS' | 'PUSH_PARAMS'; readonly payload: { readonly params?: object } }
);

export interface NavigationEventMap {
  focus: undefined;
  blur: undefined;
  state: { readonly state: NavigationState };
  beforeRemove: { readonly action: NavigationAction };
}

/** Events run on the server. Intermediate client-only visits are not replayed as focus events. */
export type NavigationEvent<Name extends string, Data, Preventable extends boolean = false> = Readonly<{
  type: Name;
  target: string;
  player: Player;
  data: Data;
}> & (Preventable extends true ? { readonly defaultPrevented: boolean; preventDefault(): void } : object);

export type NavigationListeners<Events extends NavigationEventMap = NavigationEventMap> = {
  readonly [Name in keyof Events]?: (event: NavigationEvent<Extract<Name, string>, Events[Name], Name extends 'beforeRemove' | 'tabPress' ? true : false>) => void;
};

/**
 * Imperative operations run on the server and resolve against action-time confirmed state.
 * Server buttons inside a navigator automatically checkpoint their active route/history before invoking the callback.
 */
export interface NavigationProp<
  Params extends ParamListBase = ParamListBase,
  Name extends RouteName<Params> = RouteName<Params>,
  Options extends object = CommonNavigationOptions,
  State extends NavigationStateShape = NavigationState<Params>,
  Events extends NavigationEventMap = NavigationEventMap,
> {
  /** Same focused name/id updates params; another destination pushes in stacks and selects in tabs. */
  navigate(...args: NavigateArgs<Params>): void;
  navigate(destination: NavigationDestination<Params> & NavigateOptions): void;
  /** Pops visited history. Unhandled Back bubbles to a parent, then the root Back policy. */
  goBack(): void;
  /** These reads describe the latest confirmed state, not unreported client selections. */
  canGoBack(): boolean;
  isFocused(): boolean;
  getState(): State;
  getId(): string | undefined;
  getParent<Parent extends NavigationProp = NavigationProp>(id?: string): Parent | undefined;
  reset(state: InitialState<Params>): void;
  dispatch(action: NavigationAction<Params> | ((state: State) => NavigationAction<Params>)): void;
  /** Shallow merge, without adding history. */
  setParams(params: Partial<NonNullable<Params[Name]>>): void;
  /** Replace, without adding history. */
  replaceParams(params: Params[Name]): void;
  /** React Navigation 8: replace params and add a history entry, even in tabs. */
  pushParams(params: Params[Name]): void;
  /** Values may change; changing compiled geometry requires a declared variant or fails validation. */
  setOptions(options: Partial<Options>): void;
  /** Preventable listeners require server navigation for the affected screen. */
  addListener<Event extends Extract<keyof Events, string>>(
    event: Event,
    listener: NonNullable<NavigationListeners<Events>[Event]>,
  ): Unsubscribe;
  removeListener<Event extends Extract<keyof Events, string>>(
    event: Event,
    listener: NonNullable<NavigationListeners<Events>[Event]>,
  ): void;
}

export interface HeaderProps {
  readonly route: Route;
  readonly options: CommonNavigationOptions;
  /** Undefined at a root without a caller. */
  readonly back?: { readonly title?: DisplayText };
  /** Declarative action suitable for Link; it can remain client-local. */
  readonly backAction: { readonly type: 'GO_BACK' };
}

export interface CommonNavigationOptions {
  readonly title?: DisplayText;
  readonly headerShown?: boolean;
  readonly headerTitle?: DisplayText | ((props: { readonly children: DisplayText }) => JSX.Element);
  readonly header?: (props: HeaderProps) => JSX.Element;
  readonly headerLeft?: (props: HeaderProps) => JSX.Element | null;
  readonly headerRight?: (props: HeaderProps) => JSX.Element | null;
}

/** Hooks are evaluated for the owning player during server render. All possible screens remain compile-visible. */
export interface ScreenBedrockOptions {
  /** Auto uses finite declarative client transitions where possible. Server forces a form response. */
  readonly navigation?: 'auto' | 'server';
}

export type ScreenComponent = (props: never) => JSX.Element;
/** Namespaced keys refer to compiled screen entries and always cross a server boundary. */
export type ScreenSource = ScreenComponent | AnyStaticNavigator | ScreenKey | ScreenReferenceRoute;

export interface ScreenConfigContext<Source extends ScreenSource = ScreenSource, Navigation extends NavigationProp = NavigationProp> {
  readonly route: Route<string, ParamsForScreen<Source>>;
  readonly navigation: Navigation;
}

export interface StaticScreenConfig<
  Source extends ScreenSource = ScreenSource,
  Options extends object = CommonNavigationOptions,
  Events extends NavigationEventMap = NavigationEventMap,
  Navigation extends NavigationProp = NavigationProp,
> {
  readonly screen: Source;
  readonly initialParams?: Partial<NonNullable<ParamsForScreen<Source>>>;
  readonly getId?: (props: { readonly params: ParamsForScreen<Source> }) => string | undefined;
  readonly if?: () => boolean;
  readonly options?: Options | ((props: ScreenConfigContext<Source, Navigation>) => Options);
  readonly listeners?: NavigationListeners<Events> | ((props: ScreenConfigContext<Source, Navigation>) => NavigationListeners<Events>);
  readonly navigationKey?: string;
  readonly bedrock?: ScreenBedrockOptions;
}

/** Typed screen helpers provide callback inference; shorthand components and nested navigators also work. */
export type StaticScreens = Readonly<Record<string, ScreenSource | {
  readonly screen: ScreenSource;
  readonly options?: object | ((props: never) => object);
  readonly listeners?: object | ((props: never) => object);
  readonly initialParams?: object;
  readonly getId?: (props: never) => string | undefined;
  readonly if?: () => boolean;
  readonly navigationKey?: string;
  readonly bedrock?: ScreenBedrockOptions;
}>>;

export interface StaticGroup<Screens extends StaticScreens = StaticScreens, Options extends object = CommonNavigationOptions> {
  readonly screens: Screens;
  readonly if?: () => boolean;
  readonly screenOptions?: Options;
  readonly navigationKey?: string;
}

export type StaticGroups = Readonly<Record<string, StaticGroup<StaticScreens, object>>>;

export interface StaticConfig {
  readonly id?: string;
  readonly screens?: StaticScreens;
  readonly groups?: StaticGroups;
}

/** A static definition can be nested directly in another navigator's screens map. */
export interface StaticNavigator<Type extends NavigatorType = NavigatorType, Config extends StaticConfig = StaticConfig> {
  readonly type: Type;
  readonly config: Config;
}

export type AnyStaticNavigator = StaticNavigator<NavigatorType, StaticConfig>;

/** One budget covers the entire nested navigation tree of a presented form. Crossing host types uses the server. */
export interface ClientNavigationOptions {
  /** Default auto. */
  readonly mode?: 'auto' | 'server';
  /** Nonnegative integer. Maximum client-local pushes before a server checkpoint. Default 2. */
  readonly maxDepth?: number;
  /** Positive integer. Maximum combined native history contexts, not a limit on registered screens. Default 64. */
  readonly maxStates?: number;
  /** Default server. Dynamic params, unsupported local actions and exhausted budgets use the server. */
  readonly fallback?: 'server' | 'error';
}

export interface StaticNavigationOptions {
  /** Default resolves this bundle's own entries. Core adds discovery and cross-addon transport to the same navigation tree. */
  readonly adapter?: NavigationAdapter;
  readonly clientNavigation?: ClientNavigationOptions;
  /** Default caller-or-close for goBack. Native form cancellation dismisses the host. Checkpoints reset local history. */
  readonly rootBackBehavior?: 'caller-or-close' | 'close';
}

export interface NavigationContainerProps<Root extends AnyStaticNavigator> {
  readonly initialState?: InitialState<StaticParamList<Root>>;
  readonly ref?: NavigationContainerRef<Root>;
  /** Container initialization on the server, without a client paint acknowledgement. */
  readonly onReady?: (event: { readonly player: Player }) => void;
  /** Server-confirmed changes only. This does not run on every native toggle. */
  readonly onStateChange?: (state: NavigationState<StaticParamList<Root>>, event: { readonly player: Player }) => void;
  readonly onUnhandledAction?: (action: NavigationAction, event: { readonly player: Player }) => void;
}

/**
 * Turns one complete static navigator tree into its root component, with context, refs and optional adapter.
 * Mount inside the author's Screen host. This creates neither another navigation strategy nor a native form host.
 */
export { createStaticNavigation, createNavigationContainerRef } from './container';

export interface PlayerNavigationContainerRef<Root extends AnyStaticNavigator>
  extends NavigationProp<StaticParamList<Root>> {
  isReady(): boolean;
  getRootState(): NavigationState<StaticParamList<Root>> | undefined;
  getCurrentRoute(): Route | undefined;
  resetRoot(state: InitialState<StaticParamList<Root>>): void;
}

/** World-safe ref registry: never binds one player's screen to another player's commands. */
export interface NavigationContainerRef<Root extends AnyStaticNavigator> {
  forPlayer(player: Player): PlayerNavigationContainerRef<Root>;
}

/** A server callback receives a confirmed local route before it runs. */
export type NavigationPressEvent = PressEvent;
