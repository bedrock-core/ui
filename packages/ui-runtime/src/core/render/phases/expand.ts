import type { JSX } from '../../../jsx';
import { activateFiber, createFiber, getFiber, isContextProvider, type Owner } from '../../fabric';
import type { Fiber } from '../../fabric/types';
import { childElements } from '../../guards';
import { generateComponentId, type TraversalContext } from '../traversal';
import { TREE_BOUNDARY_TYPE } from '../../../components/TreeBoundary';
import { cacheableProps, isCompiledPure } from '../compiler';

/** Bound recursive component definitions without exhausting the game's JavaScript stack. */
const MAX_COMPONENT_DEPTH = 1_024;

interface Expansion {
  element: JSX.Element;
  context: TraversalContext;
  output: JSX.Element[];
  index: number;
  finish?: () => JSX.Element;
}

/**
 * Expand components and providers in depth-first order using an explicit work stack.
 * Component nesting consumes heap space rather than JavaScript call frames. Each
 * descendant's identity includes its parent's key, and sibling linking is linear.
 */
export function expandAndResolveContexts(element: JSX.Element, context: TraversalContext, owner: Owner): JSX.Element {
  const result: JSX.Element[] = [];
  const pending: Expansion[] = [{ element, context, output: result, index: 0 }];
  const tails = new Map<Fiber, Fiber>();

  while (pending.length) {
    const task = pending.pop()!;

    if (task.finish !== undefined) {
      pending.push({ ...task, element: task.finish(), finish: undefined });
      continue;
    }

    const node = task.element;
    const scope = task.context;

    if (node.type === TREE_BOUNDARY_TYPE) {
      const transform = node.props.transform;

      if (typeof transform !== 'function') { throw new Error('TreeBoundary requires a transform function.'); }

      const children: JSX.Element[] = [];

      pending.push({ ...task, finish: () => Reflect.apply(transform, undefined, [children]) });
      const inputs = childElements(node.props.children);

      for (let index = inputs.length - 1; index >= 0; index--) {
        pending.push({ element: inputs[index], context: scope, output: children, index });
      }

      continue;
    }

    if (typeof node.type === 'function') {
      if (scope.parentPath.length >= MAX_COMPONENT_DEPTH) {
        throw new Error(`Component nesting exceeds ${String(MAX_COMPONENT_DEPTH)} levels. Check for a component rendering itself recursively.`);
      }

      const component = node.type;
      const name = component.name || 'anonymous';
      const rawKey = node.props.key;
      let key = typeof rawKey === 'string' || typeof rawKey === 'number' ? String(rawKey) : undefined;

      if (!key) {
        const path = [...scope.parentPath, name].join('/');
        const count = scope.idCounters.get(path) ?? 0;

        key = `__auto_${count}`;
        scope.idCounters.set(path, count + 1);
      }

      const id = generateComponentId(owner, component, key, scope.parentPath);

      if (scope.visited.has(id)) {
        throw new Error(`Duplicate component identity '${id}'. Use distinct keys for sibling components.`);
      }

      const fiber = getFiber(id) ?? createFiber(id, owner);
      const parent = scope.parentFiber;

      scope.visited.add(id);
      fiber.parent = parent;
      fiber.sibling = undefined;

      if (parent) {
        const tail = tails.get(parent);

        if (tail) {
          tail.sibling = fiber;
          fiber.index = tail.index + 1;
        } else {
          parent.child = fiber;
          fiber.index = 0;
        }

        tails.set(parent, fiber);
      } else {
        fiber.index = 0;
      }

      fiber.contextSnapshot = scope.currentContext;
      fiber.compilerCacheEnabled = scope.memoize === true;

      const memoized = scope.memoize === true && isCompiledPure(component) && cacheableProps(node.props, component);
      const cached = fiber.memoCache;
      let rendered: JSX.Element;

      if (memoized && cached?.component === component && cached.stateVersion === fiber.stateVersion
        && sameProps(cached.props, node.props) && sameContext(fiber, scope)) {
        rendered = cached.rendered;
      } else {
        fiber.memoCache = undefined;
        rendered = activateFiber(fiber, () => {
          const stateVersion = fiber.stateVersion;
          const props = memoized ? { ...node.props } : undefined;
          const output = component(node.props);

          if (props && !fiber.memoUnsafe) {
            fiber.memoCache = { component, props, rendered: output, stateVersion };
          }

          return output;
        });
      }

      pending.push({ ...task, element: rendered, context: {
        ...scope,
        parentPath: [...scope.parentPath, `${name}:${key}`],
        parentFiber: fiber,
      } });

      continue;
    }

    let childScope = scope;
    let output: JSX.Element;

    if (isContextProvider(node)) {
      const values = new Map(scope.currentContext);

      values.set(node.props.__context, node.props.value);
      childScope = { ...scope, currentContext: values };
      output = { type: 'fragment', props: { children: [] } };
    } else {
      output = { type: node.type, nativeArgs: node.nativeArgs, props: { ...node.props, children: [] } };
    }

    const children: JSX.Element[] = [];

    output.props.children = children;
    task.output[task.index] = output;

    const inputs = childElements(node.props.children);

    for (let index = inputs.length - 1; index >= 0; index--) {
      pending.push({ element: inputs[index], context: childScope, output: children, index });
    }
  }

  return result[0];
}

/** Prop values use reference equality; copying the outer props also detects replaced fields. */
function sameProps(previous: JSX.Props, next: JSX.Props): boolean {
  const keys = Object.keys(previous);

  return keys.length === Object.keys(next).length
    && keys.every(key => Object.hasOwn(next, key) && Object.is(previous[key], next[key]));
}

/** Only contexts read by this component affect its cached output. */
function sameContext(fiber: Fiber, scope: TraversalContext): boolean {
  return fiber.hookStates.every(slot => slot.context === undefined
    || Object.is(slot.value, scope.currentContext.get(slot.context) ?? slot.context.defaultValue));
}
