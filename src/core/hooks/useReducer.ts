import { Logger } from '../../util';
import { ReducerHook, Hook, ComponentInstance } from './types';
import { fiberRegistry } from '../fiber';

/**
 * Type guard to check if a hook is a ReducerHook
 */
function isReducerHook(hook: Hook): hook is ReducerHook {
  return hook.type === 'reducer';
}

/**
 * useReducer hook - manages component state with a reducer function
 * @param reducer - Function that takes current state and action, returns new state
 * @param initialArg - Initial state value or argument for init function
 * @param init - Optional lazy initializer function
 * @returns [state, dispatch] tuple
 *
 * @example
 * // Simple counter reducer
 * type Action = { type: 'increment' } | { type: 'decrement' };
 * function reducer(state: number, action: Action): number {
 *   switch (action.type) {
 *     case 'increment': return state + 1;
 *     case 'decrement': return state - 1;
 *     default: return state;
 *   }
 * }
 *
 * function Counter() {
 *   const [count, dispatch] = useReducer(reducer, 0);
 *   return (
 *     <Panel>
 *       <Text>Count: {count}</Text>
 *       <Button onClick={() => dispatch({ type: 'increment' })}>+</Button>
 *     </Panel>
 *   );
 * }
 *
 * @example
 * // With lazy initialization
 * function init(initialCount: number): number {
 *   return initialCount * 2;
 * }
 *
 * function Counter() {
 *   const [count, dispatch] = useReducer(reducer, 5, init); // starts at 10
 *   // ...
 * }
 */
export function useReducer<S, A, I = S>(
  reducer: (state: S, action: A) => S,
  initialArg: I,
  init?: (initialArg: I) => S,
): [S, (action: A) => void] {
  const instance: ComponentInstance | undefined = fiberRegistry.getCurrentInstance();

  if (!instance) {
    throw new Error(
      'useReducer can only be called from within a component. ' +
      'Make sure you are calling it at the top level of your component function.',
    );
  }

  const hookIndex: number = instance.hookIndex++;
  const hook: Hook | undefined = instance.hooks[hookIndex];

  // Initialize hook on first call
  if (!hook) {
    // Compute initial state
    const initialState: S = init ? init(initialArg) : (initialArg as unknown as S);

    // Create stable dispatch function
    const dispatch = (action: A): void => {
      const reducerHook = instance.hooks[hookIndex] as ReducerHook<S, A>;
      const currentState = reducerHook.state;
      const newState = reducerHook.reducer(currentState, action);

      // Only update if state actually changed (using Object.is for reference equality)
      if (!Object.is(currentState, newState)) {
        reducerHook.state = newState;
        instance.dirty = true;

        // Schedule debounced render using the instance's callback
        if (instance.scheduleRerender) {
          instance.scheduleRerender();
        } else {
          Logger.error(`[useReducer] No scheduleRerender callback for ${instance.id}`);
        }
      }
    };

    const reducerHook: ReducerHook<S, A> = {
      type: 'reducer',
      state: initialState,
      dispatch,
      reducer,
    };

    instance.hooks[hookIndex] = reducerHook as Hook;
  }

  // Get the stored hook after potential initialization
  const storedHook: Hook | undefined = instance.hooks[hookIndex];

  // Validate hook type hasn't changed
  if (!storedHook || !isReducerHook(storedHook)) {
    throw new Error(
      `Hook type mismatch at index ${hookIndex}. ` +
      'Expected useReducer but found different hook type. ' +
      'Ensure hooks are called in the same order every render.',
    );
  }

  // Controlled cast
  const typedHook = storedHook as ReducerHook<S, A>;

  return [typedHook.state, typedHook.dispatch];
}
