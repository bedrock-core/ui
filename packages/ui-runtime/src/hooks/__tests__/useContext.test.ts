import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { useContext } from '../useContext';
import { createContext } from '../../core/context';
import { FiberRegistry, setCurrentActiveRegistry, RenderContext } from '../../core/fiber';
import { ComponentInstance } from '@bedrock-core/ui/core/types';
import { Fragment } from '../../components/Fragment';
import { world } from '@minecraft/server';

describe('useContext Hook', () => {
  let instance: ComponentInstance;
  let registry: FiberRegistry;
  let renderContext: RenderContext;

  beforeEach(() => {
    registry = new FiberRegistry();
    instance = {
      id: 'test-component',
      player: world.getAllPlayers()[0],
      componentType: Fragment,
      props: {},
      hooks: [],
      hookIndex: 0,
      mounted: false,
      shouldRender: true,
      registry,
    };
    registry.pushInstance(instance);
    renderContext = { registry, instance };
    setCurrentActiveRegistry(renderContext);
  });

  afterEach(() => {
    registry.popInstance();
    setCurrentActiveRegistry(null);
  });

  describe('Core Functionality', () => {
    it('should read default value with no provider', () => {
      const TestContext = createContext('default-value');

      const value = useContext(TestContext);

      expect(value).toBe('default-value');
    });

    it('should read nearest provider value', () => {
      const TestContext = createContext('default');

      // Push a provider value onto the context stack
      registry.pushContext(TestContext, 'provider-value');

      const value = useContext(TestContext);

      expect(value).toBe('provider-value');

      // Clean up
      registry.popContext(TestContext);
    });

    it('should handle nested providers correctly', () => {
      const TestContext = createContext('default');

      // Outer provider
      registry.pushContext(TestContext, 'outer');
      expect(useContext(TestContext)).toBe('outer');

      // Inner provider (overrides outer)
      registry.pushContext(TestContext, 'inner');
      expect(useContext(TestContext)).toBe('inner');

      // Pop inner - should return to outer
      registry.popContext(TestContext);
      expect(useContext(TestContext)).toBe('outer');

      // Pop outer - should return to default
      registry.popContext(TestContext);
      expect(useContext(TestContext)).toBe('default');
    });

    it('should handle multiple contexts independently', () => {
      const ThemeContext = createContext<'light' | 'dark'>('light');
      const UserContext = createContext<string>('guest');

      // Push values for both contexts
      registry.pushContext(ThemeContext, 'dark');
      registry.pushContext(UserContext, 'admin');

      // Should read correct values independently
      expect(useContext(ThemeContext)).toBe('dark');
      expect(useContext(UserContext)).toBe('admin');

      // Clean up
      registry.popContext(UserContext);
      registry.popContext(ThemeContext);
    });
  });

  describe('Context Stack Management', () => {
    it('should update value when provider re-renders', () => {
      const TestContext = createContext(0);

      // First render with value 1
      registry.pushContext(TestContext, 1);
      expect(useContext(TestContext)).toBe(1);

      // Simulate re-render by popping and pushing new value
      registry.popContext(TestContext);
      registry.pushContext(TestContext, 2);
      expect(useContext(TestContext)).toBe(2);

      // Clean up
      registry.popContext(TestContext);
    });

    it('should work without component instance', () => {
      const TestContext = createContext('default');

      // Pop the instance (simulating reading from a child without its own instance)
      registry.popInstance();

      // Push provider value
      registry.pushContext(TestContext, 'no-instance-value');

      // Should still be able to read context
      const value = useContext(TestContext);
      expect(value).toBe('no-instance-value');

      // Clean up
      registry.popContext(TestContext);

      // Restore instance for afterEach
      registry.pushInstance(instance);
    });

    it('should maintain context stack during tree traversal', () => {
      const TestContext = createContext('root');

      // Simulate tree traversal with multiple levels
      registry.pushContext(TestContext, 'level-1');
      const value1 = useContext(TestContext);

      registry.pushContext(TestContext, 'level-2');
      const value2 = useContext(TestContext);

      registry.pushContext(TestContext, 'level-3');
      const value3 = useContext(TestContext);

      expect(value1).toBe('level-1');
      expect(value2).toBe('level-2');
      expect(value3).toBe('level-3');

      // Pop in reverse order (LIFO)
      registry.popContext(TestContext);
      expect(useContext(TestContext)).toBe('level-2');

      registry.popContext(TestContext);
      expect(useContext(TestContext)).toBe('level-1');

      registry.popContext(TestContext);
      expect(useContext(TestContext)).toBe('root');
    });
  });

  describe('Edge Cases', () => {
    it('should handle context with object values', () => {
      interface User {
        name: string;
        role: string;
      }

      const UserContext = createContext<User>({ name: 'guest', role: 'viewer' });

      const user1 = { name: 'Alice', role: 'admin' };
      registry.pushContext(UserContext, user1);

      const value1 = useContext(UserContext);
      expect(value1).toEqual({ name: 'Alice', role: 'admin' });
      expect(value1).toBe(user1); // Should be same reference

      // Change to different object
      const user2 = { name: 'Bob', role: 'editor' };
      registry.popContext(UserContext);
      registry.pushContext(UserContext, user2);

      const value2 = useContext(UserContext);
      expect(value2).toEqual({ name: 'Bob', role: 'editor' });
      expect(value2).toBe(user2);

      // Clean up
      registry.popContext(UserContext);
    });

    it('should handle undefined as valid context value', () => {
      const TestContext = createContext<string | undefined>('default');

      // undefined is a valid context value (not null fallback)
      registry.pushContext(TestContext, undefined);

      const value = useContext(TestContext);
      expect(value).toBeUndefined();

      // Clean up
      registry.popContext(TestContext);
    });

    it('should return consistent value when reading same context multiple times', () => {
      const TestContext = createContext('default');

      registry.pushContext(TestContext, 'consistent');

      const value1 = useContext(TestContext);
      const value2 = useContext(TestContext);
      const value3 = useContext(TestContext);

      expect(value1).toBe('consistent');
      expect(value2).toBe('consistent');
      expect(value3).toBe('consistent');
      expect(value1).toBe(value2);
      expect(value2).toBe(value3);

      // Clean up
      registry.popContext(TestContext);
    });
  });

  describe('Error Cases', () => {
    it('should not error when called outside component', () => {
      const TestContext = createContext('default');

      // Pop instance to simulate being outside component
      registry.popInstance();

      // Should not throw - reads from context stack directly
      expect(() => {
        const value = useContext(TestContext);
        expect(value).toBe('default');
      }).not.toThrow();

      // Restore instance for afterEach
      registry.pushInstance(instance);
    });
  });
});
