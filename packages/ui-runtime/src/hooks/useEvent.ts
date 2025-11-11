
import { getCurrentFiber, invariant } from '../core';

/**
 * Type representing a Minecraft event signal that can be subscribed to.
 */
export interface EventSignal<T, O> {

  /**
   * Subscribe to the event signal with a callback
   * @param callback Function to call when the event fires
   * @param options Optional subscription options (e.g., BlockEventOptions with blockTypes, permutations)
   * @returns The callback that was registered (Minecraft pattern)
   */
  subscribe(callback: (event: T) => void, options?: O): (event: T) => void;

  /**
   * Unsubscribe a callback from the event signal
   * @param callback Function to remove from listeners
   */
  unsubscribe(callback: (event: T) => void): void;
}

/**
 * Event subscription hook for Minecraft events.
 * Subscribes on mount, updates the subscription when dependencies change, and unsubscribes on unmount.
 *
 * @typeParam T - Event payload type.
 * @typeParam O - Subscription options type for the event.
 * @param signal - Event signal with `subscribe` and `unsubscribe` methods.
 * @param callback - Function invoked when the event fires.
 * @param options - Optional options forwarded to `subscribe`.
 * @param deps - Optional dependency list to resubscribe when values change. Omit for stable subscription.
 */
export function useEvent<T, O>(
  signal: EventSignal<T, O>,
  callback: (event: T) => void,
  options?: O,
  deps?: unknown[],
): void {
  const [, d] = getCurrentFiber();

  invariant(d, 'useEvent');

  d.useEvent<T, O>(signal, callback, options, deps);
}
