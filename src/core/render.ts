import { InputPermissionCategory, Player, system } from '@minecraft/server';
import { ActionFormData, ActionFormResponse, FormRejectError } from '@minecraft/server-ui';
import { FunctionComponent, JSX } from '../jsx';
import { Logger } from '../util';
import { fiberRegistry } from './fiber';
import { executeEffects } from './hooks';
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

interface RenderOptions {

  /**
   * Unique key for component instance persistence.
   * If not provided, defaults to component function name or 'anonymous'
   */
  key?: string;
}

/**
 * Internal function to render a component element to JSX
 */
function renderComponentElement(component: FunctionComponent, props: JSX.Props): JSX.Element {
  return component(props);
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
    const instance = fiberRegistry.getOrCreateInstance(componentId, component, {});

    // Start input lock on first render
    if (!instance.mounted) {
      startInputLock(player);
    }

    // Store render context for re-renders
    instance.renderContext = {
      player,
      options,
    };

    // Store a callback for potential re-renders (currently no-op)
    // DISABLED: Debounce re-rendering removed - forms only update on button press
    // Keeping this for hook compatibility but it does nothing
    instance.scheduleRerender = (): void => {
      // No-op: Let game process form close naturally, only re-render on button press
    };

    // Push instance onto fiber stack (makes it available to hooks)
    fiberRegistry.pushInstance(instance);

    try {
      // Render component element
      element = renderComponentElement(component, instance.props);

      // After rendering, execute effects
      executeEffects(instance);
    } finally {
      // Pop instance from stack
      fiberRegistry.popInstance();
    }
  } else {
    // It's a direct JSX element - no instance management needed
    element = component;
  }

  const form = new ActionFormData();

  // Create serialization context to collect button callbacks
  const context: SerializationContext = {
    buttonCallbacks: new Map(),
    buttonIndex: 0,
  };

  form.title(PROTOCOL_HEADER);

  // Pass context to serialize
  serialize(element, form, context);

  form.show(player).then((response: ActionFormResponse): void => {
    if (response.canceled) {
      // ESC key pressed - cleanup, don't re-render
      if (isStateful && componentId && response.selection === undefined) {
        const instance = fiberRegistry.getInstance(componentId);
        if (instance?.mounted) {
          Logger.log(`[render] Player pressed ESC for ${componentId}, cleaning up`);

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
            handlePostCallbackRender(isStateful, componentId);
          })
          .catch((error: unknown): void => {
            Logger.error(`[render] Button callback rejected: ${error}`);
            // Still trigger re-render even on error
            handlePostCallbackRender(isStateful, componentId);
          });
      }
    }

    /**
     * Helper function to re-render after button callback completes
     *
     * Button press closes the form automatically, so we just re-render on next tick
     */
    function handlePostCallbackRender(isStateful: boolean, componentId: string | null): void {
      // Render immediately on next tick (form is already closed by game)
      Logger.log(`[render] Re-rendering after button press for ${componentId}`);
      system.run(() => {
        render(player, component, options);
      });
    }
  }).catch((error: FormRejectError): never => {
    throw error;
  });
}
