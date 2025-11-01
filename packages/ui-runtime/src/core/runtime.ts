import type { Player } from '@minecraft/server';
import { system } from '@minecraft/server';
import { ActionFormData, uiManager } from '@minecraft/server-ui';
import type { SuspenseBoundary } from '../components/Suspense';
import { suspenseBoundaryRegistry } from '../components/Suspense';
import { executeEffects } from '../hooks';
import type { FunctionComponent, JSX } from '../jsx';
import { startInputLock } from '../util';
import { fiberRegistry } from './fiber';
import { buildTree, cleanupComponentTree } from './render';
import { PROTOCOL_HEADER, serialize } from './serializer';
import { handleSuspensionForBoundary } from './suspension';
import type {
  RenderOptions,
  SerializationContext
} from './types';

/** Entry point that constructs a Runtime and starts the loop. */
export async function render(
  player: Player,
  root: JSX.Element | FunctionComponent,
  options: RenderOptions = { isFirstRender: true },
): Promise<void> {
  // Convert function component to JSX element if needed
  const rootElement: JSX.Element = typeof root === 'function' ? { type: root, props: {} } : root;

  // Begin: input lock
  if (options.isFirstRender) {
    startInputLock(player);
    options.isFirstRender = false;
  }
  // Build complete tree (instances created, hooks initialized)
  const builtTree = buildTree(rootElement, player);

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
    options,
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
  options: RenderOptions | undefined,
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

          console.log(`[Suspense] Boundary ${boundary.id} resolved.`);

          // Only close the form when ALL started boundaries have resolved
          if (areAllBoundariesResolved()) {
            console.log('[Suspense] All boundaries resolved, re-rendering UI.');
            uiManager.closeAllForms(player);
          }
        });
    }
  }

  // Background effects loop
  const intervalId = system.runInterval(() => {
    for (const id of createdInstances) {
      const instance = fiberRegistry.getInstance(id);

      if (instance) {
        executeEffects(instance);
      }
    }
  }, 1);

  await form.show(player).then(response => {
    system.clearRun(intervalId);

    // When player pressed escape key or equivalent and when we use uiManager.closeAllForms()
    if (response.canceled) {
      if (areAllBoundariesResolved()) {
        system.run(() => { render(player, rootElement, options); });
      } else {
        cleanupComponentTree(player, createdInstances);
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
            let shouldClose = Array.from(createdInstances).some(id => fiberRegistry.getInstance(id)?.shouldClose);

            if (shouldClose) {
              cleanupComponentTree(player, createdInstances);
            } else {
              system.run(() => { render(player, rootElement, options); });
            }
          });
      }
    }
  });
}
