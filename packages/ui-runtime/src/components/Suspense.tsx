import { system } from '@minecraft/server';
import { getCurrentFiber } from '../core';
import type { FunctionComponent, JSX } from '../jsx';
import { Panel } from './Panel';

/**
 * Props for the Suspense component
 */
export interface SuspenseProps {

  /**
   * Fallback UI to show while waiting for children to resolve their state.
   * Only applies when children have effects that need to complete.
   */
  fallback?: JSX.Element;

  /**
   * Maximum time in ticks to wait for child state resolution.
   * After timeout, shows main UI regardless of state resolution status.
   *
   * @default 20
   */
  awaitTimeout?: number;

  /**
   * Child nodes to be wrapped by the Suspense boundary.
   */
  children: JSX.Node;
}

/**
 * Suspense component - creates a boundary for local state resolution.
 *
 * Wraps children and waits for their useState values to differ from initial values
 * before rendering them to the UI. Shows fallback UI during the wait period.
 *
 * Each Suspense component independently waits for its own children, allowing
 * multiple suspense boundaries to resolve in parallel.
 *
 * @example
 * ```tsx
 * <Suspense fallback={<LoadingPanel />} awaitTimeout={2000}>
 *   <MetadataDisplay />
 *   <DataFetch />
 * </Suspense>
 * ```
 *
 */
export const Suspense: FunctionComponent<SuspenseProps> = ({ children, fallback, awaitTimeout }: SuspenseProps): JSX.Element => {
  const [fiber] = getCurrentFiber();

  if (!fiber) {
    // Invariant: Suspense must run under an active fiber
    throw new Error('[Suspense] Missing current fiber context');
  }

  // Initialize boundary metadata on this fiber
  if (!fiber.isSuspenseBoundary) {
    fiber.isSuspenseBoundary = true;

    fiber.suspense = {
      isResolved: false,
      startTick: system.currentTick,
      awaitTimeout: awaitTimeout ?? 20,
    };
  }

  return (
    <>
      <Panel width={0} height={0} visible={fiber.suspense?.isResolved}>{children}</Panel>
      {fallback && !fiber.suspense?.isResolved && <>{fallback}</>}
    </>
  );
};
