import type { Player } from '@minecraft/server';
import type { JSX } from '../../../jsx';
import { activateFiber, createFiber, getFiber, isContextProvider } from '../../fabric';
import { generateComponentId, type TraversalContext } from '../traversal';

/**
 * Phase 1: Expand function components and resolve context providers in depth-first order.
 * This ensures context is available when function components that use useContext() are called.
 *
 * CRITICAL: Each function component now gets its own instance, hooks, and lifecycle.
 * This is the core fix for per-component instance management.
 *
 * Order of operations:
 * 1. If function component → CREATE INSTANCE, push to stack, call it, pop from stack
 * 2. If context provider → push context, process children, pop context
 * 3. For regular elements → recursively process children
 *
 * @param element - Element that may have function components or context providers
 * @param context - Traversal context with player, parent path, and instance tracking
 * @param player - Player rendering the component
 * @returns Element with all function components expanded and contexts resolved
 */
export function expandAndResolveContexts(
  element: JSX.Element,
  context: TraversalContext,
  player: Player,
): JSX.Element {
  // Step 1: Handle function components - CREATE INSTANCE FOR EACH
  if (typeof element.type === 'function') {
    const componentFn = element.type;

    // Generate unique ID for this component node
    const componentName = componentFn.name || 'anonymous';
    const keyProp = typeof element.props.key === 'string' ? element.props.key : undefined;
    // Auto-generate a stable key per parent path + component name to avoid
    // sibling collisions when keys are not provided.
    let effectiveKey = keyProp;
    if (!effectiveKey) {
      const pathKey = [...context.parentPath, componentName].join('/');
      const count = context.idCounters.get(pathKey) ?? 0;
      effectiveKey = `__auto_${count}`;
      context.idCounters.set(pathKey, count + 1);
    }

    const componentId = generateComponentId(
      player,
      componentFn,
      effectiveKey,
      context.parentPath,
    );

    // Get or create instance for this component
    // Create or get the fiber for this component instance
    const fiber = getFiber(componentId) ?? createFiber(componentId, player);

    // Attach current context snapshot so hooks can read during evaluation
    fiber.contextSnapshot = context.currentContext;
    // Activate the fiber and run the component; effects flush after this call
    const renderedElement = activateFiber(fiber, () => componentFn(element.props));

    // Create child context with updated path
    const childContext: TraversalContext = {
      ...context,
      parentPath: [...context.parentPath, componentName],
    };

    // Recursively process the rendered result (visual tree)
    return expandAndResolveContexts(renderedElement, childContext, player);
  }

  // Step 2: Handle context provider - push context BEFORE processing children
  if (isContextProvider(element)) {
    const providerProps = element.props;
    const contextObj = providerProps.__context;

    const contextValue = providerProps.value;
    const contextChildren = providerProps.children;

    // Derive a child context snapshot from the parent snapshot
    const nextContext = new Map(context.currentContext);
    nextContext.set(contextObj, contextValue);

    // Modern format: detect Suspense boundary by duck-typing the provider value
    // If value is an object with a string 'id', treat it as a Suspense boundary id.
    const cv: unknown = contextValue;
    const maybeBoundary = cv && typeof cv === 'object' && typeof (cv as { id?: unknown }).id === 'string'
      ? (cv as { id: string }).id
      : undefined;
    const providerChildContext: TraversalContext = maybeBoundary
      ? { ...context, currentSuspenseBoundary: maybeBoundary, currentContext: nextContext }
      : { ...context, currentContext: nextContext };

    // Process children recursively (they can now read context via useContext)
    // Always return a fragment with children as an array
    if (Array.isArray(contextChildren)) {
      const resolvedChildren = processChildren(contextChildren, providerChildContext, player);

      return {
        type: 'fragment',
        props: { children: resolvedChildren },
      };
    } else if (contextChildren && typeof contextChildren === 'object' && 'type' in contextChildren) {
      const child = expandAndResolveContexts(contextChildren, providerChildContext, player);

      return {
        type: 'fragment',
        props: { children: [child] },
      };
    } else {
      // No valid children - return empty fragment
      return {
        type: 'fragment',
        props: { children: [] },
      };
    }
  }

  // Step 3: For regular elements, recursively process children
  const children = element.props.children;

  // Handle array of children
  if (Array.isArray(children)) {
    const processedChildren = processChildren(children, context, player);

    return {
      type: element.type,
      props: {
        ...element.props,
        children: processedChildren,
      },
    };
  }

  // Handle single child element
  if (children && typeof children === 'object' && 'type' in children) {
    const processed = expandAndResolveContexts(children, context, player);

    return {
      type: element.type,
      props: {
        ...element.props,
        children: [processed], // normalize to array
      },
    };
  }

  // Normalize null/undefined or non-element children to empty array
  return {
    type: element.type,
    props: {
      ...element.props,
      children: [],
    },
  };
}

function processChildren(children: JSX.Element[], context: TraversalContext, player: Player): JSX.Element[] {
  return children.map((child: JSX.Node): JSX.Element | undefined => {
    if (!child || typeof child !== 'object' || !('type' in child)) {
      return undefined;
    }

    return expandAndResolveContexts(child, context, player);
  }).filter((child: JSX.Element | undefined): child is JSX.Element => child !== undefined);
}
