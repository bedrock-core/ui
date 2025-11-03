import type { Player } from '@minecraft/server';
import type { FunctionComponent, JSX } from '../../../jsx';
import { activateFiber, createFiber, getFiber } from '../../fabric';
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
export async function expandAndResolveContexts(
  element: JSX.Element,
  context: TraversalContext,
  player: Player,
): Promise<JSX.Element> {
  // Step 1: Handle function components - CREATE INSTANCE FOR EACH
  if (typeof element.type === 'function') {
    const componentFn = element.type as FunctionComponent;

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

    // If we're in a Suspense boundary, stamp this fiber with nearest boundary id
    if (context.currentSuspenseBoundary) {
      fiber.nearestBoundaryId = context.currentSuspenseBoundary;
    } else {
      fiber.nearestBoundaryId = undefined;
    }

    // Attach current context snapshot so hooks can read during evaluation
    fiber.contextSnapshot = context.currentContext;
    // Activate the fiber and run the component; effects flush after this call
    const renderedElement = await activateFiber(fiber, () => componentFn(element.props));

    // Create child context with updated path
    const childContext: TraversalContext = {
      ...context,
      parentPath: [...context.parentPath, componentName],
    };

    // Recursively process the rendered result (visual tree)
    return expandAndResolveContexts(renderedElement, childContext, player);
  }

  // Step 2: Handle context provider - push context BEFORE processing children
  if (element.type === 'context-provider') {
    const providerProps = element.props;
    const contextObj = providerProps.__context;

    const contextValue = providerProps.value;
    const contextChildren = providerProps.children;

    // Derive a child context snapshot from the parent snapshot
    const nextContext = new Map(context.currentContext);
    nextContext.set((contextObj as { $$typeof: symbol }).$$typeof, contextValue);

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
    let processedChildren: JSX.Element;

    if (Array.isArray(contextChildren)) {
      const resolvedChildren = await Promise.all(
        contextChildren
          .map((child: JSX.Node): Promise<JSX.Element | null> => {
            if (!child || typeof child !== 'object' || !('type' in child)) {
              return Promise.resolve(null);
            }

            return expandAndResolveContexts(child, providerChildContext, player);
          }),
      );

      const filtered = resolvedChildren.filter((child: JSX.Element | null): child is JSX.Element => child !== null);

      processedChildren = {
        type: 'fragment',
        props: { children: filtered },
      };
    } else if (contextChildren && typeof contextChildren === 'object' && 'type' in contextChildren) {
      processedChildren = await expandAndResolveContexts(contextChildren, providerChildContext, player);
    } else {
      // No valid children - return empty fragment
      processedChildren = {
        type: 'fragment',
        props: { children: [] },
      };
    }

    return processedChildren;
  }

  // Step 3: For regular elements, recursively process children
  if (element.props.children) {
    const children = element.props.children;

    // Handle array of children
    if (Array.isArray(children)) {
      const processedChildren = (await Promise.all(
        children.map((child: JSX.Node): Promise<JSX.Element | null> => {
          if (!child || typeof child !== 'object' || !('type' in child)) {
            return Promise.resolve(null);
          }

          return expandAndResolveContexts(child, context, player);
        }),
      )).filter((child: JSX.Element | null): child is JSX.Element => child !== null);

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
      return {
        type: element.type,
        props: {
          ...element.props,
          children: await expandAndResolveContexts(children, context, player),
        },
      };
    }
  }

  return element;
}
