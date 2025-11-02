import { Player } from '@minecraft/server';
import { FunctionComponent, JSX } from '../jsx';
import { stopInputLock } from '../util';
import { isContext } from './context';
import {
  activateFiber,
  createFiber,
  deleteFiber,
  getFiber,
  getFibersForPlayer,
  getContextValue,
  setContextValue
} from './fiber';

/**
 * Context passed through tree traversal during rendering phase.
 *
 * This is part of the TWO-PHASE ARCHITECTURE:
 * Phase 1 (Rendering): Build complete tree, create all instances, initialize hooks
 * Phase 2 (Logic): Background effects run while form is displayed
 */
export interface TraversalContext {
  parentPath: string[]; // Component path from root: ['Example', 'Counter']
  createdInstances: Set<string>; // Track all instances created during this render
  currentSuspenseBoundary?: string; // Track which Suspense boundary we're currently in
  instanceToBoundary?: Map<string, string>; // Map instance ID → boundary ID
  idCounters: Map<string, number>; // Per-parent-path counters for auto-keys
}

/**
 * Generate unique hierarchical ID for component instance.
 *
 * IDs follow the format: "playerName:path/to/Component" or "playerName:path/to/Component:key"
 * This ensures each component node in the tree has a unique, stable instance.
 *
 * @param player - Player rendering the component
 * @param component - Component function
 * @param key - Optional key prop from JSX (for list items)
 * @param parentPath - Path from root to parent component
 * @returns Unique component ID
 *
 * @example
 * generateComponentId(player, Example, undefined, [])
 *   → "Steve:Example"
 *
 * generateComponentId(player, Counter, undefined, ['Example'])
 *   → "Steve:Example/Counter"
 *
 * generateComponentId(player, TodoItem, 'todo-1', ['Example', 'TodoList'])
 *   → "Steve:Example/TodoList/TodoItem:todo-1"
 */
function generateComponentId(
  player: Player,
  component: FunctionComponent,
  key: string | undefined,
  parentPath: string[],
): string {
  const componentName = component.name || 'anonymous';
  const pathSegment = key ? `${componentName}:${key}` : componentName;
  const fullPath = [...parentPath, pathSegment].join('/');

  return `${player.name}:${fullPath}`;
}

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
 * @returns Element with all function components expanded and contexts resolved
 */
async function expandAndResolveContexts(element: JSX.Element, context: TraversalContext, player: Player): Promise<JSX.Element> {
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

    // Track instance for cleanup
    context.createdInstances.add(componentId);

    // If we're in a Suspense boundary, record the mapping
    if (context.currentSuspenseBoundary && context.instanceToBoundary) {
      context.instanceToBoundary.set(componentId, context.currentSuspenseBoundary);
    }

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

    // Type-guard: verify __context is a Context object
    if (!isContext(contextObj)) {
      throw new Error('Invalid context provider: __context must be a Context object');
    }

    const contextValue = providerProps.value;
    const contextChildren = providerProps.children;

    // Save previous value and set new one in fiber2 global context
    const prev = getContextValue(contextObj as unknown as { id: symbol; defaultValue: unknown });
    setContextValue(
      contextObj as unknown as { id: symbol; defaultValue: unknown },
      contextValue as unknown,
    );

    try {
      // If this provider is the SuspenseContext, propagate the boundary id
      // into the traversal context so instances rendered under this provider
      // are automatically associated with the boundary.
      const isSuspenseProvider = (contextObj as unknown) === (require('../components/Suspense').SuspenseContext as unknown);
      const maybeBoundary = isSuspenseProvider && contextValue ? (contextValue as unknown as { id?: string }).id : undefined;
      const providerChildContext: TraversalContext = maybeBoundary ? { ...context, currentSuspenseBoundary: maybeBoundary } : context;

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

        const filtered = resolvedChildren.filter((child): child is JSX.Element => child !== null);

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
    } finally {
      // Restore previous context value
      setContextValue(contextObj as unknown as { id: symbol; defaultValue: unknown }, prev);
    }
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
      )).filter((child): child is JSX.Element => child !== null);

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

/**
 * Phase 3: Normalize children to ensure clean Element structure
 * Handles arrays, nulls, and ensures all children are proper Elements
 *
 * @param element - Element with possibly messy children (arrays, nulls, mixed types)
 * @param context - Traversal context (not used here but kept for consistency)
 * @returns Element with clean children structure
 */
function normalizeChildren(element: JSX.Element, context: TraversalContext): JSX.Element {
  if (!element.props.children) {
    return element;
  }

  const children = element.props.children;

  // Handle array of children
  if (Array.isArray(children)) {
    const normalizedChildren = children
      .map((child: JSX.Node): JSX.Element | null => {
        if (!child || typeof child !== 'object' || !('type' in child)) {
          // Filter out null/undefined
          return null;
        }

        // Recursively normalize child's children
        return normalizeChildren(child, context);
      })
      .filter((child): child is JSX.Element => child !== null);

    return {
      type: element.type,
      props: {
        ...element.props,
        children: normalizedChildren.length === 0 ? [] : normalizedChildren,
      },
    };
  }

  // Handle single child element
  if (children && typeof children === 'object' && 'type' in children) {
    return {
      type: element.type,
      props: {
        ...element.props,
        children: normalizeChildren(children, context),
      },
    };
  }

  // Handle null/undefined children
  if (children === null || children === undefined) {
    return {
      type: element.type,
      props: {
        ...element.props,
        children: [],
      },
    };
  }

  return element;
}

/**
 * Build the complete JSX element tree by running all transformation phases.
 * This is the entry point for the RENDERING PHASE where all components are
 * called, instances created, and hooks initialized.
 *
 * TWO-PHASE ARCHITECTURE:
 * Phase 1 (Rendering - this function): Build tree, create instances, initialize hooks
 * Phase 2 (Logic - background): Effects run while form is displayed
 *
 * @param element - Root JSX element to build
 * @param player - Player rendering the component
 * @param registry - Session-specific fiber registry for this render
 * @returns Fully processed JSX element tree and list of created instances
 */
export async function buildTree(
  element: JSX.Element,
  player: Player,
): Promise<{ tree: JSX.Element; instances: Set<string>; instanceToBoundary: Map<string, string> }> {
  // Initialize traversal context
  const instanceToBoundary = new Map<string, string>();
  const context: TraversalContext = {
    parentPath: [],
    createdInstances: new Set(),
    currentSuspenseBoundary: undefined,
    instanceToBoundary,
    idCounters: new Map(),
  };

  // Phase 1: Expand function components and resolve contexts
  // This creates instances for ALL components in the tree
  let result = await expandAndResolveContexts(element, context, player);

  // Phase 2: Normalize children structure
  result = normalizeChildren(result, context);

  return {
    tree: result,
    instances: context.createdInstances,
    instanceToBoundary,
  };
}

/**
 * Clean up all fibers for a player (stop effects, delete instances).
 *
 * @param player - Player whose components are being cleaned up
 */
export function cleanupComponentTree(player: Player): void {
  const fiberIds = getFibersForPlayer(player);
  // Sort by depth (deepest first) to clean up children before parents
  const ids = fiberIds.sort((a, b) => {
    const depthA = (a.match(/\//g) || []).length;
    const depthB = (b.match(/\//g) || []).length;

    return depthB - depthA;
  });

  for (const id of ids) {
    deleteFiber(id);
  }

  stopInputLock(player);
}
