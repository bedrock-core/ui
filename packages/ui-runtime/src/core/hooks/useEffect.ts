import { fiberRegistry } from '../fiber';
import { ComponentInstance, EffectHook, Hook } from './types';

/**
 * Type guard to check if a hook is an EffectHook
 */
function isEffectHook(hook: Hook): hook is EffectHook {
  return hook.type === 'effect';
}

/**
 * Check if dependency array has changed
 */
function depsChanged(prevDeps: unknown[] | undefined, nextDeps: unknown[] | undefined): boolean {
  if (prevDeps === undefined) {
    return true;
  }

  if (nextDeps === undefined) {
    return true;
  }

  if (prevDeps.length !== nextDeps.length) {
    return true;
  }

  for (let i = 0; i < prevDeps.length; i++) {
    if (!Object.is(prevDeps[i], nextDeps[i])) {
      return true;
    }
  }

  return false;
}

/**
 * useEffect hook - synchronize component with external systems
 * @param create - Setup function that runs when dependencies change. Can return cleanup function.
 * @param deps - Dependency array. If undefined, runs after every render. If empty, runs once on mount.
 *
 * @example
 * // Run once on mount/unmount
 * useEffect(() => {
 *   const interval = setInterval(() => {
 *     console.log('tick');
 *   }, 1000);
 *   return () => clearInterval(interval);
 * }, []);
 *
 * // Run when 'count' changes
 * useEffect(() => {
 *   console.log('Count is now:', count);
 * }, [count]);
 *
 * // Run after every render
 * useEffect(() => {
 *   console.log('Component rendered');
 * });
 */
export function useEffect(create: () => void | (() => void), deps?: unknown[]): void {
  const instance: ComponentInstance | undefined = fiberRegistry.getCurrentInstance();

  if (!instance) {
    throw new Error(
      'useEffect can only be called from within a component. ' +
      'Make sure you are calling it at the top level of your component function.',
    );
  }

  const hookIndex: number = instance.hookIndex++;
  let hook: Hook | undefined = instance.hooks[hookIndex];

  // Initialize effect hook on first call
  if (!hook) {
    const effectHook: EffectHook = {
      type: 'effect',
      create,
      deps,
      prevDeps: undefined,
      cleanup: undefined,
      hasRun: false,
    };

    instance.hooks[hookIndex] = effectHook;
  }

  // Get the stored hook after potential initialization
  const storedHook: Hook | undefined = instance.hooks[hookIndex];

  // Validate hook type hasn't changed
  if (!storedHook || !isEffectHook(storedHook)) {
    throw new Error(
      `Hook type mismatch at index ${hookIndex}. ` +
      'Expected useEffect but found different hook type. ' +
      'Ensure hooks are called in the same order every render.',
    );
  }

  // Update the setup function reference and dependencies
  storedHook.create = create;
  storedHook.deps = deps;
}

/**
 * Execute scheduled effects for a component
 * Called after component has been rendered and serialized
 * @param instance - Component instance to execute effects for
 * @param cleanupOnly - If true, only run cleanup functions (for unmounting)
 * @internal
 */
export function executeEffects(instance: ComponentInstance, cleanupOnly = false): void {
  if (!instance) {
    throw new Error('executeEffects called with undefined instance');
  }

  for (let i = 0; i < instance.hooks.length; i++) {
    const hook: Hook | undefined = instance.hooks[i];

    if (!hook || !isEffectHook(hook)) {
      continue;
    }

    // If cleanup only, just run cleanup and skip
    if (cleanupOnly) {
      hook.cleanup?.();

      continue;
    }

    const shouldRun: boolean = depsChanged(hook.prevDeps, hook.deps);

    if (shouldRun || !instance.mounted) {
      // Run cleanup if it exists
      hook.cleanup?.();

      // Run setup
      const result = hook.create();

      // Store cleanup function if setup returned one
      hook.cleanup = typeof result === 'function' ? result : undefined;

      // Update deps tracking
      hook.prevDeps = hook.deps ? [...hook.deps] : undefined;
      hook.hasRun = true;
    }
  }

  instance.mounted = true;
}
