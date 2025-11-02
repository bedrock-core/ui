import { createContext, getCurrentFiber } from '../core';
import type { FunctionComponent, JSX } from '../jsx';

/**
 * Props for the Suspense component
 */
export interface SuspenseProps {

  /**
   * Fallback UI to show while waiting for children to resolve their state.
   * Only applies when children have effects that need to complete.
   *
   * @default <Panel><Text value="Loading..." /></Panel>
   */
  fallback?: JSX.Element;

  /**
   * Maximum time in milliseconds to wait for child state resolution.
   * After timeout, shows main UI regardless of state resolution status.
   *
   * @default 1000
   */
  awaitTimeout?: number;

  /**
   * Child nodes to be wrapped by the Suspense boundary.
   */
  children: JSX.Node;
}

/**
 * Suspense boundary context - marks component instances as belonging to a specific Suspense boundary.
 * Used internally to track which instances should be waited on during suspension.
 *
 * @internal
 */
export interface SuspenseBoundaryContextValue { id: string }

export const SuspenseContext = createContext<SuspenseBoundaryContextValue | undefined>(undefined);

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

  // Initialize or refresh boundary metadata on this fiber
  if (!fiber.suspense) {
    fiber.suspense = {
      id: `suspense-${Math.random().toString(36).substring(2, 9)}`,
      timeout: awaitTimeout ?? 1000,
      isResolved: false,
    };
  } else {
    // Update timeout if prop changes between renders
    fiber.suspense.timeout = awaitTimeout ?? fiber.suspense.timeout;
  }

  const boundaryId = fiber.suspense.id;
  // const isResolved = fiber.suspense.isResolved;

  return (
    <>
      <SuspenseContext value={{ id: boundaryId }}>
        {children}
      </SuspenseContext>
      {fallback && <>{fallback}</>}
    </>
  );
};
