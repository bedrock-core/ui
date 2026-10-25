import { childElements, type JSX } from '@bedrock-core/ui-runtime';
import type { NavigationState } from './common';
import type { Controller, PageScope } from './controller';
import { LINK_ACTION, type LinkAction } from './context';
import { isNavigationAction } from './actions';
import { copyData } from './definitions';
import { focused, initialState, modelAt, stateAt, stateIdentity, restoreState, isNavigationState, type Model, type StateInput } from './state';

export interface Body {
  readonly id: string;
  readonly model: string;
  readonly name: string;
  readonly params?: object;
  readonly base: boolean;
}
export interface NativeContext {
  readonly body?: string;
  readonly state?: NavigationState;
  /** Actions replayed over the confirmed entry so its saved ancestors remain intact. */
  readonly checkpoint?: { readonly entry: string; readonly presses: readonly string[] };
}
export interface NativePlan {
  readonly v: 3;
  readonly closed: boolean;
  readonly bodies: readonly Body[];
  readonly contexts: readonly NativeContext[];
  readonly edges: Readonly<Record<string, number>>;
  readonly entryEdges: Readonly<Record<string, readonly number[]>>;
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

/** Counts retained stack entries and tab visits across the complete navigation tree. */
function historyDepth(state: NavigationState): number {
  const own = state.type === 'stack' ? state.routes.length - 1 : Math.max(0, (state.history?.length ?? 1) - 1);

  return own + state.routes.reduce((depth, route) => depth + (route.state === undefined ? 0 : historyDepth(route.state)), 0);
}

/** One native graph supports preserved application history and bounded reading history. */
export function preparePlan(controller: Controller, trees: readonly BodyTree[], bodies: readonly Body[]): NativePlan {
  const contexts: NativeContext[] = [{}];
  const indexes = new Map<string, number>();
  const edges: Record<string, number> = {};
  const entryEdges = new Map<string, Set<number>>();
  const records = [...bodies];
  const byId = new Map(trees.map(tree => [tree.body.id, tree]));
  const options = controller.options.clientNavigation;
  const anchored = options?.history !== 'recent';
  const maxStates = options?.maxStates ?? 128;
  const maxDepth = options?.maxDepth ?? 5;
  const flat = controller.model.definition.type === 'stack' && controller.model.children.size === 0
    && controller.model.routes.every(route => route.config.initialParams === undefined && route.config.if === undefined);

  if (!Number.isSafeInteger(maxStates) || maxStates < 1) { throw new Error('Client navigation requires a positive maxStates integer.'); }

  if (!Number.isSafeInteger(maxDepth) || maxDepth < 0) { throw new Error('Client navigation requires a nonnegative maxDepth integer.'); }

  const exceeded = (): undefined => {
    if (options?.fallback === 'error') { throw new Error('Client navigation budget exceeded.'); }

    return undefined;
  };

  const plainReplacement = (press: Press): boolean => {
    const link = press.link;
    const action = link?.action;

    return flat && link !== undefined && !link.server && link.scope === controller.model.key && press.body.model === controller.model.key
      && action?.type === 'REPLACE' && action.source === undefined && action.target === undefined
      && action.payload.params === undefined && action.payload.name !== press.body.name
      && records.some(body => body.base && body.name === action.payload.name)
      && !controller.serverOnly(controller.model, press.body.name) && !controller.serverOnly(controller.model, action.payload.name);
  };

  const replacements = trees.flatMap(tree => tree.presses).filter(plainReplacement);

  const sharedRecipe = (press: Press): { kind: string; presses: readonly string[] } | undefined => {
    const action = press.link?.action;

    if (!anchored || !flat || action === undefined || action.source !== undefined || action.target !== undefined || press.link?.scope !== controller.model.key) { return undefined; }

    if (plainReplacement(press) && action.type === 'REPLACE') {
      const detour = replacements.find(other => other.link?.action.type === 'REPLACE' && other.link.action.payload.name !== action.payload.name);

      // Replacements mint a route key even when they return to the entry page.
      return detour === undefined ? undefined : { kind: 'replace', presses: [detour.id, press.id] };
    }

    if (action.type === 'RESET' && action.payload.routes.length === 1 && (action.payload.index ?? 0) === 0) {
      const route = action.payload.routes[0];

      if (route.params === undefined && route.state === undefined && records.some(body => body.base && body.name === route.name)) { return { kind: 'reset', presses: [press.id] }; }
    }

    return undefined;
  };

  const bodyFor = (state: NavigationState): Body | undefined => {
    const scope = activeScope(controller.model, state);
    const existing = records.find(body => body.model === scope.model.key && body.name === scope.name && sameParams(body.params, scope.params));

    if (existing !== undefined) { return existing; }

    const base = records.find(body => body.base && body.model === scope.model.key && body.name === scope.name);

    if (base === undefined) { return undefined; }

    const body: Body = { ...base, id: 'page_' + records.length, base: false, ...scope.params === undefined ? {} : { params: copyData(scope.params) } };

    records.push(body);

    return body;
  };

  const intern = (state: NavigationState, origin: Body, presses: readonly string[], press?: Press): number | undefined => {
    const identity = stateIdentity(state);
    const shared = press !== undefined && historyDepth(state) === 0 ? sharedRecipe(press) : undefined;

    if (anchored && shared === undefined && identity === stateIdentity(stateForBody(controller.model, origin))) { return 0; }

    const key = (anchored ? shared?.kind ?? origin.id : 'snapshot') + ':' + identity;
    const existing = indexes.get(key);

    if (existing !== undefined) { return existing; }

    if (contexts.length >= maxStates) { return exceeded(); }

    const body = bodyFor(state);

    if (body === undefined) { return undefined; }

    const index = contexts.length;

    indexes.set(key, index);
    contexts.push({ body: body.id, state: copyData(state), ...anchored ? { checkpoint: { entry: origin.id, presses: shared?.presses ?? presses } } : {} });

    return index;
  };

  interface Transition { readonly from: number; readonly state: NavigationState; readonly press: Press }
  const initial = activeScope(controller.model, initialState(controller.model));
  const roots = bodies.filter(body => body.base).toSorted((a, b) => Number(b.model === initial.model.key && b.name === initial.name) - Number(a.model === initial.model.key && a.name === initial.name))
    .map(body => ({ body, state: stateForBody(controller.model, body) }));

  if (!anchored) {
    for (const entry of options?.entryStates ?? []) {
      const state = controller.reduction(controller.state, { type: 'RESET', payload: entry });
      const body = state === undefined ? undefined : bodyFor(state);

      if (state !== undefined && body !== undefined) { roots.push({ body, state }); }
    }
  }

  const expanded = new Set<number>();

  for (const origin of roots) {
    const pending = new Map<number, { items: Transition[]; cursor: number }>();

    const schedule = (from: number, state: NavigationState): void => {
      const body = bodyFor(state);
      const tree = body === undefined ? undefined : byId.get(body.id);

      if (tree === undefined || options?.mode === 'server') { return; }

      for (const press of tree.presses) {
        if (press.link === undefined || press.link.server) { continue; }

        const source = activeScope(controller.model, state);

        if (controller.serverOnly(source.model, source.name)) { continue; }

        let next: NavigationState | undefined;

        try { next = controller.reduction(state, press.link.action, press.link.scope); } catch { continue; }

        if (next === undefined || controller.external(next) !== undefined) { continue; }

        const destination = activeScope(controller.model, next);

        if (controller.serverOnly(destination.model, destination.name)) { continue; }

        const depth = historyDepth(next);

        if (depth > maxDepth) { exceeded(); continue; }

        const queue = pending.get(depth) ?? { items: [], cursor: 0 };

        queue.items.push({ from, state: next, press }); pending.set(depth, queue);
      }
    };

    const start = anchored ? 0 : intern(origin.state, origin.body, []);

    if (start === undefined) { continue; }

    if (anchored || !expanded.has(start)) { schedule(start, origin.state); expanded.add(start); }

    while (pending.size > 0) {
      const depth = Math.min(...pending.keys());
      const queue = pending.get(depth)!;
      const { from, state, press } = queue.items[queue.cursor++];

      if (queue.cursor === queue.items.length) { pending.delete(depth); }

      const path = contexts[from].checkpoint?.presses ?? [];
      const target = intern(state, origin.body, [...path, press.id], press);

      if (target === undefined) { continue; }

      edges[edgeKey(from, press.id)] = target;
      const entries = entryEdges.get(press.id) ?? new Set<number>();

      entries.add(target); entryEdges.set(press.id, entries);

      if (target !== 0 && !expanded.has(target)) { schedule(target, contexts[target].state!); expanded.add(target); }
    }
  }

  const closed = !anchored && options?.fallback === 'error' && options.mode !== 'server' && flat
    && records.every(body => body.params === undefined) && controller.model.routes.every(route => route.config.getId === undefined);

  return { v: 3, closed, bodies: records, contexts, edges, entryEdges: Object.fromEntries([...entryEdges].map(([press, targets]) => [press, [...targets]])) };
}

/** Restores declared snapshots or materializes actions over the current server checkpoint. */
export function replayPlan(controller: Controller, plan: NativePlan, presses: ReadonlyMap<string, Press>): readonly (NavigationState | undefined)[] {
  if (plan.closed && controller.external(controller.state) === undefined && !plan.contexts.some(context => context.state !== undefined && stateIdentity(context.state) === stateIdentity(controller.state))) { throw new Error('Uncompiled client navigation history. Declare entryStates or use server fallback.'); }

  return plan.contexts.map((context, index) => {
    if (index === 0) { return controller.state; }

    if (context.checkpoint === undefined) { return restoreState(controller.model, context.state); }

    let state: NavigationState | undefined = controller.state;

    for (const id of context.checkpoint.presses) {
      const press = presses.get(id);

      if (press?.link === undefined || state === undefined) { return undefined; }

      try { state = controller.reduction(state, press.link.action, press.link.scope); } catch { return undefined; }
    }

    return state;
  });
}

export function isNativePlan(value: unknown): value is NativePlan {
  return value !== null && typeof value === 'object' && 'v' in value && value.v === 3 && 'closed' in value && typeof value.closed === 'boolean'
    && 'bodies' in value && Array.isArray(value.bodies) && 'contexts' in value && Array.isArray(value.contexts)
    && 'edges' in value && value.edges !== null && typeof value.edges === 'object'
    && 'entryEdges' in value && value.entryEdges !== null && typeof value.entryEdges === 'object'
    && value.contexts.slice(1).every((context: unknown) => context !== null && typeof context === 'object' && 'state' in context && isNavigationState(context.state));
}
