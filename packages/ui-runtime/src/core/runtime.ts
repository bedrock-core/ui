import type { Player } from '@minecraft/server';
import { system } from '@minecraft/server';
import { ActionFormData, uiManager } from '@minecraft/server-ui';
import type { SuspenseBoundary } from '../components/Suspense';
import { suspenseBoundaryRegistry } from '../components/Suspense';
import { executeEffects } from '../hooks';
import type { FunctionComponent, JSX } from '../jsx';
import { startInputLock } from '../util';
import { FiberRegistry } from './fiber';
import { buildTree, cleanupComponentTree } from './render';
import { PROTOCOL_HEADER, serialize } from './serializer';
import { handleSuspensionForBoundary } from './suspension';
import type {
  RenderOptions,
  SerializationContext
} from './types';

/** Session registry store: one registry per player per UI session */
const sessionRegistries = new Map<string, FiberRegistry>();

/** Entry point that constructs a Runtime and starts the loop. */
export async function render(
  player: Player,
  root: JSX.Element | FunctionComponent,
  options: RenderOptions = { isFirstRender: true },
): Promise<void> {
  // Convert function component to JSX element if needed
  const rootElement: JSX.Element = typeof root === 'function' ? { type: root, props: {} } : root;

  let currentRegistry: FiberRegistry;

  // Begin: input lock and create/retrieve session registry
  if (options.isFirstRender) {
    startInputLock(player);
    // Create new session registry for this player
    currentRegistry = new FiberRegistry();
    sessionRegistries.set(player.id, currentRegistry);
    options.isFirstRender = false;
  } else {
    // Retrieve existing session registry for this player
    currentRegistry = options.registry ?? sessionRegistries.get(player.id) ?? new FiberRegistry();
  }

  // Store registry in options for re-renders
  options.registry = currentRegistry;

  // Build complete tree (instances created, hooks initialized)
  const builtTree = buildTree(rootElement, player, currentRegistry);

  // Populate boundary instance sets using the instanceToBoundary map from buildTree
  // Reset current boundary instance sets to avoid leaking instances across renders
  for (const boundary of suspenseBoundaryRegistry.values()) {
    boundary.instanceIds.clear();
  }

  for (const [instanceId, boundaryId] of builtTree.instanceToBoundary) {
    const boundary = suspenseBoundaryRegistry.get(boundaryId);

    if (boundary) {
      boundary.instanceIds.add(instanceId);
    }
  }

  await presentCycle(
    player,
    builtTree.tree,
    builtTree.instances,
    rootElement,
    {
      isFirstRender: options.isFirstRender ?? false,
      registry: currentRegistry,
    },
    Array.from(suspenseBoundaryRegistry.values()),
  );
}

/**
 * Shared present cycle: serialize tree, start effect loop, show form, handle response.
 * Parameterized by cancel strategy and reinvoke function for subsequent updates.
 */
async function presentCycle(
  player: Player,
  element: JSX.Element,
  createdInstances: Set<string>,
  rootElement: JSX.Element,
  options: Required<RenderOptions>,
  suspenseBoundaries?: SuspenseBoundary[],
): Promise<void> {
  // Prepare serialization context for button callbacks
  const serializationContext: SerializationContext = { buttonCallbacks: new Map(), buttonIndex: 0 };

  // Snapshot and show
  const form = new ActionFormData();
  form.title(PROTOCOL_HEADER);
  serialize(element, form, serializationContext);

  // Track started boundaries and their resolution status
  const boundaries = new Map<string, boolean>();
  const areAllBoundariesResolved = (): boolean => Array.from(boundaries.entries()).every(([, value]) => value);

  if (suspenseBoundaries) {
    for (const boundary of suspenseBoundaries) {
      if (boundary.isResolved || boundaries.has(boundary.id) || boundary.instanceIds.size === 0) {
        continue;
      }

      // Mark boundary as started and unresolved
      boundaries.set(boundary.id, false);

      // Fire-and-forget: when resolved or timeout, mark and request rerender
      handleSuspensionForBoundary(boundary.instanceIds, boundary.timeout)
        .then(() => {
          boundary.isResolved = true;
          // Mark this boundary as resolved
          boundaries.set(boundary.id, true);

          // Only close the form when ALL started boundaries have resolved
          if (areAllBoundariesResolved()) {
            uiManager.closeAllForms(player);
          }
        });
    }
  }

  // Background effects loop
  const intervalId = system.runInterval(() => {
    for (const id of createdInstances) {
      const instance = options.registry.getInstance(id);
      if (instance) {
        executeEffects(instance);
      }
    }
  }, 1);

  await form.show(player).then(response => {
    system.clearRun(intervalId);

    // When player pressed escape key or equivalent, and when we use uiManager.closeAllForms()
    if (response.canceled) {
      const shouldRender = options.registry.getCurrentInstance()?.shouldRender;

      console.error(`RC: ${response.canceled}, SR: ${shouldRender}, BR: ${areAllBoundariesResolved()}`);

      // Player pressed ESC → re-render if boundaries unresolved and should render
      if (areAllBoundariesResolved() && shouldRender) {
        system.run(() => { render(player, rootElement, options); });
      } else {
        cleanupComponentTree(player, createdInstances, options.registry);
      }

      return;
    }

    // Button press
    if (response.selection !== undefined) {
      const callback = serializationContext.buttonCallbacks.get(response.selection);

      if (callback) {
        // Execute button callback
        Promise.resolve(callback())
          .then(() => {
            const shouldRender = options.registry.getCurrentInstance()?.shouldRender;

            if (shouldRender) {
              system.run(() => { render(player, rootElement, options); });
            } else {
              cleanupComponentTree(player, createdInstances, options.registry);
            }
          });
      }
    }
  });
}
