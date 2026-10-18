import type { AnyStaticNavigator, NavigationAction, NavigationState, Route } from './common';
import { copyData, isNavigator, routeDefinitions, type RouteDefinition } from './definitions';

export interface Model {
  readonly definition: AnyStaticNavigator;
  readonly key: string;
  readonly parent?: Model;
  readonly parentRoute?: string;
  readonly routes: readonly RouteDefinition[];
  readonly children: ReadonlyMap<string, Model>;
}

export type StateRoute = Route & { readonly state?: NavigationState };
export interface Reduction { readonly state: NavigationState; readonly handled: boolean }
export interface StateInput {
  readonly index?: number;
  readonly routes: readonly { readonly name: string; readonly params?: object; readonly state?: StateInput }[];
}

export function createModel(definition: AnyStaticNavigator, key = 'root', parent?: Model, parentRoute?: string, ancestors = new Set<AnyStaticNavigator>()): Model {
  if (ancestors.has(definition)) { throw new Error('Navigator definitions must not contain a cycle.'); }

  const branch = new Set([...ancestors, definition]);
  const children = new Map<string, Model>();
  const model: Model = { definition, key, parent, parentRoute, routes: routeDefinitions(definition), children };

  for (const route of model.routes) {
    if (isNavigator(route.source)) { children.set(route.name, createModel(route.source, `${key}/${route.name}`, model, route.name, branch)); }
  }

  return model;
}

const configValue = (model: Model, name: string): unknown => Reflect.get(model.definition.config, name);
const initialName = (model: Model): string => String(configValue(model, 'initialRouteName') ?? model.routes[0].name);

const paramsOf = (definition: RouteDefinition, params: object | undefined): object | undefined => {
  const initial = definition.config.initialParams;

  if (initial === undefined && params === undefined) { return undefined; }

  return copyData({ ...typeof initial === 'object' && initial !== null ? initial : {}, ...params });
};

function makeRoute(model: Model, name: string, params?: object, key?: string, nested?: StateInput): StateRoute {
  const definition = model.routes.find(route => route.name === name);

  if (definition === undefined) { throw new Error(`Unknown route ${name} in ${model.key}.`); }

  const child = model.children.get(name);

  if (child === undefined && nested !== undefined) { throw new Error(`Leaf route ${name} cannot have nested state.`); }

  const supplied = paramsOf(definition, params);
  let state: NavigationState | undefined;

  if (child !== undefined) {
    const destination = supplied !== undefined && 'screen' in supplied ? supplied : undefined;

    if (destination !== undefined && typeof destination.screen !== 'string') { throw new Error('A nested destination requires a screen name.'); }

    state = initialState(child, nested);

    if (destination !== undefined) {
      const nestedParams: unknown = Reflect.get(destination, 'params');

      if (nestedParams !== undefined && (nestedParams === null || typeof nestedParams !== 'object' || Array.isArray(nestedParams))) {
        throw new Error('Nested params must be an object.');
      }

      state = reduce(child, state, { type: 'NAVIGATE', payload: { name: String(destination.screen), ...nestedParams === undefined ? {} : { params: nestedParams } } }).state;
    }
  }

  return { key: key ?? `${model.key}/${name}:0`, name, ...supplied === undefined ? {} : { params: supplied }, ...state === undefined ? {} : { state } };
}

/** Restores only routes belonging to this exact navigator; tabs retain every declared peer. */
export function initialState(model: Model, restored?: StateInput): NavigationState {
  if (restored !== undefined) { copyData(restored); }

  const name = initialName(model);

  if (restored !== undefined && restored.routes.length === 0) { throw new Error('Restored navigation state requires a route.'); }

  const supplied = restored?.routes.map((route, index) => makeRoute(model, route.name, route.params, `${model.key}/${route.name}:${index}`, route.state));
  const routes = model.definition.type === 'tab'
    ? model.routes.map(definition => supplied?.find(route => route.name === definition.name) ?? makeRoute(model, definition.name))
    : supplied ?? [makeRoute(model, name)];
  let index = model.definition.type === 'tab' ? routes.findIndex(route => route.name === name) : routes.length - 1;

  if (restored !== undefined) {
    const at = restored.index ?? restored.routes.length - 1;

    if (!Number.isSafeInteger(at) || at < 0 || at >= restored.routes.length) { throw new Error('Invalid restored navigation index.'); }

    index = model.definition.type === 'tab' ? routes.findIndex(route => route.name === restored.routes[at].name) : at;

    if (model.definition.type === 'tab' && new Set(restored.routes.map(route => route.name)).size !== restored.routes.length) {
      throw new Error('Restored tabs must not contain duplicate routes.');
    }
  }

  return { key: model.key, type: model.definition.type, stale: false, routeNames: model.routes.map(route => route.name), index, routes,
    ...model.definition.type === 'tab' ? { history: [{ type: 'route' as const, key: routes[index].key }] } : {} };
}

/** Validates portable router state before a checkpoint is accepted from another realm. */
export function isNavigationState(value: unknown, depth = 0): value is NavigationState {
  if (depth > 64 || value === null || typeof value !== 'object' || Array.isArray(value)
    || !('key' in value) || typeof value.key !== 'string' || !('type' in value) || !['stack', 'tab'].includes(String(value.type))
    || !('stale' in value) || value.stale !== false || !('index' in value) || !Number.isSafeInteger(value.index)
    || !('routeNames' in value) || !Array.isArray(value.routeNames) || !value.routeNames.every((name: unknown) => typeof name === 'string')
    || !('routes' in value) || !Array.isArray(value.routes) || value.routes.length === 0 || Number(value.index) < 0 || Number(value.index) >= value.routes.length) { return false; }

  const names = value.routeNames;

  if (new Set(names).size !== names.length) { return false; }

  const keys = new Set<string>();

  for (const route of value.routes as unknown[]) {
    if (route === null || typeof route !== 'object' || Array.isArray(route) || !('key' in route) || typeof route.key !== 'string'
      || !('name' in route) || typeof route.name !== 'string' || !names.includes(route.name)
      || ('params' in route && (route.params === null || typeof route.params !== 'object' || Array.isArray(route.params)))
      || ('state' in route && !isNavigationState(route.state, depth + 1))) { return false; }

    keys.add(route.key);
  }

  if (value.type === 'tab' && (value.routes.length !== names.length || keys.size !== names.length)) { return false; }

  if ('history' in value && (!Array.isArray(value.history) || !value.history.every((entry: unknown) => entry !== null && typeof entry === 'object'
    && 'type' in entry && entry.type === 'route' && 'key' in entry && typeof entry.key === 'string' && keys.has(entry.key)
    && (!('params' in entry) || (entry.params !== null && typeof entry.params === 'object' && !Array.isArray(entry.params)))))) { return false; }

  return true;
}

/** Keeps tab history and logical instance keys when reopening a confirmed root. */
export function restoreState(model: Model, value: unknown): NavigationState {
  const state = copyData(value);

  if (!isNavigationState(state) || state.key !== model.key || state.type !== model.definition.type
    || JSON.stringify(state.routeNames) !== JSON.stringify(model.routes.map(route => route.name))) { throw new Error('Incompatible navigation checkpoint.'); }

  for (const route of state.routes) {
    const child = model.children.get(route.name);

    if ((child === undefined) !== (route.state === undefined)) { throw new Error(`Incompatible child state for ${route.name}.`); }

    if (child !== undefined) { restoreState(child, route.state); }
  }

  return state;
}

export function focused(state: NavigationState): StateRoute { return state.routes[state.index]; }

export function leaf(state: NavigationState): StateRoute {
  const route = focused(state);

  return route.state === undefined ? route : leaf(route.state);
}

export function stateAt(state: NavigationState, key: string): NavigationState | undefined {
  if (state.key === key) { return state; }

  for (const route of state.routes) {
    if (route.state !== undefined) {
      const found = stateAt(route.state, key);

      if (found !== undefined) { return found; }
    }
  }

  return undefined;
}

export function modelAt(model: Model, key: string): Model | undefined {
  if (model.key === key || configValue(model, 'id') === key) { return model; }

  for (const child of model.children.values()) {
    const found = modelAt(child, key);

    if (found !== undefined) { return found; }
  }

  return undefined;
}

export function replaceState(state: NavigationState, key: string, next: NavigationState): NavigationState {
  if (state.key === key) { return next; }

  let changed = false;
  const routes = state.routes.map((route) => {
    if (route.state === undefined) { return route; }

    const child = replaceState(route.state, key, next);

    if (child === route.state) { return route; }

    changed = true;

    return { ...route, state: child };
  });

  return changed ? { ...state, routes } : state;
}

const unhandled = (state: NavigationState): Reduction => ({ state, handled: false });
const accepted = (state: NavigationState): Reduction => ({ state, handled: true });

const countOf = (action: NavigationAction): number => {
  const count = 'payload' in action && 'count' in action.payload ? action.payload.count : 1;

  if (!Number.isSafeInteger(count) || count < 1) { throw new Error('Navigation counts must be positive integers.'); }

  return count;
};

const newKey = (state: NavigationState, name: string): string => {
  let index = 0;

  while (state.routes.some(route => route.key === `${state.key}/${name}:${index}`)) { index++; }

  return `${state.key}/${name}:${index}`;
};

function ownReduction(model: Model, state: NavigationState, action: NavigationAction): Reduction {
  const source = action.source === undefined ? state.index : state.routes.findIndex(route => route.key === action.source);

  if (source < 0) { return unhandled(state); }

  const current = state.routes[source];

  if (action.type === 'RESET') { return accepted(initialState(model, action.payload)); }

  if (action.type === 'SET_PARAMS' || action.type === 'REPLACE_PARAMS' || action.type === 'PUSH_PARAMS') {
    const params = copyData(action.payload.params);

    if (params !== undefined && (params === null || typeof params !== 'object' || Array.isArray(params))) { throw new Error('Route params must be an object.'); }

    const { params: _oldParams, ...rest } = current;
    const updated = { ...rest, ...action.type === 'SET_PARAMS'
      ? { params: { ...current.params, ...params } }
      : params === undefined ? {} : { params } };

    if (action.type === 'PUSH_PARAMS' && state.type === 'stack') {
      return accepted({ ...state, routes: [...state.routes.slice(0, source + 1), updated], index: source + 1 });
    }

    const routes = state.routes.map((route, index) => index === source ? updated : route);
    const history = state.type === 'tab'
      ? [
          ...(action.type === 'PUSH_PARAMS' ? state.history ?? [] : (state.history ?? []).slice(0, -1)),
          { type: 'route' as const, key: current.key, ...updated.params === undefined ? {} : { params: updated.params } },
        ]
      : state.history;

    return accepted({ ...state, routes, ...history === undefined ? {} : { history } });
  }

  if (action.type === 'GO_BACK' || action.type === 'POP' || action.type === 'DISMISS' || action.type === 'POP_TO_TOP') {
    if (action.type === 'POP' || action.type === 'DISMISS') { countOf(action); }

    if (state.type === 'tab') {
      if (action.type !== 'GO_BACK') { return unhandled(state); }

      const behavior = configValue(model, 'backBehavior') ?? 'firstRoute';

      if (behavior === 'none') { return unhandled(state); }

      if (behavior === 'history' || behavior === 'fullHistory') {
        if ((state.history?.length ?? 0) < 2) { return unhandled(state); }

        const history = state.history!.slice(0, -1);
        const previous = history.at(-1)!;
        const index = state.routes.findIndex(route => route.key === previous.key);
        const routes = state.routes.map((route, at) => {
          if (at !== index) { return route; }

          const { params: _params, ...rest } = route;

          return { ...rest, ...previous.params === undefined ? {} : { params: previous.params } };
        });

        return accepted({ ...state, index, history, routes });
      }

      const index = behavior === 'order'
        ? Math.max(0, state.index - 1)
        : behavior === 'initialRoute' ? state.routes.findIndex(route => route.name === initialName(model)) : 0;

      return index === state.index ? unhandled(state) : accepted({ ...state, index });
    }

    if (state.index === 0) { return unhandled(state); }

    let index = action.type === 'POP_TO_TOP' ? 0 : Math.max(0, state.index - countOf(action));

    if (action.type === 'DISMISS') {
      let remaining = countOf(action);

      index = state.index;

      while (index > 0 && remaining > 0) {
        const key = state.routes[index].key;

        while (index > 0 && state.routes[index - 1].key === key) { index--; }

        index--; remaining--;
      }
    }

    return accepted({ ...state, routes: state.routes.slice(0, index + 1), index });
  }

  if (!('payload' in action) || !('name' in action.payload)) { return unhandled(state); }

  const { name, params, merge } = action.payload;

  if (params !== undefined && (params === null || typeof params !== 'object' || Array.isArray(params))) { throw new Error('Route params must be an object.'); }

  const definition = model.routes.find(route => route.name === name);

  if (definition === undefined) { return unhandled(state); }

  if (state.type === 'tab') {
    if (!['NAVIGATE', 'JUMP_TO'].includes(action.type)) { return unhandled(state); }

    const index = state.routes.findIndex(route => route.name === name);
    const previous = state.routes[index];
    let next = makeRoute(model, name, params === undefined ? previous.params : merge === true ? { ...previous.params, ...params } : params, previous.key);

    if (!model.children.has(name) || params === undefined) { next = { ...next, ...previous.state === undefined ? {} : { state: previous.state } }; }

    const behavior = configValue(model, 'backBehavior') ?? 'firstRoute';
    const history = index === state.index
      ? [...(state.history ?? []).slice(0, -1),
          { type: 'route' as const, key: next.key, ...next.params === undefined ? {} : { params: next.params } },
        ]
      : [
          ...(behavior === 'history' ? (state.history ?? []).filter(entry => entry.key !== next.key) : state.history ?? []),
          { type: 'route' as const, key: next.key, ...next.params === undefined ? {} : { params: next.params } },
        ];

    return accepted({ ...state, index, routes: state.routes.map((route, at) => at === index ? next : route), history });
  }

  if (action.type === 'JUMP_TO') { return unhandled(state); }

  const getId = definition.config.getId;
  const identity = (routeParams: object | undefined): unknown => typeof getId === 'function' ? Reflect.apply(getId, undefined, [{ params: routeParams }]) : undefined;
  const id = identity(paramsOf(definition, params));
  const match = state.routes.findLastIndex(route => route.name === name && (id === undefined || identity(route.params) === id));
  const pop = action.type === 'POP_TO' || (action.type === 'NAVIGATE' && 'pop' in action.payload && action.payload.pop === true);
  const same = action.type === 'NAVIGATE' && ((current.name === name && (id === undefined || identity(current.params) === id)) || (id !== undefined && match >= 0));
  let index = state.index;
  let routes = [...state.routes.slice(0, index + 1)];

  if (pop && match >= 0) { index = match; routes = routes.slice(0, index + 1); } else if (same && match >= 0) { index = match; routes = routes.slice(0, index + 1); } else if (action.type !== 'REPLACE' && action.type !== 'POP_TO') { index++; }

  const previous = routes[index];
  const next = makeRoute(model, name, merge === true ? { ...previous?.params, ...params } : params,
    previous?.name === name && action.type !== 'PUSH' && action.type !== 'REPLACE' ? previous.key : newKey(state, name));

  routes[index] = params === undefined && previous?.name === name && previous.state !== undefined ? { ...next, state: previous.state } : next;

  return accepted({ ...state, index, routes: routes.slice(0, index + 1) });
}

/** Actions are offered to the focused child, then bubble through containing navigators. */
export function reduce(model: Model, state: NavigationState, action: NavigationAction): Reduction {
  copyData(action);

  if (action.target !== undefined && action.target !== model.key && action.target !== configValue(model, 'id')) {
    const target = modelAt(model, action.target);
    const before = target === undefined ? undefined : stateAt(state, target.key);

    if (target === undefined || before === undefined) { return unhandled(state); }

    const child = ownReduction(target, before, action);

    return child.handled ? accepted(replaceState(state, target.key, child.state)) : unhandled(state);
  }

  if (action.target === undefined) {
    const current = focused(state);
    const childModel = model.children.get(current.name);

    if (childModel !== undefined && current.state !== undefined) {
      const child = reduce(childModel, current.state, action);

      if (child.handled) { return accepted({ ...state, routes: state.routes.map((route, index) => index === state.index ? { ...route, state: child.state } : route) }); }
    }
  }

  return ownReduction(model, state, action);
}

const identities = new WeakMap<NavigationState, string>();

/** Route names and router kind are static; the fingerprint covers mutable logical state only. */
export function stateIdentity(state: NavigationState): string {
  const existing = identities.get(state);

  if (existing !== undefined) { return existing; }

  const identity = JSON.stringify(copyData({ key: state.key, index: state.index,
    routes: state.routes.map(route => ({ key: route.key, name: route.name,
      ...route.params === undefined ? {} : { params: route.params },
      ...route.state === undefined ? {} : { state: stateIdentity(route.state) },
    })), ...state.history === undefined ? {} : { history: state.history },
  }));

  identities.set(state, identity);

  return identity;
}
