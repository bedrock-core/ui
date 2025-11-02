import { system } from '@minecraft/server';
import { getFiber } from './fiber';
import { Logger } from '../../util';

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
): Promise<boolean> {
  // Take a baseline snapshot of all state slots for each fiber
  const baseline: Map<string, unknown[]> = new Map();

  for (const id of boundaryInstanceIds) {
    const fiber = getFiber(id);

    if (!fiber) {
      continue;
    }

    const initialStates: unknown[] = [];

    for (const slot of fiber.hookStates) {
      if (slot?.tag === 'state') {
        initialStates.push(slot.value);
      }
    }
    baseline.set(id, initialStates);
  }

  // If nothing to wait on, resolve immediately
  if (baseline.size === 0) {
    return true;
  }

  return new Promise<boolean>(resolve => {
    const startTime = Date.now();

    const allStatesResolved = (): boolean => {
      for (const [id, initialValues] of baseline) {
        const fiber = getFiber(id);

        if (!fiber) {
          continue;
        }

        // Collect current state slot values in order
        const currentValues: unknown[] = [];

        for (const slot of fiber.hookStates) {
          if (slot?.tag === 'state') {
            currentValues.push(slot.value);
          }
        }

        // If counts differ, treat as not resolved yet (new state slots may appear)
        if (currentValues.length !== initialValues.length) {
          return false;
        }

        // All state slots must differ from their baseline (Object.is !==)
        for (let i = 0; i < currentValues.length; i++) {
          if (Object.is(currentValues[i], initialValues[i])) {
            return false;
          }
        }
      }

      return true;
    };

    if (allStatesResolved()) {
      resolve(true);

      return;
    }

    const intervalId = system.runInterval(() => {
      const elapsed = Date.now() - startTime;

      if (elapsed >= timeout) {
        system.clearRun(intervalId);

        Logger.error(`Suspense boundary timed out after ${timeout}ms`);

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
