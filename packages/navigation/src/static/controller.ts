import { closeUi, back as callerBack, navigateAsync } from '../runtime/navigate';
import { checkpoint, currentLocation, historyOf } from '../runtime/history';
import { refreshRender, screenMetadataFor, type PressEvent } from '@bedrock-core/ui-runtime';
import { adapterBackend } from './adapters';
import { destinationAction } from './actions';
import type { Player } from '@minecraft/server';
import type {
  CommonNavigationOptions, NavigationAction, NavigationEvent,
  NavigationProp, NavigationState, Route, StaticNavigationOptions,
} from './common';
import { copyData, isReference, type RouteDefinition } from './definitions';
import { focused, initialState, restoreState, modelAt, reduce, replaceState, stateAt, type Model, type StateRoute, type StateInput } from './state';

type Listener = (event: never) => void;
interface Callbacks {
  readonly onReady?: (event: { readonly player: Player }) => void;
  readonly onStateChange?: (state: never, event: { readonly player: Player }) => void;
  readonly onUnhandledAction?: (action: NavigationAction, event: { readonly player: Player }) => void;
}
export interface PageScope {
  readonly model: Model;
  readonly definition: RouteDefinition;
  readonly route: StateRoute;
  readonly body: string;
}

export class Controller {
  state: NavigationState;
  ready = false;
  private committed = false;
  revision = 0;
  readonly serverPages = new Set<string>();
  readonly availability = new Map<string, boolean>();
  private readonly listeners = new Map<string, Set<Listener>>();
  private readonly guards = new Map<string, (action: NavigationAction) => void>();
  private readonly overrides = new Map<string, CommonNavigationOptions>();
  private readonly configured = new Map<string, Readonly<Record<string, unknown>>>();

  constructor(readonly model: Model, readonly options: StaticNavigationOptions, readonly player?: Player,
    restored?: StateInput, readonly callbacks: Callbacks = {}) {
    this.state = initialState(model, restored);
    const checkpointed = player === undefined ? undefined : currentLocation(player)?.navigatorStates?.[model.key];

    if (checkpointed !== undefined) { this.state = restoreState(model, checkpointed); }
  }

  activate(): void {
    this.ready = true;
  }

  commit(): void {
    if (!this.ready || this.committed || this.player === undefined) { return; }

    this.committed = true;
    let state: NavigationState | undefined = this.state;

    while (state !== undefined) {
      const route = focused(state);

      this.emit('focus', route.key.replace(/:\d+$/, ''), undefined);
      state = route.state;
    }

    this.callbacks.onReady?.({ player: this.player });

    if (this.external(this.state) !== undefined) {
      let owner = this.model; let route = focused(this.state);

      while (route.state !== undefined) { owner = owner.children.get(route.name)!; route = focused(route.state); }

      const action: NavigationAction = { type: 'NAVIGATE', target: owner.key,
        payload: { name: route.name, ...route.params === undefined ? {} : { params: route.params } } };
      const revision = this.revision;

      void Promise.resolve().then(() => { if (this.ready && this.revision === revision) { this.dispatch(action); } });
    }
  }

  dispose(): void { this.ready = false; this.committed = false; this.revision++; this.listeners.clear(); this.guards.clear(); this.configured.clear(); }
  getState(key = this.model.key): NavigationState { return copyData(stateAt(this.state, key) ?? initialState(modelAt(this.model, key) ?? this.model)); }
  canGoBack(state = this.state, key = this.model.key): boolean {
    return this.reduction(state, { type: 'GO_BACK' }, key) !== undefined
      || (this.options.rootBackBehavior !== 'close' && this.player !== undefined && historyOf(this.player).length > 0);
  }

  getRoute(scope: PageScope): Route {
    const state = stateAt(this.state, scope.model.key);

    return copyData(state?.routes.findLast(route => route.name === scope.route.name) ?? scope.route);
  }

  isFocused(scope: PageScope): boolean {
    let state: NavigationState | undefined = this.state;

    while (state !== undefined) {
      if (state.key === scope.model.key) { return focused(state).name === scope.route.name; }

      state = focused(state).state;
    }

    return false;
  }

  requireServer(scope: PageScope): void {
    if (!this.serverOnly(scope.model, scope.route.name)) {
      throw new Error(`Navigation lifecycle hooks on ${scope.route.name} require bedrock.navigation: 'server' or root server mode.`);
    }

    this.serverPages.add(`${scope.model.key}/${scope.route.name}`);
  }

  serverOnly(model: Model, name: string): boolean {
    if (this.options.clientNavigation?.mode === 'server') { return true; }

    let owner: Model | undefined = model; let route = name;

    while (owner !== undefined) {
      if (owner.routes.find(definition => definition.name === route)?.config.bedrock?.navigation === 'server'
        || this.serverPages.has(`${owner.key}/${route}`)) { return true; }

      route = owner.parentRoute ?? ''; owner = owner.parent;
    }

    return false;
  }

  configure(scope: PageScope, listeners: Readonly<Record<string, unknown>>): void {
    if (listeners.beforeRemove !== undefined || listeners.tabPress !== undefined) { this.requireServer(scope); }

    this.configured.set(`${scope.model.key}/${scope.route.name}`, listeners);
  }

  private emit(type: string, target: string, data: unknown, preventable = false): boolean {
    if (this.player === undefined) { return false; }

    let prevented = false;
    const event: NavigationEvent<string, unknown, true> = {
      type, target, player: this.player, data,
      get defaultPrevented(): boolean { return prevented; },
      preventDefault(): void { if (preventable) { prevented = true; } },
    };

    const configured = this.configured.get(target)?.[type];

    if (typeof configured === 'function') { Reflect.apply(configured, undefined, [event]); }

    for (const listener of [...this.listeners.get(`${target}:${type}`) ?? []]) { Reflect.apply(listener, undefined, [event]); }

    return prevented;
  }

  addListener(scope: PageScope, type: string, listener: Listener): () => void {
    if (type === 'beforeRemove' || type === 'tabPress') { this.requireServer(scope); }

    const key = `${scope.model.key}/${scope.route.name}:${type}`;
    const listeners = this.listeners.get(key) ?? new Set<Listener>();

    listeners.add(listener); this.listeners.set(key, listeners);

    return () => {
      listeners.delete(listener);

      if (listeners.size === 0) { this.listeners.delete(key); }
    };
  }

  removeListener(scope: PageScope, type: string, listener: Listener): void {
    this.listeners.get(`${scope.model.key}/${scope.route.name}:${type}`)?.delete(listener);
  }

  prevent(scope: PageScope, callback: ((action: NavigationAction) => void) | undefined): () => void {
    this.requireServer(scope);
    const key = `${scope.model.key}/${scope.route.name}`;

    if (callback !== undefined) { this.guards.set(key, callback); }

    return () => { if (this.guards.get(key) === callback) { this.guards.delete(key); } };
  }

  optionsFor(scope: PageScope): CommonNavigationOptions {
    const resolve = (value: unknown): CommonNavigationOptions => typeof value === 'function'
      ? Reflect.apply(value, undefined, [{ route: scope.route, navigation: this.navigation(scope) }])
      : typeof value === 'object' && value !== null ? value : {};

    return { ...resolve(Reflect.get(scope.model.definition.config, 'screenOptions')), ...resolve(scope.definition.group?.screenOptions),
      ...resolve(scope.definition.config.options), ...this.overrides.get(`${scope.model.key}/${scope.route.name}`) };
  }

  setOptions(scope: PageScope, options: CommonNavigationOptions): void {
    if (this.player !== undefined && !this.ready) { return; }

    const before = this.optionsFor(scope);

    for (const [key, value] of Object.entries(options)) {
      if (key !== 'title' && key !== 'tabBarLabel' && key !== 'tabBarBadge' && Reflect.get(before, key) !== value) {
        throw new Error(`Navigation option ${key} changes compiled geometry. Declare a finite variant in the screen configuration.`);
      }
    }

    this.overrides.set(`${scope.model.key}/${scope.route.name}`, { ...before, ...options });
    this.changed();
  }

  private changed(): void {
    if (this.player !== undefined) { refreshRender(this.player); }
  }

  unhandled(action: NavigationAction): void {
    if (this.player === undefined) { return; }

    if (this.callbacks.onUnhandledAction !== undefined) { this.callbacks.onUnhandledAction(action, { player: this.player }); } else { console.warn(`[navigation] Unhandled ${action.type} in ${this.model.key}.`); }
  }

  private notify(before: NavigationState): void {
    if (!this.committed) { return; }

    const branch = (state: NavigationState): readonly StateRoute[] => {
      const route = focused(state);

      return [route, ...route.state === undefined ? [] : branch(route.state)];
    };

    const previous = branch(before); const current = branch(this.state);

    for (const route of previous) {
      if (!current.some(current => current.key === route.key)) { this.emit('blur', route.key.replace(/:\d+$/, ''), undefined); }
    }

    for (const route of current) {
      if (!previous.some(previous => previous.key === route.key)) { this.emit('focus', route.key.replace(/:\d+$/, ''), undefined); }
    }

    for (const model of this.models()) {
      const state = stateAt(this.state, model.key);

      if (state === undefined || JSON.stringify(stateAt(before, model.key)) === JSON.stringify(state)) { continue; }

      for (const route of model.routes) { this.emit('state', `${model.key}/${route.name}`, { state: copyData(state) }); }
    }

    if (this.player !== undefined && this.callbacks.onStateChange !== undefined) { Reflect.apply(this.callbacks.onStateChange, undefined, [copyData(this.state), { player: this.player }]); }
  }

  private* models(model = this.model): Generator<Model> {
    yield model;

    for (const child of model.children.values()) { yield* this.models(child); }
  }

  confirm(state: NavigationState): void {
    const before = this.state;

    this.state = copyData(state); this.revision++;

    if (this.player !== undefined) { checkpoint(this.player, { navigatorStates: { [this.model.key]: this.state } }); }

    if (JSON.stringify(before) !== JSON.stringify(state)) { this.notify(before); }
  }

  reconcile(state: NavigationState): void { this.confirm(state); this.changed(); }

  reduction(state: NavigationState, action: NavigationAction, scopeKey = this.model.key): NavigationState | undefined {
    let model = modelAt(this.model, scopeKey);

    while (model !== undefined) {
      const own = stateAt(state, model.key);

      if (own !== undefined) {
        const result = reduce(model, own, action);

        if (result.handled) {
          const next = replaceState(state, model.key, result.state);
          let owner = this.model; let route = focused(next);

          while (route.state !== undefined) { owner = owner.children.get(route.name)!; route = focused(route.state); }

          if (this.availability.get(`${owner.key}/${route.name}`) === false) { return undefined; }

          return next;
        }
      }

      if (action.target !== undefined) { break; }

      model = model.parent;
    }

    return undefined;
  }

  external(state: NavigationState): { key: string; params?: Readonly<Record<string, unknown>> } | undefined {
    let model = this.model; let current = focused(state);

    while (current.state !== undefined) {
      model = model.children.get(current.name)!; current = focused(current.state);
    }

    const definition = model.routes.find(route => route.name === current.name)!;

    if (typeof definition.source === 'string') { return { key: definition.source, ...current.params === undefined ? {} : { params: Object.fromEntries(Object.entries(current.params)) } }; }

    if (isReference(definition.source)) {
      const screen: unknown = current.params === undefined ? undefined : Reflect.get(current.params, 'screen');

      if (typeof screen !== 'string' || !/^[^:]+:.+$/.test(screen)) { throw new Error('A published destination requires a namespaced screen key.'); }

      return { key: screen, params: Reflect.get(current.params!, 'params') };
    }

    return undefined;
  }

  dispatch(action: NavigationAction, scopeKey = this.model.key): void {
    if (this.player === undefined || !this.ready) { return; }

    let next: NavigationState | undefined;

    try { next = this.reduction(this.state, copyData(action), scopeKey); } catch {
      this.unhandled(action);

      return;
    }

    if (next === undefined) {
      if (action.type === 'GO_BACK') {
        if (this.options.rootBackBehavior !== 'close' && callerBack(this.player)) { return; }

        closeUi(this.player);

        return;
      }

      this.unhandled(action);

      return;
    }

    const before = this.state;
    const removed = this.removed(before, next);

    for (const route of removed) {
      const key = route.key.replace(/:\d+$/, '');
      const guard = this.guards.get(key);

      if (guard !== undefined) {
        guard(action);

        return;
      }

      if (this.emit('beforeRemove', key, { action }, true)) { return; }
    }

    const tabModel = [...this.models()].find(model => stateAt(next, model.key)?.type === 'tab'
      && (stateAt(before, model.key)?.index !== stateAt(next, model.key)?.index
        || (action.type === 'JUMP_TO' && (action.target === undefined || action.target === model.key
          || action.target === Reflect.get(model.definition.config, 'id'))
        && focused(stateAt(next, model.key)!).name === action.payload.name)));

    if (tabModel !== undefined) {
      const route = focused(stateAt(next, tabModel.key)!);

      if (this.emit('tabPress', `${tabModel.key}/${route.name}`, undefined, true)) { return; }
    }

    let external: ReturnType<Controller['external']>;

    try { external = this.external(next); } catch {
      this.unhandled(action);

      return;
    }

    if (external !== undefined) {
      const revision = ++this.revision;
      let returning = before;
      let replaceHost = this.external(before) !== undefined;

      if (action.type === 'REPLACE' || action.type === 'RESET' || action.type === 'POP_TO') {
        const previous = this.reduction(next, { type: 'GO_BACK' });

        if (previous === undefined || this.external(previous) !== undefined) { replaceHost = true; } else { returning = previous; }
      }

      if (!replaceHost) { checkpoint(this.player, { navigatorStates: { [this.model.key]: returning } }); }

      const options = { ...external.params === undefined ? {} : { params: external.params }, ...replaceHost ? { replace: true } : {} };
      const backend = this.options.adapter === undefined ? undefined : adapterBackend(this.options.adapter);
      const open = this.options.adapter !== undefined
        ? replaceHost ? backend!.open(external.key, this.player, external.params, { replace: true }) : backend!.open(external.key, this.player, external.params)
        : screenMetadataFor(external.key) !== undefined ? navigateAsync(external.key, this.player, options) : Promise.resolve(false);

      const rejected = (): void => {
        if (revision !== this.revision) { return; }

        checkpoint(this.player!, { navigatorStates: { [this.model.key]: before } });
        this.unhandled(action);
      };

      void open.then((accepted) => {
        if (revision !== this.revision) { return; }

        if (!accepted) { rejected(); }
      }).catch(rejected);

      return;
    }

    this.confirm(next); this.changed();
  }

  private removed(before: NavigationState, after: NavigationState): readonly Route[] {
    const keys = new Set<string>();

    const walk = (state: NavigationState, visit: (route: Route) => void): void => {
      for (const route of state.routes) {
        visit(route);

        if (route.state !== undefined) { walk(route.state, visit); }
      }
    };

    walk(after, route => keys.add(route.key));
    const removed: Route[] = [];

    walk(before, (route) => { if (!keys.has(route.key)) { removed.push(route); } });

    return removed;
  }

  navigation(scope?: PageScope, scopeKey = scope?.model.key ?? this.model.key): NavigationProp & Record<string, unknown> {
    const dispatch = (action: NavigationAction): void => this.dispatch(action, scopeKey);

    const pageScope = (): PageScope => {
      if (scope !== undefined) { return scope; }

      const model = modelAt(this.model, scopeKey) ?? this.model;
      const route = focused(stateAt(this.state, model.key) ?? initialState(model));

      return { model, route, definition: model.routes.find(definition => definition.name === route.name)!, body: '' };
    };

    const destination = (type: 'NAVIGATE' | 'PUSH' | 'REPLACE' | 'POP_TO' | 'JUMP_TO', args: readonly unknown[]): void => {
      dispatch(destinationAction(type, args));
    };

    return {
      navigate: (...args: unknown[]): void => destination('NAVIGATE', args),
      goBack: (): void => dispatch({ type: 'GO_BACK' }),
      canGoBack: (): boolean => this.canGoBack(this.state, scopeKey),
      isFocused: (): boolean => scope === undefined || this.isFocused(scope),
      getState: (): NavigationState => this.getState(scopeKey),
      getId: (): string | undefined => Reflect.get((modelAt(this.model, scopeKey) ?? this.model).definition.config, 'id'),
      getParent: <Parent extends NavigationProp = NavigationProp>(id?: string): Parent | undefined => {
        let parent = modelAt(this.model, scopeKey)?.parent;

        while (parent !== undefined && id !== undefined && Reflect.get(parent.definition.config, 'id') !== id) { parent = parent.parent; }

        // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- the ancestor is resolved by id; its generic route list belongs to the caller
        return parent === undefined ? undefined : this.navigation(undefined, parent.key) as unknown as Parent;
      },
      reset: (state): void => dispatch({ type: 'RESET', payload: state }),
      dispatch: (action): void => dispatch(typeof action === 'function' ? action(this.getState(scopeKey)) : action),
      setParams: (params): void => dispatch({ type: 'SET_PARAMS', payload: { params } }),
      replaceParams: (params): void => dispatch({ type: 'REPLACE_PARAMS', payload: params === undefined ? {} : { params } }),
      pushParams: (params): void => dispatch({ type: 'PUSH_PARAMS', payload: params === undefined ? {} : { params } }),
      setOptions: (options): void => { this.setOptions(pageScope(), options); },
      addListener: (event, listener): (() => void) => this.addListener(pageScope(), event, listener),
      removeListener: (event, listener): void => { this.removeListener(pageScope(), event, listener); },
      push: (...args: unknown[]): void => destination('PUSH', args),
      replace: (...args: unknown[]): void => destination('REPLACE', args),
      popTo: (...args: unknown[]): void => destination('POP_TO', args),
      jumpTo: (...args: unknown[]): void => destination('JUMP_TO', args),
      pop: (count = 1): void => dispatch({ type: 'POP', payload: { count } }),
      dismiss: (count = 1): void => dispatch({ type: 'DISMISS', payload: { count } }),
      popToTop: (): void => dispatch({ type: 'POP_TO_TOP' }),
    };
  }

  action(state: NavigationState, handler: (event: PressEvent) => unknown, event: PressEvent): unknown {
    if (this.player?.id !== event.player.id || !this.ready) { return; }

    this.confirm(state);

    return handler(event);
  }
}
