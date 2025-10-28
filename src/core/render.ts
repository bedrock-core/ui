import { InputPermissionCategory, Player, system } from '@minecraft/server';
import { ActionFormData, ActionFormResponse, FormRejectError } from '@minecraft/server-ui';
import { FunctionComponent, JSX } from '../jsx';
import { Context } from './context';
import { fiberRegistry } from './fiber';
import { executeEffects } from './hooks';
import { RenderOptions } from './hooks/types';
import { PROTOCOL_HEADER, serialize } from './serializer';
import { SerializationContext } from './types';

/**
 * Input lock system - tracks which players have locked input and their previous permissions
 * Key: player name, Value: { camera: previous camera permission, movement: previous movement permission }
 */
const inputLocks = new Map<string, { camera: boolean; movement: boolean }>();

/**
 * Start locking camera and movement input for a player
 */
function startInputLock(player: Player): void {
  const playerId = player.name;

  // Already locked, don't create duplicate
  if (inputLocks.has(playerId)) {
    return;
  }

  // Store current permissions before disabling
  const previousCameraPermission = player.inputPermissions.isPermissionCategoryEnabled(InputPermissionCategory.Camera);
  const previousMovementPermission = player.inputPermissions.isPermissionCategoryEnabled(InputPermissionCategory.Movement);

  inputLocks.set(playerId, {
    camera: previousCameraPermission,
    movement: previousMovementPermission,
  });

  // Disable camera and movement using official API
  player.inputPermissions.setPermissionCategory(InputPermissionCategory.Camera, false);
  player.inputPermissions.setPermissionCategory(InputPermissionCategory.Movement, false);
}

/**
 * Stop locking camera and movement input for a player, restoring previous permissions
 */
function stopInputLock(player: Player): void {
  const playerId = player.name;
  const previousPermissions = inputLocks.get(playerId);

  if (!previousPermissions) {
    return;
  }

  // Restore previous permissions
  player.inputPermissions.setPermissionCategory(InputPermissionCategory.Camera, previousPermissions.camera);
  player.inputPermissions.setPermissionCategory(InputPermissionCategory.Movement, previousPermissions.movement);

  inputLocks.delete(playerId);
}

/**
 * Build the complete JSX element tree, handling context providers depth-first.
 * This follows React's reconciliation pattern where context is pushed BEFORE
 * processing children, ensuring context values are available when child
 * components call useContext().
 *
 * With lazy JSX, function components are stored as references and called here
 * at the appropriate time (after their parent context providers have been set up).
 *
 * @param element - JSX element to build
 * @returns Fully processed JSX element tree with context resolved
 */
function buildTree(element: JSX.Element | JSX.Node): JSX.Element | JSX.Node {
  // Handle non-element children (strings, numbers, etc.)
  if (!element || typeof element !== 'object' || !('type' in element)) {
    return element;
  }

  // Handle function components - call them NOW (after context is set up)
  // With lazy JSX, the type is the function itself, not a string
  if (typeof element.type === 'function') {
    const componentFn = element.type;
    const renderedElement = componentFn(element.props);

    // Recursively build the rendered result
    return buildTree(renderedElement);
  }

  // Handle context provider - push context BEFORE processing children
  // This ensures children can read the context when their component functions execute
  if (element.type === 'context-provider') {
    const providerProps = element.props as unknown as {
      __context: Context<unknown>;
      value: unknown;
      children: JSX.Node;
    };
    const contextObj = providerProps.__context;
    const contextValue = providerProps.value;
    const contextChildren = providerProps.children;

    // Push context value onto the stack
    fiberRegistry.pushContext(contextObj, contextValue);

    try {
      // Process children recursively - they can now read context via useContext()
      const processedChildren = buildTreeChildren(contextChildren);

      // Return children directly (context provider itself doesn't render)
      if (Array.isArray(processedChildren)) {
        // Multiple children - wrap in Fragment
        return {
          type: 'fragment',
          props: { children: processedChildren },
        };
      } else if (processedChildren && typeof processedChildren === 'object' && 'type' in processedChildren) {
        // Single child element - return it directly
        return processedChildren;
      } else {
        // No valid children - return empty fragment
        return {
          type: 'fragment',
          props: { children: [] },
        };
      }
    } finally {
      // Always pop context after processing children
      fiberRegistry.popContext(contextObj);
    }
  }

  // For regular elements, recursively build children
  if (element.props.children) {
    const processedChildren = buildTreeChildren(element.props.children);

    return {
      type: element.type,
      props: {
        ...element.props,
        children: processedChildren,
      },
    };
  }

  return element;
}

/**
 * Process children nodes during tree building
 * @param children - Child nodes to process
 * @returns Processed children
 */
function buildTreeChildren(children: JSX.Node): JSX.Node {
  if (Array.isArray(children)) {
    return children.map(child => buildTree(child)) as JSX.Node;
  }

  return buildTree(children);
}

/**
 * Present a JSX component to a player using the @bedrock-core/ui system.
 * Manages component instances, state, and effects.
 *
 * @param player - The player to show the UI to
 * @param component - JSX component function or element
 * @param options - Render options including component key for instance persistence
 *
 * @example
 * // Static component (direct element)
 * render(player, <Panel>...</Panel>);
 *
 * // Component function (supports hooks)
 * render(player, <MyStatefulComponent />, { key: 'my-component-1' });
 */
export async function render(
  player: Player,
  component: JSX.Element | FunctionComponent,
  options?: RenderOptions,
): Promise<void> {
  // Determine if component is an element or a function
  let element: JSX.Element;
  let isStateful = false;
  let componentId: string | null = null;

  if (typeof component === 'function') {
    // It's a component function - needs instance management
    isStateful = true;
    const key = options?.key || component.name || 'anonymous';
    const playerId = player.name;
    componentId = `${playerId}:${key}`;

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

    // Store options for potential re-renders
    instance.options = options;

    // Push instance onto fiber stack (makes it available to hooks)
    fiberRegistry.pushInstance(instance);

    try {
      // Call component function to get JSX tree
      // With lazy JSX, child components are NOT called yet - just stored as references
      element = component(instance.props);

      // Build complete tree with context resolution (Phase 1)
      // buildTree() will call child components at the right time (after context is set up)
      element = buildTree(element) as JSX.Element;

      // After tree is built, execute effects (Phase 2)
      executeEffects(instance);
    } finally {
      // Pop instance from stack
      fiberRegistry.popInstance();
    }
  } else {
    // It's a direct JSX element - build the tree to handle any context providers
    element = buildTree(component) as JSX.Element;
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
    console.log(`player: ${player.name}, sel: ${response.selection}, cancel: ${response.canceled}, cr: ${response.cancelationReason}`);
    if (response.canceled) {
      // Form was closed (either by ESC or programmatically)
      if (isStateful && componentId) {
        const instance = fiberRegistry.getInstance(componentId);

        if (instance?.mounted) {
          // isProgrammaticClose === false: Suspense close → re-render
          // isProgrammaticClose === true: useExit close → cleanup
          // isProgrammaticClose === undefined: ESC key or other close → cleanup

          if (instance.isProgrammaticClose === false) {
            // Suspense-triggered close: re-render
            system.run((): void => {
              render(player, component, options);
            });

            return;
          } else if (instance.isProgrammaticClose === true) {
            // useExit-triggered close: cleanup
            stopInputLock(player);
            executeEffects(instance, true); // Run cleanup functions
            fiberRegistry.deleteInstance(componentId);

            return;
          }
        }
      }

      // Normal ESC key press or other close - cleanup, don't re-render
      if (isStateful && componentId) {
        const instance = fiberRegistry.getInstance(componentId);
        if (instance?.mounted) {
          // Stop input lock
          stopInputLock(player);

          executeEffects(instance, true); // Run cleanup functions
          fiberRegistry.deleteInstance(componentId);
        }
      }

      return;
    }

    // Button pressed - execute callback and re-render
    if (response.selection !== undefined) {
      const callback = context.buttonCallbacks.get(response.selection);

      if (callback) {
        // AWAIT the callback completion (may be async or sync)
        // Wrap in Promise.resolve() to handle both sync and async callbacks uniformly
        Promise.resolve(callback())
          .then((): void => {
            // Callback completed; now re-render with all accumulated state changes
            handlePostCallbackRender();
          })
          .catch((_error: unknown): void => {
            // Still trigger re-render even on error
            handlePostCallbackRender();
          });
      }
    }

    /**
     * Helper function to re-render after button callback completes
     *
     * Button press closes the form automatically, so we just re-render on next tick
     */
    function handlePostCallbackRender(): void {
      // Check if this is a programmatic close (like useExit) - if so, don't re-render
      if (isStateful && componentId) {
        const instance = fiberRegistry.getInstance(componentId);

        if (instance?.isProgrammaticClose) {
          // Clean up the instance
          if (instance.mounted) {
            stopInputLock(player);
            executeEffects(instance, true); // Run cleanup functions

            fiberRegistry.deleteInstance(componentId);
          }

          return;
        }
      }

      // Normal re-render on next tick (form is already closed by game)
      system.run((): void => {
        render(player, component, options);
      });
    }
  }).catch((error: FormRejectError): never => {
    throw error;
  });
}
