import { system } from '@minecraft/server';
import { executeEffects } from '../hooks';
import { isStateHook } from '../hooks/useState';
import { fiberRegistry } from './fiber';

/**
 * Executes effects for all components within a suspense boundary, repeatedly re-running them
 * while the boundary is suspended. Continues polling until all state hooks within the boundary
 * have resolved (i.e., their values differ from initial), or until the given timeout elapses.
 * Once resolved or timed out, stops polling and allows normal rendering to resume.
 *
 * @internal
 */

export async function handleSuspensionForBoundary(
  boundaryInstanceIds: Set<string>,
  timeout: number,
): Promise<void> {
  // Execute main component effects immediately
  for (const id of boundaryInstanceIds) {
    const instance = fiberRegistry.getInstance(id);

    if (instance) {
      executeEffects(instance);

      if (!instance.mounted) {
        instance.mounted = true;
      }
    }
  }

  // Start loop for subsequent state changes on boundary instances
  // During suspension, we always execute effects (including those with no deps)
  // so they can call setState and update the component state
  const mainIntervalId = system.runInterval(() => {
    for (const id of boundaryInstanceIds) {
      const instance = fiberRegistry.getInstance(id);

      if (instance) {
        // Always run executeEffects during suspension
        // This ensures effects with no dependency array can execute on each tick
        // and potentially call setState to resolve the suspension.
        executeEffects(instance);
      }
    }
  }, 1);

  // Wait for resolution of this boundary
  waitForStateResolution(boundaryInstanceIds, timeout);

  // Stop loop
  system.clearRun(mainIntervalId);
}

/**
 * Wait for all useState values in the given instances to differ from their initial values,
 * or until timeout.
 *
 * @internal
 */
async function waitForStateResolution(
  instanceIds: Set<string>,
  timeoutMs: number,
): Promise<boolean> {
  return new Promise<boolean>(resolve => {
    const startTime = Date.now();

    // If no instance, no hooks, or all states already resolved, resolve immediately
    const allStatesResolved: () => boolean = () => Array.from(instanceIds)
      .every(id => fiberRegistry
        .getInstance(id)?.hooks
        .filter(isStateHook)
        .every(hook => !Object.is(hook.value, hook.initialValue))
        ?? true);

    if (allStatesResolved()) {
      resolve(true);

      return;
    }

    const intervalId = system.runInterval(() => {
      const elapsed = Date.now() - startTime;

      if (elapsed >= timeoutMs) {
        console.warn(`[Suspense] Timeout of ${timeoutMs}ms while waiting for state resolution of instances: ${Array.from(instanceIds).join('\n')}`);
        system.clearRun(intervalId);

        resolve(false);

        return;
      }

      if (allStatesResolved()) {
        system.clearRun(intervalId);

        resolve(true);
      }
    }, 1);
  });
}
