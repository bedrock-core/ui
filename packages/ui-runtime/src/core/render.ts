import { Player } from '@minecraft/server';
import { FunctionComponent, JSX } from '../jsx';
import { stopInputLock } from '../util';
import {
  activateFiber,
  createFiber,
  deleteFiber,
  getFiber,
  getFibersForPlayer
} from './fabric/fiber';

/**
 * Encapsulates parent state for inheritance calculations.
 * Propagated down the tree during Phase 4 (inheritance) to compute
 * final visible/enabled values and relative positioning.
 */
export interface ParentState {
  visible: boolean; // Parent's resolved visibility (default: true)
  enabled: boolean; // Parent's resolved enabled state (default: true)
  x: number; // Parent's X coordinate (default: 0)
  y: number; // Parent's Y coordinate (default: 0)
  position: 'absolute' | 'relative'; // Parent's position mode (default: 'relative')
}

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
  parentState?: ParentState; // Parent state for inheritance (used in Phase 4)
  currentContext: Map<symbol, unknown>; // Fiber context snapshot being propagated
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

    // If this provider is the SuspenseContext, propagate the boundary id
    // into the traversal context so instances rendered under this provider
    // are automatically associated with the boundary.
    const isSuspenseProvider = contextObj === (require('../components/Suspense').SuspenseContext as unknown);
    const maybeBoundary = isSuspenseProvider && contextValue ? (contextValue as unknown as { id?: string }).id : undefined;
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
 * Phase 4: Apply parent-child inheritance rules
 * - visible: child AND parent (if parent invisible, child is invisible)
 * - enabled: child AND parent (if parent disabled, child is disabled)
 * - x/y: adjust for relative positioning mode (add parent coordinates if relative)
 *
 * This must run AFTER tree expansion and normalization so all properties are set.
 *
 * @param element - Element to apply inheritance to
 * @param context - Traversal context with parentState
 * @returns Element with inherited properties applied
 */
export function applyInheritance(element: JSX.Element, context: TraversalContext): JSX.Element {
  const parentState = context.parentState ?? {
    visible: true,
    enabled: true,
    x: 0,
    y: 0,
    position: 'relative',
  };

  const props = element.props;

  // Skip for fragments and context providers (they don't render but propagate parent state)
  if (element.type === 'fragment' || element.type === 'context-provider') {
    // Still process children with parent state propagated
    const childContext: TraversalContext = {
      ...context,
      parentState, // Pass parent state through transparent components
    };

    const newProps = { ...props };

    if (props.children) {
      if (Array.isArray(props.children)) {
        newProps.children = props.children.map(child => applyInheritance(child, childContext));
      } else if (props.children && typeof props.children === 'object' && 'type' in props.children) {
        newProps.children = applyInheritance(props.children, childContext);
      }
    }

    return {
      type: element.type,
      props: newProps,
    };
  }

  // Apply inheritance rules to this element
  const newProps = { ...props };

  // Rule 1: visible = child_visible AND parent_visible
  if (!parentState.visible) {
    newProps.visible = false; // Force invisible if parent is invisible
  }

  // Rule 2: enabled = child_enabled AND parent_enabled
  if (!parentState.enabled) {
    newProps.enabled = false; // Force disabled if parent is disabled
  }

  // Rule 3: Handle relative positioning
  const position = (newProps.__position as string | undefined) ?? 'relative';
  if (position === 'relative') {
    const x = (newProps.x as number | undefined) ?? 0;
    const y = (newProps.y as number | undefined) ?? 0;
    newProps.x = x + parentState.x;
    newProps.y = y + parentState.y;
  }

  // Create new parent state for children using THIS element's resolved properties
  const childParentState: ParentState = {
    visible: (newProps.visible as boolean) ?? true,
    enabled: (newProps.enabled as boolean) ?? true,
    x: (newProps.x as number) ?? 0,
    y: (newProps.y as number) ?? 0,
    position: (position as 'absolute' | 'relative') ?? 'relative',
  };

  const childContext: TraversalContext = {
    ...context,
    parentState: childParentState,
  };

  // Process children with new parent state
  if (newProps.children) {
    if (Array.isArray(newProps.children)) {
      newProps.children = newProps.children.map(child => applyInheritance(child, childContext));
    } else if (newProps.children && typeof newProps.children === 'object' && 'type' in newProps.children) {
      newProps.children = applyInheritance(newProps.children, childContext);
    }
  }

  return {
    type: element.type,
    props: newProps,
  };
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
 * Four-phase tree building:
 * Phase 1: Expand function components and resolve contexts
 * Phase 2: Normalize children structure
 * Phase 3: Apply parent-child inheritance rules (visibility, enabled, relative positioning)
 *
 * @param element - Root JSX element to build
 * @param player - Player rendering the component
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
    currentContext: new Map<symbol, unknown>(),
  };

  // Phase 1: Expand function components and resolve contexts
  // This creates instances for ALL components in the tree
  let result = await expandAndResolveContexts(element, context, player);

  // Phase 2: Normalize children structure
  result = normalizeChildren(result, context);

  // Phase 3: Apply parent-child inheritance rules (visibility, enabled, relative positioning)
  // Initialize with root parent state
  const rootContext: TraversalContext = {
    ...context,
    parentState: {
      visible: true,
      enabled: true,
      x: 0,
      y: 0,
      position: 'relative',
    },
  };
  result = applyInheritance(result, rootContext);

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
