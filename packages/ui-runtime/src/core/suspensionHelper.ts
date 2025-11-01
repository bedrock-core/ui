import type { Player } from '@minecraft/server';
import { system } from '@minecraft/server';
import { executeEffects } from '../hooks';
import type { StateHook } from '../hooks/types';
import type { FunctionComponent, JSX } from '../jsx';
import { fiberRegistry } from './fiber';

/**
 * Internal: Wait for all useState values in the given instances to differ from their initial values,
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

    const checkStates = (): boolean => {
      let allResolved = true;

      for (const id of instanceIds) {
        const instance = fiberRegistry.getInstance(id);
        if (!instance) {
          continue;
        }

        const stateHooks = instance.hooks.filter(h => h?.type === 'state');
        if (stateHooks.length === 0) {
          continue;
        }

        for (const hook of stateHooks) {
          if (hook.type === 'state') {
            const stateHook = hook as StateHook;
            if (Object.is(stateHook.value, stateHook.initialValue)) {
              allResolved = false;
            } else {
            }
          }
        }
      }

      return allResolved;
    };

    if (checkStates()) {
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

      if (checkStates()) {
        system.clearRun(intervalId);
        resolve(true);
      }
    }, 1);
  });
}

/**
 * Internal: Show fallback UI for a single suspense boundary while running effects,
 * wait for state resolution, then close fallback and proceed.
 *
 * @internal
 */
export async function handleSuspensionForBoundary(
  _player: Player,
  fallbackComponent: JSX.Element | FunctionComponent | undefined,
  boundaryInstanceIds: Set<string>,
  timeout: number,
): Promise<void> {
  // Note: fallback UI is NOT shown here. Instead:
  // 1. We execute effects for boundary instances immediately
  // 2. We wait for state resolution while effects run
  // 3. After resolution, presentCycle shows the real form with resolved state
  //
  // This avoids the gap where nothing is displayed between closing fallback and showing real form.
  void fallbackComponent; // Mark as intentionally unused for now

  // Execute main component effects immediately
  for (const id of boundaryInstanceIds) {
    const instance = fiberRegistry.getInstance(id);
    if (instance) {
      executeEffects(instance);
      if (!instance.mounted) instance.mounted = true;
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

  // Don't close forms—presentCycle will show the real form with resolved state
}
