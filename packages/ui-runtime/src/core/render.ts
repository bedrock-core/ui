import { Player, system } from '@minecraft/server';
import { ActionFormData, ActionFormResponse, FormRejectError, uiManager } from '@minecraft/server-ui';
import { FunctionComponent, JSX } from '../jsx';
import { startInputLock, stopInputLock } from '../util';
import { isContext } from './context';
import { fiberRegistry } from './fiber';
import { executeEffects } from './hooks';
import { ComponentInstance, StateHook } from './hooks/types';
import { PROTOCOL_HEADER, serialize } from './serializer';
import { RenderOptions, SerializationContext } from './types';

/**
 * Context passed through tree traversal during rendering phase.
 *
 * This is part of the TWO-PHASE ARCHITECTURE:
 * Phase 1 (Rendering): Build complete tree, create all instances, initialize hooks
 * Phase 2 (Logic): Background effects run while form is displayed
 */
interface TraversalContext {
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
 * Start background effect loop for a component instance.
 *
 * The loop polls the dirty flag and re-runs effects when state changes occur.
 * This allows effects to respond to state changes (e.g., cleanup intervals)
 * even though the form UI is a snapshot and doesn't update.
 *
 * Architecture Note: Forms are immutable snapshots. When state changes in
 * background effects, the visible UI does not update until the next render
 * (button press). This means users may see stale UI (e.g., "Auto: ON" after
 * an interval stops). This is an accepted limitation for now.
 *
 * @param componentId - Component instance ID to start loop for (null-safe)
 */
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
function buildTree(
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
function cleanupComponentTree(player: Player, instanceIds: Set<string>): void {
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

/**
 * Start background effect loop for entire component tree.
 * Checks all instances every tick for dirty flag and re-runs effects.
 *
 * This is part of the LOGIC PHASE that runs while form is displayed.
 *
 * @param instanceIds - Set of all instance IDs to monitor
 */
function startEffectLoopForTree(instanceIds: Set<string>): void {
  // Use a single interval to check all instances
  const intervalId = system.runInterval(() => {
    for (const id of instanceIds) {
      const instance = fiberRegistry.getInstance(id);

      if (instance?.dirty) {
        console.log(`[Effect Loop] Instance ${instance.id} is dirty, re-running effects`);
        instance.dirty = false;
        executeEffects(instance);
      }
    }
  }, 1); // Check every tick

  // Store interval ID for cleanup (attach to first instance)
  for (const id of instanceIds) {
    const instance = fiberRegistry.getInstance(id);

    if (instance) {
      instance.effectLoopId = intervalId;

      break; // Only need to store once
    }
  }
}

/**
 * Stop background effect loop for component tree.
 *
 * @param instanceIds - Set of all instance IDs
 */
function stopEffectLoopForTree(instanceIds: Set<string>): void {
  // Find the stored interval ID
  let intervalId: number | undefined;

  for (const id of instanceIds) {
    const instance = fiberRegistry.getInstance(id);

    if (instance?.effectLoopId !== undefined) {
      intervalId = instance.effectLoopId;

      break;
    }
  }

  if (intervalId !== undefined) {
    console.log(`[Effect Loop] Stopping loop for tree`);
    system.clearRun(intervalId);

    // Clear interval ID from all instances
    for (const id of instanceIds) {
      const instance = fiberRegistry.getInstance(id);

      if (instance) {
        instance.effectLoopId = undefined;
      }
    }
  }
}

/**
 * Handle form cancellation (ESC key or programmatic close).
 *
 * @param player - The player who closed the form
 * @param component - The component being rendered
 * @param instanceIds - Set of all instance IDs in the tree
 */
function handleFormCancellation(
  player: Player,
  component: JSX.Element | FunctionComponent,
  instanceIds: Set<string>,
): void {
  // Check if any instance has Suspense close flag
  let shouldRerender = false;

  for (const id of instanceIds) {
    const instance = fiberRegistry.getInstance(id);

    if (instance?.isProgrammaticClose === false) {
      // Suspense-triggered close: re-render
      shouldRerender = true;

      break;
    }
  }

  if (shouldRerender) {
    system.run((): void => {
      render(player, component);
    });

    return;
  }

  // Normal ESC key press or useExit close - cleanup
  cleanupComponentTree(player, instanceIds);
}

/**
 * Handle button press callback execution and re-rendering.
 *
 * @param player - The player who pressed the button
 * @param component - The component being rendered
 * @param instanceIds - Set of all instance IDs in the tree
 * @param callback - The button callback to execute
 */
function handleButtonCallback(
  player: Player,
  component: JSX.Element | FunctionComponent,
  instanceIds: Set<string>,
  callback: () => void | Promise<void>,
): void {
  // Execute callback (may update state)
  Promise.resolve(callback())
    .then((): void => {
      // Check if programmatic close (like useExit) was triggered
      let shouldCleanup = false;

      for (const id of instanceIds) {
        const instance = fiberRegistry.getInstance(id);

        if (instance?.isProgrammaticClose === true) {
          shouldCleanup = true;

          break;
        }
      }

      if (shouldCleanup) {
        cleanupComponentTree(player, instanceIds);

        return;
      }

      // Normal re-render after button press
      system.run((): void => {
        render(player, component);
      });
    })
    .catch((_error: unknown): void => {
      // Still trigger re-render even on error
      system.run((): void => {
        render(player, component);
      });
    });
}

/**
 * Wait for all useState values in the component tree to differ from their initial values.
 *
 * This function monitors all StateHook instances in the createdInstances set and resolves
 * when either:
 * 1. All state values have changed from their initialValue (success)
 * 2. The timeout period has elapsed (timeout)
 *
 * @param instanceIds - Set of all instance IDs in the component tree
 * @param timeoutMs - Maximum time to wait in milliseconds
 * @returns Promise that resolves with true if all states resolved, false if timeout
 */
async function waitForStateResolution(
  instanceIds: Set<string>,
  timeoutMs: number,
): Promise<boolean> {
  return new Promise<boolean>(resolve => {
    const startTime = Date.now();

    // Check if all states are resolved
    const checkStates = (): boolean => {
      let allResolved = true;

      for (const id of instanceIds) {
        const instance = fiberRegistry.getInstance(id);
        if (!instance) continue;

        // Check all state hooks in this instance
        for (const hook of instance.hooks) {
          if (hook.type === 'state') {
            const stateHook = hook as StateHook;

            // Compare using Object.is (same as React)
            if (Object.is(stateHook.value, stateHook.initialValue)) {
              allResolved = false;
              break;
            }
          }
        }

        if (!allResolved) break;
      }

      return allResolved;
    };

    // Check immediately
    if (checkStates()) {
      console.log('[Suspension] All states resolved immediately');
      resolve(true);

      return;
    }

    console.log('[Suspension] Waiting for state resolution...');

    // Poll every tick until resolved or timeout
    const intervalId = system.runInterval(() => {
      const elapsed = Date.now() - startTime;

      if (elapsed >= timeoutMs) {
        console.log('[Suspension] Timeout reached, proceeding anyway');
        system.clearRun(intervalId);
        resolve(false);

        return;
      }

      if (checkStates()) {
        console.log('[Suspension] All states resolved');
        system.clearRun(intervalId);
        resolve(true);
      }
    }, 1); // Check every tick
  });
}

/**
 * Handle suspension logic: show fallback UI while waiting for state resolution.
 *
 * This function:
 * 1. Builds and renders the fallback component tree
 * 2. Starts effect loops for the main component tree
 * 3. Waits for all states in the main tree to resolve
 * 4. Closes the fallback form when ready
 *
 * @param player - The player to show the fallback to
 * @param fallbackComponent - The fallback component to render
 * @param mainInstanceIds - Set of instance IDs from the main component tree
 * @param timeout - Maximum time to wait for state resolution
 * @returns Promise that resolves when fallback is complete
 */
async function handleSuspension(
  player: Player,
  fallbackComponent: JSX.Element | FunctionComponent,
  mainInstanceIds: Set<string>,
  timeout: number,
): Promise<void> {
  // Convert function component to JSX element if needed
  let fallbackElement: JSX.Element;

  if (typeof fallbackComponent === 'function') {
    fallbackElement = { type: fallbackComponent, props: {} };
  } else {
    fallbackElement = fallbackComponent;
  }

  // Build fallback tree (creates instances for fallback components)
  const { tree: fallbackTree, instances: fallbackInstances } = buildTree(fallbackElement, player);

  // Show fallback UI
  const fallbackContext: SerializationContext = {
    buttonCallbacks: new Map(),
    buttonIndex: 0,
  };
  const fallbackForm = new ActionFormData();
  fallbackForm.title(PROTOCOL_HEADER);
  serialize(fallbackTree, fallbackForm, fallbackContext);

  console.log('[Suspension] Showing fallback UI');

  // Start effect loop for the main component tree while fallback is displayed
  startEffectLoopForTree(mainInstanceIds);

  // Show fallback (don't await - let it display while we wait)
  void fallbackForm.show(player);

  // Wait for state resolution (race between resolution and timeout)
  const resolved = await waitForStateResolution(mainInstanceIds, timeout);

  if (resolved) {
    console.log('[Suspension] States resolved, closing fallback and showing main UI');
  } else {
    console.log('[Suspension] Timeout reached, showing main UI anyway');
  }

  // Force close the fallback form using UIManager
  // UIManager.closeAllForms() closes all open forms for the player
  console.log('[Suspension] Force-closing fallback form');
  uiManager.closeAllForms(player);

  // Wait a tick for form to close
  await new Promise<void>(resolve => system.run(resolve));

  // Clean up fallback component instances
  console.log('[Suspension] Cleaning up fallback instances');
  for (const id of fallbackInstances) {
    const instance = fiberRegistry.getInstance(id);
    if (instance) {
      executeEffects(instance, true); // Run cleanup functions
      fiberRegistry.deleteInstance(id);
    }
  }

  // Wait a tick for everything to settle before showing main UI
  await new Promise<void>(resolve => system.run(resolve));
}

/**
 * Render a JSX component to a player using the @bedrock-core/ui system.
 *
 * This is the ENTRY POINT for the framework. When called:
 * 1. RENDERING PHASE (synchronous): Build complete component tree, create all instances
 * 2. Display static form snapshot to player
 * 3. LOGIC PHASE (background): Keep hooks running until next re-render
 *
 * @param player - The player to show the UI to
 * @param component - JSX component function or element
 * @param options - Optional render options for suspension behavior
 *
 * @examples
 * render(player, Example);           // Component function
 * render(player, <Example />);       // JSX element (equivalent)
 * render(player, <Panel>...</Panel>); // Direct JSX
 *
 * // With suspension
 * render(player, <App />, {
 *   awaitStateResolution: true,
 *   awaitTimeout: 5000,
 *   fallback: <Panel><Text text="Loading..." /></Panel>
 * });
 */
export async function render(
  player: Player,
  component: JSX.Element | FunctionComponent,
  options?: RenderOptions,
): Promise<void> {
  // Convert function component to JSX element if needed
  let rootElement: JSX.Element;

  if (typeof component === 'function') {
    // Wrap function in JSX element so it gets processed like any other component
    rootElement = { type: component, props: {} };
  } else {
    rootElement = component;
  }

  // Start input lock to prevent multiple forms
  startInputLock(player);

  // RENDERING PHASE: Build complete tree, create all instances
  const { tree: element, instances: createdInstances } = buildTree(rootElement, player);

  // SUSPENSION LOGIC: If awaitStateResolution is enabled, show fallback first
  if (options?.awaitStateResolution && options?.fallback) {
    const timeout = options.awaitTimeout ?? 10000; // Default 10 seconds
    await handleSuspension(player, options.fallback, createdInstances, timeout);
  }

  // Create serialization context for button callbacks
  const serializationContext: SerializationContext = {
    buttonCallbacks: new Map(),
    buttonIndex: 0,
  };

  const form = new ActionFormData();

  form.title(PROTOCOL_HEADER);

  // Serialize tree to form (snapshot creation)
  serialize(element, form, serializationContext);

  // LOGIC PHASE: Start background effect loop for all components
  // This allows effects to respond to state changes while form is displayed
  // (Only start if not already started by suspension logic)
  if (!options?.awaitStateResolution) {
    startEffectLoopForTree(createdInstances);
  }

  // Display form and wait for user interaction
  form.show(player).then((response: ActionFormResponse): void => {
    // Stop effect loops when form closes
    stopEffectLoopForTree(createdInstances);

    if (response.canceled) {
      // Form was closed (ESC or programmatically)
      handleFormCancellation(player, component, createdInstances);

      return;
    }

    // Button pressed - execute callback and re-render
    if (response.selection !== undefined) {
      const callback = serializationContext.buttonCallbacks.get(response.selection);

      if (callback) {
        handleButtonCallback(player, component, createdInstances, callback);
      }
    }
  }).catch((error: FormRejectError): never => {
    throw error;
  });
}
