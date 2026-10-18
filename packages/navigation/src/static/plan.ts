import { childElements, type JSX } from '@bedrock-core/ui-runtime';
import type { NavigationState } from './common';
import type { Controller, PageScope } from './controller';
import { LINK_ACTION, type LinkAction } from './context';
import { isNavigationAction } from './actions';
import { copyData } from './definitions';
import { focused, initialState, leaf, modelAt, stateAt, stateIdentity, type Model, type StateInput } from './state';

export interface Body {
  readonly id: string;
  readonly model: string;
  readonly name: string;
  readonly params?: object;
  readonly base: boolean;
}
export interface NativeContext {
  readonly via: readonly string[];
  readonly origin?: string;
  readonly body?: string;
}
export interface NativePlan {
  readonly v: 1;
  readonly bodies: readonly Body[];
  readonly contexts: readonly NativeContext[];
  readonly edges: Readonly<Record<string, number>>;
}
export interface Press {
  readonly id: string;
  readonly body: Body;
  readonly element: JSX.Element;
  readonly link?: LinkAction;
}
export interface BodyTree { readonly body: Body; readonly element: JSX.Element; readonly presses: readonly Press[] }

export function baseBodies(model: Model): readonly Body[] {
  const bodies: Body[] = [];

  const visit = (model: Model): void => {
    for (const definition of model.routes) {
      const child = model.children.get(definition.name);

      if (child !== undefined) { visit(child); } else if (typeof definition.source === 'function') {
        bodies.push({ id: `page_${bodies.length}`, model: model.key, name: definition.name,
          ...typeof definition.config.initialParams !== 'object' || definition.config.initialParams === null ? {} : { params: copyData(definition.config.initialParams) }, base: true });
      }
    }
  };

  visit(model);

  return bodies;
}

export function scopeOf(controller: Controller, body: Body, params = bodyParams(controller, body)): PageScope {
  const model = modelAt(controller.model, body.model)!;
  const definition = model.routes.find(route => route.name === body.name)!;

  return { model, definition, body: body.id, route: {
    get key(): string { return stateAt(controller.state, model.key)?.routes.findLast(route => route.name === body.name)?.key ?? `${body.model}/${body.name}:0`; },
    name: body.name, ...params === undefined ? {} : { params: copyData(params) },
  } };
}

export function bodyParams(controller: Controller, body: Body): object | undefined {
  const route = body.base ? stateAt(controller.state, body.model)?.routes.findLast(route => route.name === body.name) : undefined;

  return route === undefined ? body.params : route.params;
}

export function bodyMatches(controller: Controller, body: Body, state: NavigationState): boolean {
  const scope = activeScope(controller.model, state);

  return scope.model.key === body.model && scope.name === body.name
    && JSON.stringify(bodyParams(controller, body)) === JSON.stringify(scope.params);
}

export function activeScope(model: Model, state: NavigationState): { readonly model: Model; readonly name: string; readonly params?: object } {
  let owner = model; let route = focused(state);

  while (route.state !== undefined) { owner = owner.children.get(route.name)!; route = focused(route.state); }

  return { model: owner, name: route.name, params: route.params };
}

export function stateForBody(model: Model, body: Body): NavigationState {
  const chain: { name: string; params?: object }[] = [{ name: body.name, ...body.params === undefined ? {} : { params: body.params } }];
  let at = modelAt(model, body.model)!;

  while (at.parent !== undefined) { chain.unshift({ name: at.parentRoute! }); at = at.parent; }

  let nested: StateInput | undefined;

  for (const route of chain.toReversed()) { nested = { routes: [{ ...route, ...nested === undefined ? {} : { state: nested } }] }; }

  return initialState(model, nested);
}

export function readBodyTrees(children: readonly JSX.Element[], bodies: readonly Body[]): readonly BodyTree[] {
  const roots = new Map<string, JSX.Element>();
  const pending = [...children];

  while (pending.length > 0) {
    const element = pending.pop()!;

    if (typeof element.props.__navigationBody === 'string') { roots.set(element.props.__navigationBody, element); } else { pending.push(...childElements(element.props.children)); }
  }

  return bodies.flatMap((body): BodyTree[] => {
    const element = roots.get(body.id);

    if (element === undefined) { return []; }

    const presses: Press[] = [];

    const pending = [element];

    while (pending.length > 0) {
      const element = pending.pop()!;

      if (element.type === 'button') {
        const handler = element.props.onPress;
        const description: unknown = typeof handler === 'function' ? Reflect.get(handler, LINK_ACTION) : undefined;
        const link = isLinkAction(description) ? description : undefined;

        presses.push({ id: `${body.id}/${presses.length}`, body, element, link });
      } else { pending.push(...childElements(element.props.children).toReversed()); }
    }

    return [{ body, element, presses }];
  });
}

function isLinkAction(value: unknown): value is LinkAction {
  return value !== null && typeof value === 'object' && 'action' in value && isNavigationAction(value.action)
    && 'scope' in value && typeof value.scope === 'string' && 'server' in value && typeof value.server === 'boolean';
}

const sameParams = (a: object | undefined, b: object | undefined): boolean => JSON.stringify(a) === JSON.stringify(b);

export const edgeKey = (index: number, press: string): string => `${index}:${press}`;

/** One bounded context graph covers the complete nested tree, including every tab's stack. */
export function preparePlan(controller: Controller, trees: readonly BodyTree[], bodies: readonly Body[]): NativePlan {
  const contexts: NativeContext[] = [{ via: [] }];
  const canonical: (NavigationState | undefined)[] = [undefined];
  const indexes = new Map<string, number>();
  const seeds = new Map<string, string>();
  const edges: Record<string, number> = {};
  const records = [...bodies];
  const byId = new Map(trees.map(tree => [tree.body.id, tree]));
  const options = controller.options.clientNavigation;
  const maxStates = options?.maxStates ?? 64; const maxDepth = options?.maxDepth ?? 2;

  if (!Number.isSafeInteger(maxStates) || maxStates < 1 || !Number.isSafeInteger(maxDepth) || maxDepth < 0) {
    throw new Error('Client navigation requires positive maxStates and nonnegative maxDepth integers.');
  }

  const bodyFor = (state: NavigationState): Body | undefined => {
    const scope = activeScope(controller.model, state);
    const existing = records.find(body => body.model === scope.model.key && body.name === scope.name && sameParams(body.params, scope.params));

    if (existing !== undefined) { return existing; }

    const base = records.find(body => body.base && body.model === scope.model.key && body.name === scope.name);

    if (base === undefined) { return undefined; }

    const body: Body = { ...base, id: `page_${records.length}`, base: false, ...scope.params === undefined ? {} : { params: copyData(scope.params) } };

    records.push(body);

    return body;
  };

  const intern = (state: NavigationState, via: readonly string[], origin: Body): number | undefined => {
    const seed = seeds.get(origin.id) ?? stateIdentity(stateForBody(controller.model, origin));

    seeds.set(origin.id, seed);
    const identity = stateIdentity(state);

    if (identity === seed) { return 0; }

    const key = `${origin.id}:${identity}`;
    const found = indexes.get(key);

    if (found !== undefined) { return found; }

    if (contexts.length >= maxStates || via.length > maxDepth) { return undefined; }

    const body = bodyFor(state);

    if (body === undefined) { return undefined; }

    const index = contexts.length;

    indexes.set(key, index);
    contexts.push({ via, origin: origin.id, body: body.id }); canonical.push(state);

    return index;
  };

  const transition = (index: number, state: NavigationState, origin: Body, press: Press): void => {
    if (press.link === undefined || press.link.server || options?.mode === 'server') { return; }

    const scope = scopeOf(controller, press.body);

    if (controller.serverOnly(scope.model, scope.route.name)) { return; }

    let next: NavigationState | undefined;

    try { next = controller.reduction(state, press.link.action, press.link.scope); } catch { return; }

    if (next === undefined || controller.external(next) !== undefined) { return; }

    const destination = activeScope(controller.model, next);

    if (controller.serverOnly(destination.model, destination.name)) { return; }

    const target = intern(next, [...contexts[index].via, press.id], origin);

    if (target === undefined) {
      if (options?.fallback === 'error') { throw new Error(`Client navigation budget exceeded by ${press.body.name}.`); }

      return;
    }

    edges[edgeKey(index, press.id)] = target;
  };

  const initial = leaf(initialState(controller.model));
  const origins = records.filter(body => body.base).toSorted((a, b) => Number(b.name === initial.name) - Number(a.name === initial.name));
  let expanded = 1;

  for (const origin of origins) {
    const tree = byId.get(origin.id);

    if (tree === undefined) { continue; }

    const state = stateForBody(controller.model, origin);

    for (const press of tree.presses) { transition(0, state, origin, press); }

    // Fill the entry's bounded paths before spending the budget on other server entries.
    for (; expanded < contexts.length; expanded++) {
      const context = contexts[expanded];
      const tree = byId.get(context.body!);

      if (tree === undefined) { continue; }

      const origin = records.find(body => body.id === context.origin)!;

      for (const press of tree.presses) { transition(expanded, canonical[expanded]!, origin, press); }
    }
  }

  return { v: 1, bodies: records, contexts, edges };
}

export function replayPlan(controller: Controller, plan: NativePlan, presses: ReadonlyMap<string, Press>): readonly (NavigationState | undefined)[] {
  return plan.contexts.map((context) => {
    let state: NavigationState | undefined = controller.state;

    for (const id of context.via) {
      const press = presses.get(id);

      if (press?.link === undefined || state === undefined) { return undefined; }

      try { state = controller.reduction(state, press.link.action, press.link.scope); } catch { return undefined; }
    }

    return state;
  });
}

export function isNativePlan(value: unknown): value is NativePlan {
  return value !== null && typeof value === 'object' && 'v' in value && value.v === 1 && 'bodies' in value && Array.isArray(value.bodies)
    && 'contexts' in value && Array.isArray(value.contexts) && 'edges' in value && typeof value.edges === 'object';
}
