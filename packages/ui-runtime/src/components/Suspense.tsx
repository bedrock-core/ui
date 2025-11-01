import { createContext } from '../core';
import { useState } from '../hooks';
import type { FunctionComponent, JSX } from '../jsx';
import { Fragment } from './Fragment';

/**
 * Props for the Suspense component
 */
export interface SuspenseProps extends JSX.Props {

  /**
   * Fallback UI to show while waiting for children to resolve their state.
   * Only applies when children have effects that need to complete.
   *
   * @default <Panel><Text text="Loading..." /></Panel>
   */
  fallback?: JSX.Element;

  /**
   * Maximum time in milliseconds to wait for child state resolution.
   * After timeout, shows main UI regardless of state resolution status.
   *
   * @default 1000
   */
  awaitTimeout?: number;
}

/**
 * Suspense boundary context - marks component instances as belonging to a specific Suspense boundary.
 * Used internally to track which instances should be waited on during suspension.
 *
 * @internal
 */
export interface SuspenseBoundary {
  id: string;
  instanceIds: Set<string>;
  fallback?: JSX.Element;
  timeout: number;
  isResolved: boolean; // Flag: set to true once suspension resolves
}

export const SuspenseContext = createContext<SuspenseBoundary | undefined>(undefined);

/**
 * Global map to track which Suspense boundaries exist and their child instances.
 * Populated during tree building when Suspense components are rendered.
 *
 * @internal
 */
export const suspenseBoundaryRegistry = new Map<string, SuspenseBoundary>();

/**
 * Suspense component - creates a boundary for local state resolution.
 *
 * Wraps children and waits for their useState values to differ from initial values
 * before rendering them to the UI. Shows fallback UI during the wait period.
 *
 * Unlike global suspension at the render() level, each Suspense component
 * independently waits for its own children, allowing multiple suspense boundaries
 * to resolve in parallel.
 *
 * @example
 * ```tsx
 * <Suspense fallback={<LoadingPanel />} awaitTimeout={2000}>
 *   <MetadataDisplay />
 *   <DataFetch />
 * </Suspense>
 * ```
 *
 * @internal Implementation is handled by the runtime during tree building and rendering.
 */
export const Suspense: FunctionComponent<SuspenseProps> = ({ children, fallback, awaitTimeout }: SuspenseProps): JSX.Element => {
  // Generate unique boundary ID for this Suspense instance
  const [boundaryState] = useState<SuspenseBoundary>(() => {
    const boundaryId = `suspense-${Math.random().toString(36).substring(2, 9)}`;
    const boundary: SuspenseBoundary = {
      id: boundaryId,
      instanceIds: new Set(),
      fallback,
      timeout: awaitTimeout ?? 1000,
      isResolved: false,
    };

    // Register globally so runtime can find it
    suspenseBoundaryRegistry.set(boundaryId, boundary);

    return boundary;
  });

  // Always build both branches so child effects can run while suspended.
  // Show/hide via control.visible using Fragment as a neutral container.
  return (
    <>
      <Fragment visible={boundaryState.isResolved}>
        <SuspenseContext.Provider value={boundaryState}>{children}</SuspenseContext.Provider>
      </Fragment>
      {boundaryState.fallback && <Fragment visible={!boundaryState.isResolved}>{boundaryState.fallback}</Fragment>}
    </>
  );
};
