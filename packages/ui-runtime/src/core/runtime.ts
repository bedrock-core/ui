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
    {
      shouldRerenderOnCancel(instances) {
        if (options.isFirstRender) {
          for (const id of instances) {
            const inst = fiberRegistry.getInstance(id);

            if (inst?.shouldClose === false) {
              return true;
            }
          }
        }

        return false;
      },
    },
    Array.from(suspenseBoundaryRegistry.values()),
  );
}

interface CancelStrategy { shouldRerenderOnCancel: (instances: Set<string>) => boolean }

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
  strategy: CancelStrategy,
  suspenseBoundaries?: SuspenseBoundary[],
): Promise<void> {
  // Prepare serialization context for button callbacks
  const serializationContext: SerializationContext = { buttonCallbacks: new Map(), buttonIndex: 0 };

  // Snapshot and show
  const form = new ActionFormData();
  form.title(PROTOCOL_HEADER);
  serialize(element, form, serializationContext);

  // Track if the current form was programmatically closed due to suspense resolution
  let formClosedForSuspense = false;

  // Kick off suspension helpers to run effects continuously during fallback
  const startedBoundaries = new Set<string>();
  if (suspenseBoundaries) {
    for (const boundary of suspenseBoundaries) {
      if (boundary.isResolved || startedBoundaries.has(boundary.id)) {
        continue;
      }

      startedBoundaries.add(boundary.id);

      // Fire-and-forget: when resolved or timeout, mark and request rerender
      handleSuspensionForBoundary(boundary.instanceIds, boundary.timeout)
        .then(() => {
          boundary.isResolved = true;
          // Mark that we are closing due to suspense so the cancel handler rerenders
          formClosedForSuspense = true;
          // Close the form so form.show() returns and we can render
          uiManager.closeAllForms(player);
        });
    }
  }

  // Background effects loop for dirty instances and suspension checking
  const intervalId = system.runInterval(() => {
    for (const id of createdInstances) {
      const instance = fiberRegistry.getInstance(id);
      if (instance?.dirty) {
        instance.dirty = false;
        executeEffects(instance);
      }
    }

    // Resolution handled by suspension helper; nothing to poll here
  }, 1);

  await form.show(player).then(response => {
    system.clearRun(intervalId);

    if (response.canceled) {
      // If form was closed due to suspension resolution, always render
      if (formClosedForSuspense) {
        formClosedForSuspense = false;
        system.run(() => { void render(player, rootElement, options); });

        return;
      }

      // Strategy-specific check (e.g., initial render may force re-render after suspense close)
      let shouldRerender = strategy.shouldRerenderOnCancel(createdInstances);

      if (shouldRerender) {
        system.run(() => { render(player, rootElement, options); });
      } else {
        cleanupComponentTree(player, createdInstances);
      }

      return;
    }

    if (response.selection !== undefined) {
      const callback = serializationContext.buttonCallbacks.get(response.selection);
      if (callback) {
        Promise.resolve(callback())
          .then(() => {
            let shouldCleanup = false;
            for (const id of createdInstances) {
              const instance = fiberRegistry.getInstance(id);
              if (instance?.shouldClose === true) {
                shouldCleanup = true;
                break;
              }
            }

            if (shouldCleanup) {
              cleanupComponentTree(player, createdInstances);
            } else {
              system.run(() => { void render(player, rootElement, options); });
            }
          })
          .catch(() => {
            system.run(() => { void render(player, rootElement, options); });
          });
      }
    }
  });
}
