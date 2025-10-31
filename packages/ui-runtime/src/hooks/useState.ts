import { StateHook, Hook, ComponentInstance } from './types';
import { fiberRegistry } from '../core/fiber';

/**
 * Type guard to check if a hook is a StateHook
 */
function isStateHook(hook: Hook): hook is StateHook {
  return hook.type === 'state';
}

function isInitialValueFunction<T>(value: T | (() => T)): value is () => T {
  return typeof value === 'function';
}

function isNextValueFunction<T>(value: T | ((prevValue: T) => T)): value is (prevValue: T) => T {
  return typeof value === 'function';
}

/**
 * useState hook - manages component local state
 * @param initialValue - Initial state value or initializer function
 * @returns [state, setState] tuple
 *
 * @example
 * const [count, setCount] = useState<number>(0);
 * setCount(5);  // Direct value
 * setCount(c => c + 1);  // Updater function
 */
export function useState<T>(initialValue: T | (() => T)): [T, (nextValue: T | ((prevValue: T) => T)) => void] {
  const instance: ComponentInstance | undefined = fiberRegistry.getCurrentInstance();

  if (!instance) {
    throw new Error(
      'useState can only be called from within a component. ' +
      'Make sure you are calling it at the top level of your component function.',
    );
  }

  const hookIndex: number = instance.hookIndex++;
  const hook: Hook | undefined = instance.hooks[hookIndex];

  // Initialize hook on first call
  if (!hook) {
    const initialValueResolved: T = isInitialValueFunction(initialValue)
      ? initialValue()
      : initialValue;

    const stateHook: StateHook<T> = {
      type: 'state',
      value: initialValueResolved,
      initialValue: initialValueResolved,
      setValue: (nextValue: T | ((prevValue: T) => T)): void => {
        const newValue: T = isNextValueFunction(nextValue)
          ? nextValue(stateHook.value)
          : nextValue;

        // Check if value actually changed using Object.is
        if (Object.is(stateHook.value, newValue)) {
          return;
        }

        stateHook.value = newValue;
        instance.dirty = true;

        // Note: Forms only re-render on button press, so state changes alone don't trigger updates
      },
    }; // Controlled cast
    instance.hooks[hookIndex] = stateHook as Hook;
  }

  // Get the stored hook after potential initialization
  const storedHook: Hook | undefined = instance.hooks[hookIndex];

  // Validate hook type hasn't changed
  if (!storedHook || !isStateHook(storedHook)) {
    throw new Error(
      `Hook type mismatch at index ${hookIndex}. ` +
      'Expected useState but found different hook type. ' +
      'Ensure hooks are called in the same order every render.',
    );
  }

  // Controlled cast
  const typedHook = storedHook as StateHook<T>;

  return [typedHook.value, typedHook.setValue];
}
