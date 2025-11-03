/**
 * Functional boundary event system using callbacks
 * Pure functions for managing Suspense boundary resolution via event emitters
 *
 * Provides observable pattern without classes:
 * - Create an event state
 * - Subscribe to boundary resolution events
 * - Emit resolution events when boundaries complete
 * - Check resolution status with selectors
 *
 * All functions are pure - state is passed explicitly.
 */

/**
 * Event fired when a boundary resolution completes.
 */
export interface BoundaryResolutionEvent {

  /** Boundary identifier that was resolved */
  boundaryId: string;

  /** Whether resolution succeeded (true) or timed out (false) */
  resolved: boolean;

  /** Timestamp when resolution was emitted */
  timestamp: number;
}

/**
 * Callback function that receives resolution events.
 */
export type BoundaryListener = (event: BoundaryResolutionEvent) => void;

/**
 * Mutable state for boundary event management.
 * Tracks listeners and resolved boundaries.
 */
export interface BoundaryEventState {

  /** Map of boundaryId → array of listener callbacks */
  listeners: Map<string, BoundaryListener[]>;

  /** Set of boundary IDs that have been resolved */
  resolved: Set<string>;
}

/**
 * Create a new boundary event state.
 * Call this once per presentCycle to manage boundary events.
 *
 * @example
 * ```ts
 * const events = createBoundaryEventState();
 * ```
 */
export function createBoundaryEventState(): BoundaryEventState {
  return {
    listeners: new Map(),
    resolved: new Set(),
  };
}

/**
 * Subscribe to a boundary resolution event.
 * When the boundary resolves, the listener will be called with the event.
 * Returns an unsubscribe function to remove the listener.
 *
 * @param state - Event state to subscribe to
 * @param boundaryId - Boundary ID to listen for
 * @param listener - Callback function that receives the event
 * @returns Function to unsubscribe the listener
 *
 * @example
 * ```ts
 * const events = createBoundaryEventState();
 * const unsubscribe = subscribeToBoundary(events, 'boundary-1', (event) => {
 *   console.log(`Boundary ${event.boundaryId} resolved:`, event.resolved);
 * });
 * // Later:
 * unsubscribe();
 * ```
 */
export function subscribeToBoundary(
  state: BoundaryEventState,
  boundaryId: string,
  listener: BoundaryListener,
): () => void {
  // Ensure listeners array exists for this boundary
  if (!state.listeners.has(boundaryId)) {
    state.listeners.set(boundaryId, []);
  }

  // Add listener to the array
  state.listeners.get(boundaryId)!.push(listener);

  // Return unsubscribe function
  return () => {
    const listeners = state.listeners.get(boundaryId);
    if (listeners) {
      const idx = listeners.indexOf(listener);
      if (idx > -1) listeners.splice(idx, 1);
    }
  };
}

/**
 * Emit a boundary resolution event to all listeners.
 * Safe to call multiple times - only the first call has effect per boundary.
 *
 * @param state - Event state to emit from
 * @param boundaryId - Boundary that has been resolved
 * @param success - Whether resolution was successful
 *
 * @example
 * ```ts
 * const events = createBoundaryEventState();
 * subscribeToBoundary(events, 'boundary-1', (event) => {
 *   console.log('Resolved:', event.resolved);
 * });
 * emitBoundaryResolution(events, 'boundary-1', true);
 * ```
 */
export function emitBoundaryResolution(
  state: BoundaryEventState,
  boundaryId: string,
  success: boolean,
): void {
  // Skip if already resolved
  if (state.resolved.has(boundaryId)) return;

  // Mark as resolved
  state.resolved.add(boundaryId);

  // Get listeners for this boundary
  const listeners = state.listeners.get(boundaryId) || [];

  // Create event object
  const event: BoundaryResolutionEvent = {
    boundaryId,
    resolved: success,
    timestamp: Date.now(),
  };

  // Call each listener safely (catch errors to prevent one failure from stopping others)
  listeners.forEach(listener => {
    try {
      listener(event);
    } catch (err) {
      // Log error but don't stop other listeners
      console.error(`Boundary listener error for ${boundaryId}:`, err);
    }
  });
}

/**
 * Check if all specified boundaries have been resolved.
 * Selector function - safe to call multiple times.
 *
 * @param state - Event state to check
 * @param boundaryIds - Array of boundary IDs to check
 * @returns True if all boundaries are resolved
 *
 * @example
 * ```ts
 * const events = createBoundaryEventState();
 * emitBoundaryResolution(events, 'boundary-1', true);
 * emitBoundaryResolution(events, 'boundary-2', true);
 *
 * const allResolved = areAllBoundariesResolved(events, ['boundary-1', 'boundary-2']);
 * console.log(allResolved); // true
 * ```
 */
export function areAllBoundariesResolved(
  state: BoundaryEventState,
  boundaryIds: string[],
): boolean {
  return boundaryIds.every(id => state.resolved.has(id));
}

/**
 * Get the resolution status of a specific boundary.
 * Selector function - safe to call multiple times.
 *
 * @param state - Event state to check
 * @param boundaryId - Boundary ID to check
 * @returns 'resolved' if the boundary has been resolved, 'pending' otherwise
 *
 * @example
 * ```ts
 * const events = createBoundaryEventState();
 * const status = getBoundaryStatus(events, 'boundary-1');
 * console.log(status); // 'pending'
 *
 * emitBoundaryResolution(events, 'boundary-1', true);
 * const newStatus = getBoundaryStatus(events, 'boundary-1');
 * console.log(newStatus); // 'resolved'
 * ```
 */
export function getBoundaryStatus(
  state: BoundaryEventState,
  boundaryId: string,
): 'resolved' | 'pending' {
  return state.resolved.has(boundaryId) ? 'resolved' : 'pending';
}

/**
 * Get all resolved boundary IDs.
 * Selector function - returns a copy of the set.
 *
 * @param state - Event state to query
 * @returns Set of boundary IDs that have been resolved
 *
 * @example
 * ```ts
 * const events = createBoundaryEventState();
 * emitBoundaryResolution(events, 'boundary-1', true);
 * emitBoundaryResolution(events, 'boundary-2', true);
 *
 * const resolved = getResolvedBoundaries(events);
 * console.log(resolved); // Set { 'boundary-1', 'boundary-2' }
 * ```
 */
export function getResolvedBoundaries(state: BoundaryEventState): Set<string> {
  return new Set(state.resolved);
}

/**
 * Clean up all state in the event system.
 * Call this when presentCycle ends to free resources.
 *
 * @param state - Event state to clean up
 *
 * @example
 * ```ts
 * const events = createBoundaryEventState();
 * // ... use events ...
 * resetBoundaryEventState(events);
 * ```
 */
export function resetBoundaryEventState(state: BoundaryEventState): void {
  state.listeners.clear();
  state.resolved.clear();
}
