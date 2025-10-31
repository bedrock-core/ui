import { Player } from '@minecraft/server';
import { FunctionComponent, JSX } from '../jsx';
import { stopInputLock } from '../util';
import { isContext } from './context';
import { fiberRegistry } from './fiber';
import { executeEffects } from './hooks';
import { ComponentInstance } from './hooks/types';

/**
 * Context passed through tree traversal during rendering phase.
 *
 * This is part of the TWO-PHASE ARCHITECTURE:
 * Phase 1 (Rendering): Build complete tree, create all instances, initialize hooks
 * Phase 2 (Logic): Background effects run while form is displayed
 */
export interface TraversalContext {
  player: Player;
  parentPath: string[]; // Component path from root: ['Example', 'Counter']
  createdInstances: Set<string>; // Track all instances created during this render
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
function expandAndResolveContexts(element: JSX.Element, context: TraversalContext): JSX.Element {
  // Step 1: Handle function components - CREATE INSTANCE FOR EACH
  if (typeof element.type === 'function') {
    const componentFn = element.type;

    // Generate unique ID for this component node
    const key = typeof element.props.key === 'string' ? element.props.key : undefined;
    const componentId = generateComponentId(
      context.player,
      componentFn,
      key,
      context.parentPath,
    );

    // Get or create instance for this component
    const instance = fiberRegistry.getOrCreateInstance(
      componentId,
      context.player,
      componentFn,
      element.props,
    );

    // Track instance for cleanup
    context.createdInstances.add(componentId);

    // Push instance onto fiber stack (makes it available to hooks)
    fiberRegistry.pushInstance(instance);

    try {
      // Call component function (hooks can now access correct instance)
      const renderedElement = componentFn(element.props);

      // Execute effects after component mounts/updates
      executeEffects(instance);

      // Mark as mounted after first render
      if (!instance.mounted) {
        instance.mounted = true;
      }

      // Create child context with updated path
      const componentName = componentFn.name || 'anonymous';
      const childContext: TraversalContext = {
        ...context,
        parentPath: [...context.parentPath, componentName],
      };

      // Recursively process the rendered result with child context
      return expandAndResolveContexts(renderedElement, childContext);
    } finally {
      // Always pop instance when done
      fiberRegistry.popInstance();
    }
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

    // Push context value onto the stack
    fiberRegistry.pushContext(contextObj, contextValue);

    try {
      // Process children recursively (they can now read context via useContext)
      let processedChildren: JSX.Element;

      if (Array.isArray(contextChildren)) {
        const resolvedChildren = contextChildren
          .map((child: JSX.Node): JSX.Element | null => {
            if (!child || typeof child !== 'object' || !('type' in child)) {
              return null;
            }

            return expandAndResolveContexts(child, context);
          })
          .filter((child): child is JSX.Element => child !== null);

        processedChildren = {
          type: 'fragment',
          props: { children: resolvedChildren },
        };
      } else if (contextChildren && typeof contextChildren === 'object' && 'type' in contextChildren) {
        processedChildren = expandAndResolveContexts(contextChildren, context);
      } else {
        // No valid children - return empty fragment
        processedChildren = {
          type: 'fragment',
          props: { children: [] },
        };
      }

      return processedChildren;
    } finally {
      // Always pop context after processing children
      fiberRegistry.popContext(contextObj);
    }
  }

  // Step 3: For regular elements, recursively process children
  if (element.props.children) {
    const children = element.props.children;

    // Handle array of children
    if (Array.isArray(children)) {
      const processedChildren = children
        .map((child: JSX.Node): JSX.Element | null => {
          if (!child || typeof child !== 'object' || !('type' in child)) {
            // null/undefined/primitive - will be handled in normalizeChildren phase
            return null;
          }

          return expandAndResolveContexts(child, context);
        })
        .filter((child): child is JSX.Element => child !== null);

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
          children: expandAndResolveContexts(children, context),
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
 * @returns Fully processed JSX element tree and list of created instances
 */
export function buildTree(
  element: JSX.Element,
  player: Player,
): { tree: JSX.Element; instances: Set<string> } {
  // Initialize traversal context
  const context: TraversalContext = {
    player,
    parentPath: [],
    createdInstances: new Set(),
  };

  // Phase 1: Expand function components and resolve contexts
  // This creates instances for ALL components in the tree
  let result = expandAndResolveContexts(element, context);

  // Phase 2: Normalize children structure
  result = normalizeChildren(result, context);

  return {
    tree: result,
    instances: context.createdInstances,
  };
}

/**
 * Clean up entire component tree (stop effects, delete instances).
 *
 * @param player - Player whose components are being cleaned up
 * @param instanceIds - Set of all instance IDs to clean up
 */
export function cleanupComponentTree(player: Player, instanceIds: Set<string>): void {
  // Get all instances and sort by depth (deepest first for proper cleanup order)
  const instances = Array.from(instanceIds)
    .map(id => fiberRegistry.getInstance(id))
    .filter((inst): inst is ComponentInstance => inst !== undefined)
    .sort((a, b) => {
      // Sort by path depth (more slashes = deeper)
      const depthA = (a.id.match(/\//g) || []).length;
      const depthB = (b.id.match(/\//g) || []).length;

      return depthB - depthA; // Deepest first
    });

  // Clean up each instance (children first, then parents)
  for (const instance of instances) {
    executeEffects(instance, true); // Run cleanup functions
    fiberRegistry.deleteInstance(instance.id);
  }

  stopInputLock(player);
}
