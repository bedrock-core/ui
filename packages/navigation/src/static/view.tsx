/** @jsxImportSource @bedrock-core/ui-runtime */
import {
  Button, Panel, SelectionPanel, Swap, Text, TreeBoundary, resolveStateBackgrounds,
  withCompileData, childElements, MODAL_FORM_SLOT_TYPE, CONTAINER_TYPE,
  type DisplayText, type JSX, type PressEvent,
} from '@bedrock-core/ui-runtime';
import type { NavigationAction, NavigationListeners, NavigationState } from './common';
import { Link } from './api';
import { NavigationContext } from './context';
import type { Controller, PageScope } from './controller';
import {
  activeScope, bodyMatches, bodyParams, edgeKey, preparePlan, readBodyTrees, replayPlan, scopeOf, stateForBody,
  type Body, type BodyTree, type NativePlan, type Press,
} from './plan';
import { stateAt, stateIdentity, type Model } from './state';
import type { TopTabNavigationOptions } from './tabs';
import { copyData } from './definitions';
import { navigatorLayout } from './factory';

const full = { position: 'absolute' as const, left: 0, top: 0, right: 0, bottom: 0 };
// eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- JSX stores callbacks opaquely; the expander supplies the route props validated by the static definition
const element = (component: (props: never) => JSX.Element, props: Record<string, unknown>): JSX.Element => ({ type: component as JSX.Element['type'], props });

/** Expanded pages may have deeply nested layout containers. */
function mapTree(root: JSX.Element, transform: (node: JSX.Element, children: JSX.Element[]) => JSX.Element,
  stop: (node: JSX.Element) => boolean = () => false): JSX.Element {
  const pending: { node: JSX.Element; ready: boolean }[] = [{ node: root, ready: false }];
  const mapped = new Map<JSX.Element, JSX.Element>();

  while (pending.length > 0) {
    const { node, ready } = pending.pop()!;
    const children = stop(node) ? [] : childElements(node.props.children);

    if (ready) { mapped.set(node, transform(node, children.map(child => mapped.get(child)!))); } else { pending.push({ node, ready: true }, ...children.toReversed().map(node => ({ node, ready: false }))); }
  }

  return mapped.get(root)!;
}

function HeaderBack({ scope }: { scope: string }): JSX.Element {
  const button = Link({ action: { type: 'GO_BACK' }, width: 42, height: 22, children: <Text>{'Back'}</Text> });

  return { ...button, props: { ...button.props, __navigationBackScope: scope } };
}

function headerSizer(children: readonly JSX.Element[]): JSX.Element {
  const measure = (node: JSX.Element, children: JSX.Element[]): JSX.Element => {
    const { testId: _id, testName: _name, testRole: _role, __testName: _internalName, __testRole: _internalRole, onPress: _press, ...props } = node.props;

    return { ...node, type: node.type === 'button' || node.type === 'swap-slot' || node.type === 'swap-look-slot' ? 'panel' : node.type,
      props: { ...props, visible: false, children } };
  };

  return Panel({ width: '100%', visible: false, children: children.map(child => mapTree(child, measure)) });
}

function header(controller: Controller, page: PageScope): JSX.Element | undefined {
  const options = controller.optionsFor(page);

  if (options.headerShown === false || (options.headerShown === undefined && page.model.definition.type === 'tab')) { return undefined; }

  const canBack = controller.canGoBack(controller.state, page.model.key);
  const props = { route: page.route, options, backAction: { type: 'GO_BACK' as const }, ...canBack ? { back: {} } : {} };

  const render = (canBack: boolean): JSX.Element => {
    const variants = { route: props.route, options: props.options, backAction: props.backAction, ...canBack ? { back: {} } : {} };

    if (options.header !== undefined) { return options.header(variants); }

    const title = options.headerTitle ?? options.title ?? page.route.name;

    return (
      <Panel flexDirection={'row'} height={24} width={'100%'} alignItems={'center'}>
        {options.headerLeft !== undefined
          ? options.headerLeft(variants)
          : Reflect.get(options, 'headerBackVisible') !== false ? <HeaderBack scope={page.model.key} /> : undefined}
        <Panel flexGrow={1}>{typeof title === 'function' ? title({ children: options.title ?? page.route.name }) : <Text maxLength={80}>{title}</Text>}</Panel>
        {options.headerRight?.(variants)}
      </Panel>
    );
  };

  if (options.header !== undefined || options.headerLeft !== undefined || options.headerRight !== undefined) {
    const withBack = render(true);
    const withoutBack = render(false);

    const variant = (back: boolean, child: JSX.Element): JSX.Element => {
      const panel = Panel({ ...full, children: child });

      return { ...panel, props: { ...panel.props, __navigationHeader: { scope: page.model.key, back } } };
    };

    return Panel({ width: '100%', children: [
      <TreeBoundary key={`${page.model.key}_header_size`} transform={headerSizer}>{withBack}</TreeBoundary>,
      variant(true, withBack), variant(false, withoutBack),
    ] });
  }

  return render(canBack);
}

function topBar(controller: Controller, model: Model, selected: string): JSX.Element {
  const state = controller.getState(model.key);
  const routes = model.routes.map((definition) => {
    const found = state.routes.find(route => route.name === definition.name);

    return found ?? { key: `${model.key}/${definition.name}:0`, name: definition.name, params: undefined };
  });
  const index = routes.findIndex(route => route.name === selected);
  const descriptors: Record<string, { options: TopTabNavigationOptions }> = {};
  const actions: Record<string, NavigationAction> = {};

  for (const route of routes) {
    const definition = model.routes.find(definition => definition.name === route.name)!;

    descriptors[route.key] = { options: controller.optionsFor({ model, definition, body: '', route }) };
    actions[route.name] = { type: 'JUMP_TO', target: model.key, payload: { name: route.name } };
  }

  const props = { state: { ...state, index, routes, type: 'tab' as const, history: state.history ?? [] }, descriptors,
    actions, navigation: controller.navigation(undefined, model.key) };
  const custom = Reflect.get(model.definition.config, 'tabBar');

  if (typeof custom === 'function') { return Reflect.apply(custom, undefined, [props]); }

  return (
    <Panel height={26} width={'100%'} flexDirection={'row'} alignItems={'stretch'}>
      {routes.map((route) => {
        const options = descriptors[route.key].options;
        const selected = routes[index]?.key === route.key;
        const label: DisplayText = options.tabBarLabel ?? options.title ?? route.name;
        const caption: DisplayText = { rawtext: [{ text: selected ? '§l' : '§r' }, typeof label === 'string' ? { translate: label } : label] };

        return (
          <Link key={route.key} action={actions[route.name]} flexGrow={1} height={24}>
            <Panel flexDirection={'row'} alignItems={'center'} justifyContent={'center'}>
              {options.tabBarIcon?.({ focused: selected, size: 16 })}
              {options.tabBarShowLabel === false ? undefined : <Text maxLength={80}>{caption}</Text>}
              {options.tabBarBadge === undefined ? undefined : <Text maxLength={12}>{String(options.tabBarBadge)}</Text>}
            </Panel>
          </Link>
        );
      })}
    </Panel>
  );
}

function BodyPage({ controller, body, params }: { controller: Controller; body: Body; params?: object }): JSX.Element {
  const scope = scopeOf(controller, body, params);
  const levels: Array<{ page: PageScope; chrome: JSX.Element[]; layout: ReturnType<typeof navigatorLayout> }> = [];
  const chain: { model: Model; name: string }[] = [{ model: scope.model, name: scope.route.name }];
  let child = scope.model;

  while (child.parent !== undefined) { chain.unshift({ model: child.parent, name: child.parentRoute! }); child = child.parent; }

  let available = true; let conditional = false;

  for (const entry of chain) {
    const definition = entry.model.routes.find(route => route.name === entry.name)!;
    const registered = stateAt(controller.state, entry.model.key)?.routes.findLast(route => route.name === entry.name);
    const route = { key: registered?.key ?? `${entry.model.key}/${entry.name}:0`, name: entry.name,
      ...registered?.params === undefined ? {} : { params: copyData(registered.params) } };
    const page = { model: entry.model, definition, route, body: body.id };
    const layout = navigatorLayout(entry.model.definition);
    const chrome: JSX.Element[] = [];

    levels.push({ page, chrome, layout });

    for (const predicate of [definition.group?.if, definition.config.if]) {
      if (typeof predicate !== 'function') { continue; }

      conditional = true; available = Reflect.apply(predicate, undefined, []) === true && available;
    }

    if (body.base) {
      const configured = definition.config.listeners;
      const listeners: NavigationListeners = typeof configured === 'function'
        ? Reflect.apply(configured, undefined, [{ route, navigation: controller.navigation(page) }])
        : typeof configured === 'object' && configured !== null ? configured : {};
      const common: unknown = Reflect.get(entry.model.definition.config, 'screenListeners');

      controller.configure(page, { ...typeof common === 'object' && common !== null ? common : {}, ...listeners });
    }

    const head = header(controller, page);

    if (head !== undefined) { chrome.push(head); }

    if (entry.model.definition.type === 'tab') { chrome.push(topBar(controller, entry.model, entry.name)); }
  }

  if (body.base) { controller.availability.set(`${scope.model.key}/${scope.route.name}`, available); }

  const source = scope.definition.source;

  if (typeof source !== 'function') { throw new Error('A resident page requires a component.'); }

  let content = (
    <Panel flexGrow={1} width={'100%'}>
      <NavigationContext value={{ controller, page: scope }}>{element(source, { route: scope.route })}</NavigationContext>
    </Panel>
  );

  for (const { layout, page, chrome } of levels.toReversed()) {
    content = (
      <>
        <>{chrome}</>
        {content}
      </>
    );

    if (layout !== undefined) {
      content = (
        <Panel flexGrow={1} width={'100%'}>
          <NavigationContext value={{ controller, page }}>
            {element(layout, { route: page.route, navigation: controller.navigation(page), children: content })}
          </NavigationContext>
        </Panel>
      );
    }
  }

  return (
    <Panel {...full} liveVisible={conditional} visible={available}>
      {content}
    </Panel>
  );
}

export function bodyElement(controller: Controller, body: Body): JSX.Element {
  const panel = Panel({ ...full, children: element(BodyPage, { controller, body, params: bodyParams(controller, body), key: body.id }) });

  return { ...panel, props: { ...panel.props, __navigationBody: body.id } };
}

function visualInput(press: Press, target: number, group: string): JSX.Element {
  const props = press.element.props;
  const backgrounds = resolveStateBackgrounds(props);
  const face = (background: string): JSX.Element => Panel({ width: '100%', height: '100%', background });
  const normal = face(backgrounds.background); const hover = face(backgrounds.backgroundHover); const locked = face(backgrounds.backgroundLocked);

  return inputMetadata(press, Swap({ ...swapProps(props), children: [
    Swap.Look({ state: 'on', children: normal }), Swap.Look({ state: 'off', children: normal }),
    Swap.Look({ state: 'onHover', children: hover }), Swap.Look({ state: 'offHover', children: hover }),
    Swap.Look({ state: 'onLocked', children: locked }), Swap.Look({ state: 'offLocked', children: locked }),
    Swap.Look({ state: 'onLockedHover', children: locked }), Swap.Look({ state: 'offLockedHover', children: locked }),
  ], width: '100%', height: '100%', group, index: target, exclusive: true }));
}

/** Swap draws backgrounds through its looks; these Button-only props are not a second face. */
function swapProps(props: Record<string, unknown>): Record<string, unknown> {
  const { background: _rest, backgroundHover: _hover, backgroundLocked: _locked, backgroundPressed: _pressed, ...layout } = props;

  return layout;
}

function inputMetadata(press: Press, input: JSX.Element): JSX.Element {
  return { ...input, props: { ...input.props, testRole: press.element.props.testRole ?? 'button', __testCaption: press.element.props.children } };
}

function mountBody(controller: Controller, plan: NativePlan, tree: BodyTree, states: readonly (NavigationState | undefined)[], group: string): JSX.Element {
  const potential = plan.contexts.flatMap((context, index) => context.body === tree.body.id || (index === 0 && tree.body.base) ? [index] : []);
  const active = potential.filter((index) => {
    const state = states[index];

    if (state === undefined) { return false; }

    return bodyMatches(controller, tree.body, state);
  });
  const pressByElement = new Map(tree.presses.map(press => [press.element, press]));

  const replace = (node: JSX.Element, children: JSX.Element[]): JSX.Element => {
    const header = node.props.__navigationHeader;

    if (typeof header === 'object' && header !== null && 'scope' in header && typeof header.scope === 'string' && 'back' in header) {
      const { __navigationHeader: _header, ...props } = node.props;
      const allowed = active.filter(index => states[index] !== undefined && controller.canGoBack(states[index], String(header.scope)) === header.back);

      return SelectionPanel({ ...full, group, indexes: potential.length === 0 ? [0] : potential, activeIndexes: allowed,
        children: { ...node, props: { ...props, children } },
      });
    }

    const press = pressByElement.get(node);

    if (press === undefined) {
      if (node.type === MODAL_FORM_SLOT_TYPE || node.type === CONTAINER_TYPE) { throw new Error('A different screen host must be opened through a published reference route.'); }

      return { ...node, props: { ...node.props, children } };
    }

    const { children: caption, onPress: _handler, ...props } = node.props;
    const layout: object = typeof props.__layout === 'object' && props.__layout !== null ? props.__layout : {};

    const original = node.props.onPress;
    const handler = (event: PressEvent): unknown => typeof original === 'function' ? Reflect.apply(original, undefined, [event]) : undefined;

    const candidates = potential.map((index) => {
      const state = states[index];
      const target = plan.edges[edgeKey(index, press.id)];
      let local = false;

      if (target !== undefined && state !== undefined && states[target] !== undefined && press.link !== undefined && !press.link.server) {
        const source = activeScope(controller.model, state);
        const destination = activeScope(controller.model, states[target]);
        const sourceServer = controller.serverOnly(source.model, source.name);
        const targetServer = controller.serverOnly(destination.model, destination.name);
        const expected = controller.reduction(state, press.link.action, press.link.scope);
        const targetBody = plan.bodies.find(body => body.id === plan.contexts[target].body);
        const hasBody = target === 0 || (targetBody !== undefined && bodyMatches(controller, targetBody, states[target]));

        local = hasBody && !sourceServer && !targetServer && controller.options.clientNavigation?.mode !== 'server'
          && expected !== undefined && stateIdentity(expected) === stateIdentity(states[target]);
      }

      return { index, state, target, local };
    });
    const contextual = (index: number, children: JSX.Element): JSX.Element => SelectionPanel({ ...full, group, index, children });
    const localInputs = candidates.flatMap(({ index, target }) => target === undefined
      ? []
      : [contextual(index, visualInput(press, target, group))]);
    const serverInputs = candidates.map(({ index, state }) => contextual(index,
      inputMetadata(press, Button({ ...props, width: '100%', height: '100%', onPress: (event) => {
        if (state === undefined || !active.includes(index)) { return; }

        return controller.action(state, handler, event);
      } })),
    ));
    // Each press carries two membership masks, shared by all of its contextual hitboxes.
    const family = (local: boolean, children: JSX.Element[]): JSX.Element => SelectionPanel({
      ...full, group, indexes: potential.length === 0 ? [0] : potential,
      activeIndexes: candidates.filter(candidate => candidate.local === local).map(candidate => candidate.index), children,
    });
    const inputs = localInputs.length === 0 ? serverInputs : [family(true, localInputs), family(false, serverInputs)];
    const frame = Swap({ ...layout, ...swapProps(props), passive: true, hug: props.__hug === true, caption, inputs,
      children: [Swap.Look({ state: 'on' }), Swap.Look({ state: 'off' })] });

    const backScope = props.__navigationBackScope;

    if (typeof backScope === 'string') {
      const allowed = active.filter(index => states[index] !== undefined && controller.canGoBack(states[index], backScope));

      return SelectionPanel({ ...layout, visible: props.visible, enabled: props.enabled, group, indexes: potential.length === 0 ? [0] : potential, activeIndexes: allowed,
        children: { ...frame, props: { ...frame.props, __layout: { width: '100%', height: '100%' } } },
      });
    }

    return frame;
  };

  return SelectionPanel({ ...full, group, indexes: potential.length === 0 ? [0] : potential, activeIndexes: active,
    children: mapTree(tree.element, replace, node => pressByElement.has(node)) });
}

export function composeNavigation(controller: Controller, children: readonly JSX.Element[], bodies: readonly Body[], key: string, supplied?: NativePlan): JSX.Element {
  const trees = readBodyTrees(children, bodies);
  const active = activeScope(controller.model, controller.state);

  if (controller.availability.get(`${active.model.key}/${active.name}`) === false) {
    const available = bodies.find(body => body.base && controller.availability.get(`${body.model}/${body.name}`) !== false);

    if (available === undefined) { throw new Error('Navigation requires an available screen.'); }

    controller.reconcile(stateForBody(controller.model, available));
  }

  const plan = supplied ?? preparePlan(controller, trees, bodies);
  const missing = plan.bodies.filter(body => !trees.some(tree => tree.body.id === body.id));

  if (missing.length > 0) {
    return (
      <TreeBoundary key={`${key}_variants`} transform={expanded => composeNavigation(controller, expanded, plan.bodies, key)}>
        {[...children, ...missing.map(body => bodyElement(controller, body))]}
      </TreeBoundary>
    );
  }

  controller.commit();
  const presses = new Map(trees.flatMap(tree => tree.presses).map(press => [press.id, press]));
  const states = replayPlan(controller, plan, presses);
  const group = `navigation_${key.replace(/[^A-Za-z0-9_-]/g, '_')}`;
  const owners = plan.contexts.map((_, index) => Swap({ ...full, width: 0, height: 0, right: undefined, bottom: undefined,
    id: `${group}_owner_${index}`, group, index, exclusive: true, defaultOn: index === 0, passive: true,
    children: [Swap.Look({ state: 'on' }), Swap.Look({ state: 'off' })],
  }));

  return withCompileData(Panel({ width: '100%', height: '100%', liveVisible: plan.bodies.length === 0,
    children: [...owners, ...trees.map(tree => mountBody(controller, plan, tree, states, group))] }), key, plan);
}

export function RootContent({ controller, bodies, dataKey, plan }: { controller: Controller; bodies: readonly Body[]; dataKey: string; plan?: NativePlan }): JSX.Element {
  return (
    <NavigationContext value={{ controller }}>
      <TreeBoundary transform={children => composeNavigation(controller, children, bodies, dataKey, plan)}>
        {bodies.map(body => bodyElement(controller, body))}
      </TreeBoundary>
    </NavigationContext>
  );
}
