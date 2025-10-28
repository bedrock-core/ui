import { useState } from './useState';
import { fiberRegistry } from '../fiber';

/**
 * Marker interface for suspended state values.
 * Used internally to track initialization status.
 */
export interface SuspendedStateMarker {
  __suspended: true;
  __initialized: boolean;
}

/**
 * Hook that creates a state which can be suspended by a parent <Suspense> boundary.
 *
 * The state starts in a "suspended" state with a default value. When the value
 * is updated to something different from the default for the first time,
 * a nearby <Suspense> boundary will detect this and allow the component to render.
 *
 * This hook does nothing on its own - it must be used within a <Suspense> boundary
 * to have any effect.
 *
 * @param defaultValue - Initial value while suspended
 * @returns Tuple of [value, setValue] similar to useState
 *
 * @example
 * // This suspends until data loads
 * function DataPanel() {
 *   const [data, setData] = useSuspendedState<Data | null>(null);
 *
 *   useEffect(() => {
 *     fetchData().then(setData); // Resolves suspension
 *   }, []);
 *
 *   return <Panel><Text value={data?.name} /></Panel>;
 * }
 *
 * // Use with Suspense boundary
 * function App() {
 *   return (
 *     <Suspense fallback={<Loading />}>
 *       <DataPanel />
 *     </Suspense>
 *   );
 * }
 */
export function useSuspendedState<T>(defaultValue: T): [T, (value: T) => void] {
  const instance = fiberRegistry.getCurrentInstance();

  if (!instance) {
    throw new Error(
      'useSuspendedState can only be called from within a component. ' +
      'Make sure you are calling it at the top level of your component function.',
    );
  }

  // Mark instance as having suspended state
  instance.hasSuspendedState = true;

  // Initialize the callbacks-fired tracking set on first render
  if (!instance.suspendedStateCallbacksFired) {
    instance.suspendedStateCallbacksFired = new Set();
  }

  // Capture the current hook index BEFORE calling useState (which increments it)
  const hookIndexBeforeState = instance.hookIndex;

  // Create suspended state wrapper
  type SuspendedStateValue = SuspendedStateMarker & { value: T };

  const [state, setState] = useState<SuspendedStateValue>({
    __suspended: true,
    __initialized: false,
    value: defaultValue,
  });

  // Return a setter that marks initialized only when value changes from default
  const setSuspendedState = (newValue: T): void => {
    // Check if THIS SPECIFIC HOOK has already fired its callback
    const hasAlreadyFired = instance.suspendedStateCallbacksFired?.has(hookIndexBeforeState);

    // Use Object.is() to detect actual changes
    const hasChanged = !Object.is(newValue, defaultValue);
    const valueActuallyChanged = !Object.is(newValue, state.value);

    // If value didn't actually change and callback already fired, skip setState entirely
    if (!valueActuallyChanged && hasAlreadyFired) {
      return;
    }

    setState({
      __suspended: true,
      __initialized: hasChanged, // Only set to true if value changed from default
      value: newValue,
    });

    // Notify parent Suspense boundary ONLY if:
    // 1. State changed from default
    // 2. This specific hook hasn't fired its callback yet
    if (hasChanged && !hasAlreadyFired && instance.onSuspendedStateInitialize) {
      instance.suspendedStateCallbacksFired?.add(hookIndexBeforeState);
      instance.onSuspendedStateInitialize();
      console.log('fuck you');
    }
  };

  return [state.value, setSuspendedState];
}
