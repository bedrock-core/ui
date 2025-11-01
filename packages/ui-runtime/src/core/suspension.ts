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
        // Always run executeEffects during suspension, not just for dirty instances.
        // This ensures effects with no dependency array can execute on each tick
        // and potentially call setState to resolve the suspension.
        executeEffects(instance);
      }
    }
  }, 1);

  // Wait for resolution of this boundary
  await waitForStateResolution(boundaryInstanceIds, timeout);

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

    const allStatesResolved: () => boolean = () => Array.from(instanceIds).every(id => {
      const instance = fiberRegistry.getInstance(id);

      if (!instance) {
        // Instance not found, skip
        return true;
      }

      const stateHooks = instance.hooks.filter(isStateHook);

      if (stateHooks.length === 0) {
        // No state hooks, skip
        return true;
      }

      for (const hook of stateHooks) {
        if (Object.is(hook.value, hook.initialValue)) {
          // At least one state hook is still at its initial value
          return false;
        }
      }

      return true;
    });

    if (allStatesResolved()) {
      resolve(true);

      return;
    }

    const intervalId = system.runInterval(() => {
      const elapsed = Date.now() - startTime;
      if (elapsed >= timeoutMs) {
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
