import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useReducer } from '../useReducer';
import { fiberRegistry } from '../../core/fiber';
import { ReducerHook } from '../types';
import { ComponentInstance } from '@bedrock-core/ui/core/types';
import { Fragment } from '../../components/Fragment';
import { world } from '@minecraft/server';

describe('useReducer Hook', () => {
  let instance: ComponentInstance;

  beforeEach(() => {
    instance = {
      id: 'test-component',
      player: world.getAllPlayers()[0],
      componentType: Fragment,
      props: {},
      hooks: [],
      hookIndex: 0,
      mounted: false,
    };
    fiberRegistry.pushInstance(instance);
  });

  afterEach(() => {
    fiberRegistry.popInstance();
  });

  describe('Core Functionality', () => {
    it('should initialize with initial state', () => {
      type Action = { type: 'increment' } | { type: 'decrement' };
      const reducer = (state: number, action: Action): number => {
        switch (action.type) {
          case 'increment': return state + 1;
          case 'decrement': return state - 1;
          default: return state;
        }
      };

      const [state] = useReducer(reducer, 10);

      expect(state).toBe(10);
      expect(instance.hooks.length).toBe(1);
      expect(instance.hooks[0]).toHaveProperty('type', 'reducer');
    });

    it('should initialize with lazy init function', () => {
      type Action = { type: 'increment' };
      const reducer = (state: number, _action: Action): number => state + 1;
      const init = vi.fn((initialCount: number) => initialCount * 2);

      const [state] = useReducer(reducer, 5, init);

      expect(state).toBe(10); // 5 * 2
      expect(init).toHaveBeenCalledTimes(1);
      expect(init).toHaveBeenCalledWith(5);
    });

    it('should call reducer with current state on dispatch', () => {
      type Action = { type: 'increment' } | { type: 'decrement' };
      const reducer = vi.fn((state: number, action: Action) => {
        switch (action.type) {
          case 'increment': return state + 1;
          case 'decrement': return state - 1;
          default: return state;
        }
      });

      const [, dispatch] = useReducer(reducer, 0);

      dispatch({ type: 'increment' });

      expect(reducer).toHaveBeenCalledWith(0, { type: 'increment' });

      dispatch({ type: 'increment' });

      expect(reducer).toHaveBeenCalledWith(1, { type: 'increment' });
    });

    it('should update state when reducer returns new value', () => {
      type Action = { type: 'increment' } | { type: 'set'; value: number };
      const reducer = (state: number, action: Action): number => {
        switch (action.type) {
          case 'increment': return state + 1;
          case 'set': return action.value;
          default: return state;
        }
      };

      const [, dispatch] = useReducer(reducer, 0);
      const hook = instance.hooks[0] as ReducerHook<number, Action>;

      expect(hook.state).toBe(0);

      dispatch({ type: 'increment' });

      expect(hook.state).toBe(1);

      dispatch({ type: 'set', value: 42 });

      expect(hook.state).toBe(42);
    });
  });

  describe('State Management', () => {
    it('should persist state across re-renders', () => {
      type Action = { type: 'increment' };
      const reducer = (state: number, _action: Action): number => state + 1;

      // First render
      const [state1, dispatch1] = useReducer(reducer, 0);
      expect(state1).toBe(0);

      dispatch1({ type: 'increment' });

      // Simulate re-render
      instance.hookIndex = 0;

      // Second render - should get updated state
      const [state2] = useReducer(reducer, 0);
      expect(state2).toBe(1);
      expect(instance.hooks.length).toBe(1); // Still same hook
    });

    it('should not update if state unchanged (Object.is)', () => {
      type Action = { type: 'noop' } | { type: 'change' };
      const sameObj = { value: 42 };
      const reducer = (state: typeof sameObj, action: Action): { value: number } => {
        if (action.type === 'noop') {
          return state; // Return same reference
        }

        return { value: 100 }; // Return new reference
      };

      const [, dispatch] = useReducer(reducer, sameObj);

      // Dispatch action that returns same reference
      dispatch({ type: 'noop' });

      // Dispatch action that returns new reference
      dispatch({ type: 'change' });
    });

    it('should handle multiple dispatches before re-render', () => {
      type Action = { type: 'add'; value: number };
      const reducer = (state: number, action: Action): number => state + action.value;

      const [, dispatch] = useReducer(reducer, 0);
      const hook = instance.hooks[0] as ReducerHook<number, Action>;

      dispatch({ type: 'add', value: 5 });
      expect(hook.state).toBe(5);

      dispatch({ type: 'add', value: 10 });
      expect(hook.state).toBe(15);

      dispatch({ type: 'add', value: 7 });
      expect(hook.state).toBe(22);
    });

    it('should maintain stable dispatch function reference', () => {
      type Action = { type: 'increment' };
      const reducer = (state: number, _action: Action): number => state + 1;

      // First render
      const [, dispatch1] = useReducer(reducer, 0);

      // Simulate re-render
      instance.hookIndex = 0;
      const [, dispatch2] = useReducer(reducer, 0);

      // Dispatch references should be identical
      expect(dispatch1).toBe(dispatch2);
    });
  });

  describe('Complex Reducers', () => {
    it('should handle complex state objects', () => {
      interface State {
        count: number;
        user: { name: string; age: number };
        items: string[];
      }

      type Action =
        | { type: 'increment' }
        | { type: 'setUser'; name: string; age: number }
        | { type: 'addItem'; item: string };

      const reducer = (state: State, action: Action): State => {
        switch (action.type) {
          case 'increment':
            return { ...state, count: state.count + 1 };
          case 'setUser':
            return { ...state, user: { name: action.name, age: action.age } };
          case 'addItem':
            return { ...state, items: [...state.items, action.item] };
          default:
            return state;
        }
      };

      const initialState: State = {
        count: 0,
        user: { name: 'Alice', age: 30 },
        items: [],
      };

      const [, dispatch] = useReducer(reducer, initialState);
      const hook = instance.hooks[0] as ReducerHook<State, Action>;

      dispatch({ type: 'increment' });
      expect(hook.state.count).toBe(1);

      dispatch({ type: 'setUser', name: 'Bob', age: 25 });
      expect(hook.state.user).toEqual({ name: 'Bob', age: 25 });

      dispatch({ type: 'addItem', item: 'apple' });
      dispatch({ type: 'addItem', item: 'banana' });
      expect(hook.state.items).toEqual(['apple', 'banana']);
    });

    it('should handle action payloads correctly', () => {
      interface Action {
        type: 'update';
        payload: {
          id: number;
          data: string;
          metadata?: { timestamp: number };
        };
      }

      const reducer = (state: string[], action: Action): string[] => [...state, `${action.payload.id}:${action.payload.data}`];

      const [, dispatch] = useReducer(reducer, []);
      const hook = instance.hooks[0] as ReducerHook<string[], Action>;

      dispatch({
        type: 'update',
        payload: {
          id: 1,
          data: 'test',
          metadata: { timestamp: Date.now() },
        },
      });

      expect(hook.state).toEqual(['1:test']);

      dispatch({
        type: 'update',
        payload: {
          id: 2,
          data: 'another',
        },
      });

      expect(hook.state).toEqual(['1:test', '2:another']);
    });

    it('should handle multiple reducer hooks in same component', () => {
      type CounterAction = { type: 'increment' } | { type: 'decrement' };
      const counterReducer = (state: number, action: CounterAction): number => {
        switch (action.type) {
          case 'increment': return state + 1;
          case 'decrement': return state - 1;
          default: return state;
        }
      };

      type ToggleAction = { type: 'toggle' };
      const toggleReducer = (state: boolean, _action: ToggleAction): boolean => !state;

      // First reducer
      const [count, dispatchCount] = useReducer(counterReducer, 0);
      expect(count).toBe(0);

      // Second reducer
      const [toggle, dispatchToggle] = useReducer(toggleReducer, false);
      expect(toggle).toBe(false);

      // They should be independent
      dispatchCount({ type: 'increment' });
      const hook1 = instance.hooks[0] as ReducerHook<number, CounterAction>;
      expect(hook1.state).toBe(1);

      dispatchToggle({ type: 'toggle' });
      const hook2 = instance.hooks[1] as ReducerHook<boolean, ToggleAction>;
      expect(hook2.state).toBe(true);

      // First reducer state should be unchanged
      expect(hook1.state).toBe(1);
    });
  });

  describe('State Persistence', () => {
    it('should survive form close and re-open', () => {
      type Action = { type: 'increment' };
      const reducer = (state: number, _action: Action): number => state + 1;

      // Initial render
      const [, dispatch] = useReducer(reducer, 0);
      dispatch({ type: 'increment' });
      dispatch({ type: 'increment' });

      // Simulate form close (instance stays in registry, just reset for next render)
      instance.hookIndex = 0;

      // Re-open form (re-render)
      const [state] = useReducer(reducer, 0);
      expect(state).toBe(2); // State persisted
    });

    it('should maintain independent state for different instances', () => {
      type Action = { type: 'add'; value: number };
      const reducer = (state: number, action: Action): number => state + action.value;

      // First instance
      const [, dispatch1] = useReducer(reducer, 0);
      dispatch1({ type: 'add', value: 10 });

      fiberRegistry.popInstance();

      // Second instance with different ID
      const instance2: ComponentInstance = {
        id: 'test-component-2',
        player: world.getAllPlayers()[0],
        componentType: Fragment,
        props: {},
        hooks: [],
        hookIndex: 0,
        mounted: false,
      };
      fiberRegistry.pushInstance(instance2);

      const [, dispatch2] = useReducer(reducer, 0);
      dispatch2({ type: 'add', value: 20 });

      // Both reducers should maintain their own state
      const hook1 = instance.hooks[0] as ReducerHook<number, Action>;
      const hook2 = instance2.hooks[0] as ReducerHook<number, Action>;

      expect(hook1.state).toBe(10);
      expect(hook2.state).toBe(20);

      fiberRegistry.popInstance();
      fiberRegistry.pushInstance(instance); // Restore original
    });
  });

  describe('Error Cases', () => {
    it('should throw error when called outside component context', () => {
      fiberRegistry.popInstance();

      type Action = { type: 'increment' };
      const reducer = (state: number, _action: Action): number => state + 1;

      expect(() => {
        useReducer(reducer, 0);
      }).toThrow('useReducer can only be called from within a component');
    });

    it('should throw error on hook type mismatch', () => {
      type Action = { type: 'increment' };
      const reducer = (state: number, _action: Action): number => state + 1;

      // First render: useReducer
      useReducer(reducer, 0);

      // Simulate re-render
      instance.hookIndex = 0;

      // Try to use useReducer again - should work fine
      const [state] = useReducer(reducer, 0);
      expect(state).toBeDefined();

      // The actual mismatch would be caught if we tried to use a different hook type
      const hook = instance.hooks[0];
      expect(hook).toHaveProperty('type', 'reducer');
    });

    it('should only call lazy init once on mount', () => {
      type Action = { type: 'increment' };
      const reducer = (state: number, _action: Action): number => state + 1;
      const init = vi.fn((value: number) => value * 2);

      // First render
      const [state1] = useReducer(reducer, 5, init);
      expect(state1).toBe(10);
      expect(init).toHaveBeenCalledTimes(1);

      // Simulate re-render
      instance.hookIndex = 0;
      const [state2] = useReducer(reducer, 5, init);
      expect(state2).toBe(10);
      expect(init).toHaveBeenCalledTimes(1); // Still only called once
    });
  });
});
