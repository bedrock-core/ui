import { Player, system } from '@minecraft/server';
import { ActionFormData, ActionFormResponse, FormRejectError } from '@minecraft/server-ui';
import { FunctionComponent, JSX } from '../jsx';
import { startInputLock, stopInputLock } from '../util';
import { isContext } from './context';
import { fiberRegistry } from './fiber';
import { executeEffects } from './hooks';
import { PROTOCOL_HEADER, serialize } from './serializer';
import { SerializationContext } from './types';

/**
 * Phase 1: Expand function components and resolve context providers in depth-first order
 * This ensures context is available when function components that use useContext() are called
 *
 * Order of operations:
 * 1. If function component → call it, recursively process result
 * 2. If context provider → push context, process children, pop context
 * 3. For regular elements → recursively process children
 *
 * @param element - Element that may have function components or context providers
 * @returns Element with all function components expanded and contexts resolved
 */
function expandAndResolveContexts(element: JSX.Element): JSX.Element {
  // Step 1: If type is a function component, call it first
  if (typeof element.type === 'function') {
    const componentFn = element.type;
    const renderedElement = componentFn(element.props);

    // Recursively process the rendered result
    return expandAndResolveContexts(renderedElement);
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

            return expandAndResolveContexts(child);
          })
          .filter((child): child is JSX.Element => child !== null);

        processedChildren = {
          type: 'fragment',
          props: { children: resolvedChildren },
        };
      } else if (contextChildren && typeof contextChildren === 'object' && 'type' in contextChildren) {
        processedChildren = expandAndResolveContexts(contextChildren);
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

          return expandAndResolveContexts(child);
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
          children: expandAndResolveContexts(children),
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
 * @returns Element with clean children structure
 */
function normalizeChildren(element: JSX.Element): JSX.Element {
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
        return normalizeChildren(child);
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
        children: normalizeChildren(children),
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
 * This follows a pipeline pattern where each phase transforms the tree:
 *
 * Phase 1: expandAndResolveContexts - Call function components AND resolve context providers in depth-first order
 *          This ensures context is available when function components use useContext()
 * Phase 2: normalizeChildren - Clean up children structure (arrays, nulls)
 *
 * @param element - JSX element to build
 * @returns Fully processed JSX element tree ready for serialization
 */
function buildTree(element: JSX.Element): JSX.Element {
  // Phase 1: Expand function components and resolve contexts in correct order
  let result = expandAndResolveContexts(element);

  // Phase 2: Normalize children structure
  result = normalizeChildren(result);

  return result;
}

/**
 * Render a stateful component (function component with hooks support)
 *
 * @param player - The player to show the UI to
 * @param component - Function component to render
 * @returns Processed element tree and component ID
 */
function renderStatefulComponent(
  player: Player,
  component: FunctionComponent,
): { element: JSX.Element; componentId: string } {
  const key = component.name || 'anonymous';
  const playerId = player.name;
  const componentId = `${playerId}:${key}`;

  // Get or create component instance
  const instance = fiberRegistry.getOrCreateInstance(componentId, player, component, {});

  // Start input lock on first render
  if (!instance.mounted) {
    startInputLock(player);
  }

  // Reset transient close semantics at the beginning of each render
  // so only the current interaction (ESC/useExit/Suspense) influences handling
  // - undefined: default (e.g., ESC or user-closed form) → cleanup, no re-render
  // - false: programmatic close that should trigger re-render (e.g., Suspense)
  // - true: programmatic close that should NOT re-render (e.g., useExit)
  instance.isProgrammaticClose = undefined;

  // Push instance onto fiber stack (makes it available to hooks)
  fiberRegistry.pushInstance(instance);

  try {
    // Call component function to get JSX tree
    // With lazy JSX, child components are NOT called yet - just stored as references
    const element = component(instance.props);

    // Build complete tree with context resolution
    // buildTree() will call child components at the right time (after context is set up)
    const builtTree = buildTree(element);

    // After tree is built, execute effects
    executeEffects(instance);

    return { element: builtTree, componentId };
  } finally {
    // Pop instance from stack
    fiberRegistry.popInstance();
  }
}

/**
 * Handle form cancellation (ESC key or programmatic close)
 *
 * @param player - The player who closed the form
 * @param component - The component being rendered
 * @param componentId - The component instance ID
 */
function handleFormCancellation(
  player: Player,
  component: JSX.Element | FunctionComponent,
  componentId: string,
): void {
  const instance = fiberRegistry.getInstance(componentId);

  if (instance?.mounted) {
    // isProgrammaticClose === false: Suspense close → re-render
    // isProgrammaticClose === true: useExit close → cleanup
    // isProgrammaticClose === undefined: ESC key or other close → cleanup

    if (instance.isProgrammaticClose === false) {
      // Suspense-triggered close: re-render
      system.run((): void => {
        render(player, component);
      });

      return;
    } else if (instance.isProgrammaticClose === true) {
      // useExit-triggered close: cleanup
      cleanupComponent(player, componentId);

      return;
    }
  }

  // Normal ESC key press or other close - cleanup, don't re-render
  cleanupComponent(player, componentId);
}

/**
 * Clean up a component instance (stop input lock, run cleanup effects, delete instance)
 *
 * @param player - The player whose component is being cleaned up
 * @param componentId - The component instance ID
 */
function cleanupComponent(player: Player, componentId: string): void {
  const instance = fiberRegistry.getInstance(componentId);

  if (instance?.mounted) {
    stopInputLock(player);
    executeEffects(instance, true); // Run cleanup functions
    fiberRegistry.deleteInstance(componentId);
  }
}

/**
 * Handle button press callback execution and re-rendering
 *
 * @param player - The player who pressed the button
 * @param component - The component being rendered
 * @param componentId - The component instance ID (null for stateless)
 * @param callback - The button callback to execute
 */
function handleButtonCallback(
  player: Player,
  component: JSX.Element | FunctionComponent,
  componentId: string | null,
  callback: () => void | Promise<void>,
): void {
  // AWAIT the callback completion (may be async or sync)
  // Wrap in Promise.resolve() to handle both sync and async callbacks uniformly
  Promise.resolve(callback())
    .then((): void => {
      // Callback completed; now re-render with all accumulated state changes
      reRenderAfterCallback(player, component, componentId);
    })
    .catch((_error: unknown): void => {
      // Still trigger re-render even on error
      reRenderAfterCallback(player, component, componentId);
    });
}

/**
 * Re-render after button callback completes
 * Button press closes the form automatically, so we just re-render on next<in tick
 *
 * @param player - The player to re-render for
 * @param component - The component being rendered
 * @param componentId - The component instance ID (null for stateless)
 */
function reRenderAfterCallback(
  player: Player,
  component: JSX.Element | FunctionComponent,
  componentId: string | null,
): void {
  // Check if this is a programmatic close (like useExit) - if so, don't re-render
  if (componentId) {
    const instance = fiberRegistry.getInstance(componentId);

    if (instance?.isProgrammaticClose) {
      // Clean up the instance
      cleanupComponent(player, componentId);

      return;
    }
  }

  // Normal re-render on next tick (form is already closed by game)
  system.run((): void => {
    render(player, component);
  });
}

/**
 * Present a JSX component to a player using the @bedrock-core/ui system.
 * Manages component instances, state, and effects.
 *
 * @param player - The player to show the UI to
 * @param component - JSX component function or element
 *
 * @examples
 * render(player, <Panel>...</Panel>);
 * render(player, <MyStatefulComponent />);
 */
export async function render(
  player: Player,
  component: JSX.Element | FunctionComponent,
): Promise<void> {
  // Determine if component is an element or a function
  let element: JSX.Element;
  let isStateful = false;
  let componentId: string | null = null;

  if (typeof component === 'function') {
    // It's a component function - needs instance management
    isStateful = true;
    const result = renderStatefulComponent(player, component);
    element = result.element;
    componentId = result.componentId;
  } else {
    // It's a direct JSX element - build the tree to handle any context providers
    element = buildTree(component);
  }

  const form = new ActionFormData();

  // Create serialization context to collect button callbacks
  const context: SerializationContext = {
    buttonCallbacks: new Map(),
    buttonIndex: 0,
  };

  form.title(PROTOCOL_HEADER);

  // Tree has been built with context resolved, now serialize to form
  serialize(element, form, context);

  form.show(player).then((response: ActionFormResponse): void => {
    if (response.canceled) {
      // Form was closed (either by ESC or programmatically)
      if (isStateful && componentId) {
        handleFormCancellation(player, component, componentId);
      }

      return;
    }

    // Button pressed - execute callback and re-render
    if (response.selection !== undefined) {
      const callback = context.buttonCallbacks.get(response.selection);

      if (callback) {
        handleButtonCallback(player, component, componentId, callback);
      }
    }
  }).catch((error: FormRejectError): never => {
    throw error;
  });
}
