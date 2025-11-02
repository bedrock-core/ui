import type { Player } from '@minecraft/server';
import { system } from '@minecraft/server';
import { ActionFormData, uiManager } from '@minecraft/server-ui';
import type { FunctionComponent, JSX } from '../jsx';
import { startInputLock, stopInputLock } from '../util';
import { getFiber, getFibersForPlayer, handleSuspensionForBoundary } from './fabric';
import { buildTree, cleanupComponentTree } from './render';
import { PROTOCOL_HEADER, serialize } from './serializer';
import type { SerializationContext } from './types';

/** Entry point that constructs a Runtime and starts the loop. */
export async function render(
  player: Player,
  root: JSX.Element | FunctionComponent,
): Promise<void> {
  startInputLock(player);

  // Convert function component to JSX element if needed
  const rootElement: JSX.Element = typeof root === 'function' ? { type: root, props: {} } : root;

  // Build complete tree (instances created, hooks initialized)
  const tree = await buildTree(rootElement, player);

  await presentCycle(
    player,
    tree,
    rootElement,
  );
}

/**
 * Shared present cycle: serialize tree, show form, handle response.
 * Parameterized by cancel strategy and reinvoke function for subsequent updates.
 */
async function presentCycle(
  player: Player,
  element: JSX.Element,
  rootElement: JSX.Element,
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
  let shouldRerender = true;

  // Fiber-native suspense discovery: scan fibers for player
  // Identify boundary fibers and start polling for each unresolved boundary
  const playerFiberIds = getFibersForPlayer(player);
  const boundaryFibers = playerFiberIds
    .map(id => getFiber(id))
    .filter((f): f is NonNullable<ReturnType<typeof getFiber>> => !!f && !!f.suspense);

  if (boundaryFibers.length > 0) {
    shouldRerender = false;

    for (const boundaryFiber of boundaryFibers) {
      const { id: boundaryId, isResolved, timeout } = boundaryFiber.suspense!;
      if (isResolved || boundaries.has(boundaryId)) continue;

      // Compute current instance set under this boundary by scanning fibers
      const instanceIds = new Set<string>();
      for (const id of playerFiberIds) {
        const f = getFiber(id);
        if (f?.nearestBoundaryId === boundaryId) instanceIds.add(id);
      }

      if (instanceIds.size === 0) continue;

      boundaries.set(boundaryId, false);

      handleSuspensionForBoundary(instanceIds, timeout)
        .then(() => {
          const bf = getFiber(boundaryFiber.id);
          if (bf?.suspense) bf.suspense.isResolved = true;
          boundaries.set(boundaryId, true);

          if (areAllBoundariesResolved()) {
            shouldRerender = true;
            uiManager.closeAllForms(player);
          }
        });
    }
  }

  await form.show(player).then(response => {
    // When player pressed escape key or equivalent, and when we use uiManager.closeAllForms()
    if (response.canceled) {
      // Player pressed ESC → re-render if all boundaries resolved and no fiber flagged exit
      if (shouldRerender) {
        system.run(() => { render(player, rootElement); });
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
              .map(id => getFiber(id))
              .some(fiber => fiber?.shouldRender === false);

            if (!shouldClose) {
              system.run(() => { render(player, rootElement); });
            } else {
              stopInputLock(player);
              cleanupComponentTree(player);
            }
          });
      }
    }
  });
}
