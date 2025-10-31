import { RefHook, Hook } from './types';
import { ComponentInstance } from '../core/types';
import { fiberRegistry } from '../core/fiber';

/**
 * Type guard to check if a hook is a RefHook
 */
function isRefHook(hook: Hook): hook is RefHook {
  return hook.type === 'ref';
}

/**
 * useRef hook - returns a mutable ref object that persists for the lifetime of the component
 * @param initialValue - Initial value for the ref.current property
 * @returns Ref object with a current property
 *
 * @example
 * const ref = useRef<number>(0);
 * ref.current = 42;  // Mutating ref does NOT trigger re-render
 *
 * @example
 * const inputRef = useRef<HTMLInputElement>(null);
 * // Use for DOM references or any mutable value
 */
export function useRef<T>(initialValue: T): { current: T } {
  const instance: ComponentInstance | undefined = fiberRegistry.getCurrentInstance();

  if (!instance) {
    throw new Error(
      'useRef can only be called from within a component. ' +
      'Make sure you are calling it at the top level of your component function.',
    );
  }

  const hookIndex: number = instance.hookIndex++;
  const hook: Hook | undefined = instance.hooks[hookIndex];

  // Initialize hook on first call
  if (!hook) {
    const refHook: RefHook<T> = {
      type: 'ref',
      value: { current: initialValue },
    };

    instance.hooks[hookIndex] = refHook as Hook;
  }

  // Get the stored hook after potential initialization
  const storedHook: Hook | undefined = instance.hooks[hookIndex];

  // Validate hook type hasn't changed
  if (!storedHook || !isRefHook(storedHook)) {
    throw new Error(
      `Hook type mismatch at index ${hookIndex}. ` +
      'Expected useRef but found different hook type. ' +
      'Ensure hooks are called in the same order every render.',
    );
  }

  // Controlled cast
  const typedHook = storedHook as RefHook<T>;

  return typedHook.value;
}
