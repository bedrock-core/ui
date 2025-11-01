/**
 * Type representing a Minecraft event signal that can be subscribed to.
 * Compatible with Minecraft's event signal pattern (world.afterEvents.*, world.beforeEvents.*, etc.)
 *
 * Pattern: signal.subscribe(callback, options?) returns the callback itself,
 * and signal.unsubscribe(callback) must be called explicitly to remove the listener.
 */
export interface EventSignal<T, TOptions = Record<string, unknown>> {

  /**
   * Subscribe to the event signal with a callback
   * @param callback Function to call when the event fires
   * @param options Optional subscription options (e.g., BlockEventOptions with blockTypes, permutations)
   * @returns The callback that was registered (Minecraft pattern)
   */
  subscribe(callback: (event: T) => void, options?: TOptions): (event: T) => void;

  /**
   * Unsubscribe a callback from the event signal
   * @param callback Function to remove from listeners
   */
  unsubscribe(callback: (event: T) => void): void;
}
