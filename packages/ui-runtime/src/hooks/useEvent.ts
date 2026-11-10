import { toSignal, type NativeSignal, type Signal } from '@bedrock-core/observable';
import { getCurrentFiber, invariant } from '../core';

/**
 * Subscribe to a framework Signal or Minecraft event.
 * Releases the subscription when it is replaced or the component unmounts.
 *
 * @typeParam T - Event payload type.
 * @typeParam O - Subscription options type for the event.
 * @param signal - A cleanup-return `Signal` or a `NativeSignal` with callback removal.
 * @param callback - Function invoked when the event fires.
 * @param options - Filters forwarded to native subscriptions.
 * @param deps - Additional values that trigger resubscription. The source, callback and options are always tracked.
 */
export function useEvent<T, O = never>(
  signal: Signal<T> | NativeSignal<T, O>,
  callback: (event: T) => void,
  options?: O,
  deps?: readonly unknown[],
): void {
  const [, d] = getCurrentFiber();

  invariant(d, 'useEvent');

  d.useEffect(() => {
    const source = 'unsubscribe' in signal ? toSignal(signal, options) : signal;

    return source.subscribe(callback);
  }, [signal, callback, options, ...(deps ?? [])]);
}
