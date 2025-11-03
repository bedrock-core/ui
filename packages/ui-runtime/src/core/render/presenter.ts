import type { Player } from '@minecraft/server';
import { system } from '@minecraft/server';
import { ActionFormData, uiManager } from '@minecraft/server-ui';
import type { JSX } from '../../jsx';
import { stopInputLock } from '../../util';
import {
  createBoundaryEventState,
  subscribeToBoundary,
  emitBoundaryResolution,
  areAllBoundariesResolved,
  getFiber,
  getFibersForPlayer,
  handleSuspensionForBoundary
} from '../fabric';
import { PROTOCOL_HEADER, serialize } from '../serializer';
import type { SerializationContext } from '../types';
import { render } from './lifecycle';
import { cleanupComponentTree } from './tree';
import { Fiber, SuspendedFiber } from '../fabric/types';

/**
 * Shared present cycle: serialize tree, show form, handle response.
 * This manages the form lifecycle including:
 * - Serializing the element tree
 * - Displaying the form to the player
 * - Handling button presses and ESC key
 * - Managing Suspense boundary resolution
 * - Re-rendering or cleanup as needed
 */
export async function presentCycle(
  player: Player,
  tree: JSX.Element,
  rootElement: JSX.Element,
): Promise<void> {
  // Prepare serialization context for button callbacks
  const serializationContext: SerializationContext = { buttonCallbacks: new Map(), buttonIndex: 0 };

  // Snapshot and show
  const form = new ActionFormData();
  form.title(PROTOCOL_HEADER);
  serialize(tree, form, serializationContext);

  // Coordinate boundary resolutions using events pattern
  const boundaryEvents = createBoundaryEventState();
  let shouldRerender = true;

  // Fiber-native suspense discovery: scan fibers for player ONCE (optimization)
  // Identify boundary fibers and start polling for each unresolved boundary
  const playerFibers = getFibersForPlayer(player);
  const boundaryFibers = playerFibers.filter(f => !!f.suspense);

  if (boundaryFibers.length > 0) {
    shouldRerender = false;

    // Collect unresolved boundary IDs
    const unresolvedBoundaryIds = boundaryFibers
      .filter((bf: Fiber): bf is SuspendedFiber => bf.suspense !== undefined && !bf.suspense.isResolved)
      .map(bf => bf.suspense.id);

    if (unresolvedBoundaryIds.length > 0) {
      // Subscribe to resolution events for each boundary
      unresolvedBoundaryIds.forEach(boundaryId => {
        subscribeToBoundary(boundaryEvents, boundaryId, () => {
          // When all boundaries are resolved, close the form to trigger re-render
          if (areAllBoundariesResolved(boundaryEvents, unresolvedBoundaryIds)) {
            shouldRerender = true;
            uiManager.closeAllForms(player);
          }
        });
      });

      // Start polling each boundary
      unresolvedBoundaryIds.forEach(boundaryId => {
        const boundaryFiber = boundaryFibers.find(bf => bf.suspense?.id === boundaryId);
        if (!boundaryFiber) return;

        // Get the timeout for this boundary
        const { timeout } = boundaryFiber.suspense!;

        // Compute current instance set under this boundary using cached metadata
        const instanceIds = new Set(
          playerFibers
            .filter(fiber => fiber?.nearestBoundaryId === boundaryId)
            .map(fiber => fiber.id),
        );

        if (instanceIds.size === 0) return;

        // Start polling this boundary
        handleSuspensionForBoundary(instanceIds, timeout)
          .then(resolved => {
            // Mark fiber as resolved
            const bf = getFiber(boundaryFiber.id);
            if (bf?.suspense) bf.suspense.isResolved = true;

            // Emit resolution event to all listeners
            emitBoundaryResolution(boundaryEvents, boundaryId, resolved);
          });
      });
    }
  }

  await form.show(player).then(response => {
    // When player pressed escape key or equivalent, and when we use uiManager.closeAllForms()
    if (response.canceled) {
      // Player pressed ESC → re-render if all boundaries resolved and no fiber flagged exit
      if (shouldRerender) {
        system.run(() => { render(rootElement, player); });
      } else {
        stopInputLock(player);
        cleanupComponentTree(player);
      }

      return;
    }

    // Button press
    if (response.selection !== undefined) {
      const callback = serializationContext.buttonCallbacks.get(response.selection);

      if (callback) {
        // Execute button callback then rerender (unless useExit was called)
        Promise.resolve(callback())
          .then(() => {
            const shouldClose = getFibersForPlayer(player)
              .some(fiber => !fiber.shouldRender);

            if (!shouldClose) {
              system.run(() => { render(rootElement, player); });
            } else {
              stopInputLock(player);
              cleanupComponentTree(player);
            }
          });
      }
    }
  });
}
