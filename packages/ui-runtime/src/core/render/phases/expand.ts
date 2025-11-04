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

    // Link fiber into parent/child/sibling chain using traversal context
    const parentFiber = context.parentFiber;

    if (parentFiber) {
      fiber.parent = parentFiber;

      if (!parentFiber.child) {
        parentFiber.child = fiber;
        fiber.index = 0;
      } else {
        // Append to end of siblings
        let tail = parentFiber.child;

        while (tail.sibling) {
          tail = tail.sibling;
        }

        tail.sibling = fiber;
        fiber.index = (tail.index ?? -1) + 1;
      }
    } else {
      // Root-level fiber (no parent)
      fiber.parent = undefined;
      fiber.index = 0; // Position among root siblings isn't tracked globally; 0 is a sane default
    }

    // Attach current context snapshot so hooks can read during evaluation
    fiber.contextSnapshot = context.currentContext;
    // Activate the fiber and run the component; effects flush after this call
    const renderedElement = activateFiber(fiber, () => componentFn(element.props));

    // Create child context with updated path
    const childContext: TraversalContext = {
      ...context,
      parentPath: [...context.parentPath, componentName],
      parentFiber: fiber,
    };

    // Recursively process the rendered result (visual tree)
    return expandAndResolveContexts(renderedElement, childContext, player);
  }

  // Step 2: Handle context provider - push context BEFORE processing children
  if (isContextProvider(element)) {
    const { __context: ctxObj, value, children } = element.props;

    // Derive a child context snapshot from the parent snapshot
    const nextContext = new Map(context.currentContext);
    nextContext.set(ctxObj, value);

    // Detect Suspense boundary id (duck-typed: object with string 'id')
    const boundaryId = getBoundaryId(value);

    // Child traversal context, optionally tagging the current Suspense boundary
    const childContext: TraversalContext = {
      ...context,
      currentContext: nextContext,
      ...boundaryId ? { currentSuspenseBoundary: boundaryId } : {},
    };

    // Process children recursively (they can now read context via useContext)
    const childrenArray = toChildrenArray(children);
    const resolvedChildren = childrenArray.length
      ? processChildren(childrenArray, childContext, player)
      : [];

    return {
      type: 'fragment',
      props: { children: resolvedChildren },
    };
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

// Keep this helper small and local: returns 'id' iff it's a non-empty string on an object.
function getBoundaryId(value: unknown): string | undefined {
  if (value && typeof value === 'object') {
    const id = (value as { id?: unknown }).id;
    if (typeof id === 'string' && id.length > 0) return id;
  }

  return undefined;
}

// Normalizes any valid JSX child(ren) into an array of elements.
function toChildrenArray(children: unknown): JSX.Element[] {
  if (Array.isArray(children)) {
    return children as JSX.Element[];
  }
  if (children && typeof children === 'object' && 'type' in (children as Record<string, unknown>)) {
    return [children as JSX.Element];
  }

  return [];
}
