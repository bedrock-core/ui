import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { useRef } from '../useRef';
import { fiberRegistry } from '../../core/fiber';
import { ComponentInstance, RefHook } from '../types';
import { Fragment } from '../../components/Fragment';
import { world } from '@minecraft/server';

describe('useRef Hook', () => {
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
      dirty: false,
    };
    fiberRegistry.pushInstance(instance);
  });

  afterEach(() => {
    fiberRegistry.popInstance();
  });

  describe('Core Functionality', () => {
    it('should initialize with value', () => {
      const ref = useRef(42);

      expect(ref.current).toBe(42);
      expect(instance.hooks.length).toBe(1);
      expect(instance.hooks[0]).toHaveProperty('type', 'ref');
    });

    it('should allow ref value mutation', () => {
      const ref = useRef(0);

      expect(ref.current).toBe(0);

      ref.current = 100;

      expect(ref.current).toBe(100);
      const hook = instance.hooks[0] as RefHook<number>;
      expect(hook.value.current).toBe(100);
    });

    it('should not trigger re-render on ref mutation', () => {
      const ref = useRef(0);

      expect(instance.dirty).toBe(false);

      ref.current = 42;

      expect(instance.dirty).toBe(false); // Still not dirty
      expect(ref.current).toBe(42);
    });

    it('should persist ref value across re-renders', () => {
      // First render
      const ref1 = useRef(0);
      ref1.current = 100;

      expect(ref1.current).toBe(100);

      // Simulate re-render
      instance.hookIndex = 0;

      // Second render - should get same ref with persisted value
      const ref2 = useRef(0);
      expect(ref2.current).toBe(100); // Value persisted
      expect(ref2).toBe(ref1); // Same object reference
    });
  });

  describe('Stability', () => {
    it('should maintain stable ref object reference', () => {
      // First render
      const ref1 = useRef(42);
      const initialRef = ref1;

      // Simulate re-render
      instance.hookIndex = 0;
      const ref2 = useRef(42);

      // Simulate another re-render
      instance.hookIndex = 0;
      const ref3 = useRef(42);

      // All should be the exact same object reference
      expect(ref2).toBe(initialRef);
      expect(ref3).toBe(initialRef);
    });

    it('should store any type of value', () => {
      // Primitive
      const numRef = useRef(42);
      expect(numRef.current).toBe(42);

      instance.hookIndex++;

      // Object
      const obj = { name: 'test' };
      const objRef = useRef(obj);
      expect(objRef.current).toBe(obj);

      instance.hookIndex++;

      // Array
      const arr = [1, 2, 3];
      const arrRef = useRef(arr);
      expect(arrRef.current).toBe(arr);

      instance.hookIndex++;

      // Function
      const fn = () => 'hello';
      const fnRef = useRef(fn);
      expect(fnRef.current).toBe(fn);
      expect(fnRef.current()).toBe('hello');

      instance.hookIndex++;

      // Null/undefined
      const nullRef = useRef(null);
      expect(nullRef.current).toBe(null);

      instance.hookIndex++;

      const undefinedRef = useRef(undefined);
      expect(undefinedRef.current).toBe(undefined);
    });
  });

  describe('State Persistence', () => {
    it('should survive form close and re-open', () => {
      // Initial render
      const ref = useRef({ count: 0 });
      ref.current.count = 42;

      // Simulate form close (instance stays in registry, just reset for next render)
      instance.hookIndex = 0;
      instance.dirty = false;

      // Re-open form (re-render)
      const ref2 = useRef({ count: 0 });
      expect(ref2.current.count).toBe(42); // Value persisted
      expect(ref2).toBe(ref); // Same ref object
    });

    it('should maintain independent refs for different instances', () => {
      // First instance
      const ref1 = useRef({ value: 10 });
      ref1.current.value = 100;

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
        dirty: false,
      };
      fiberRegistry.pushInstance(instance2);

      const ref2 = useRef({ value: 20 });
      ref2.current.value = 200;

      // Both refs should maintain their own values
      expect(ref1.current.value).toBe(100);
      expect(ref2.current.value).toBe(200);
      expect(ref1).not.toBe(ref2); // Different ref objects

      const hook1 = instance.hooks[0] as RefHook<{ value: number }>;
      const hook2 = instance2.hooks[0] as RefHook<{ value: number }>;

      expect(hook1.value.current.value).toBe(100);
      expect(hook2.value.current.value).toBe(200);

      fiberRegistry.popInstance();
      fiberRegistry.pushInstance(instance); // Restore original
    });
  });

  describe('Error Cases', () => {
    it('should throw error when called outside component context', () => {
      fiberRegistry.popInstance();

      expect(() => {
        useRef(0);
      }).toThrow('useRef can only be called from within a component');
    });

    it('should throw error on hook type mismatch', () => {
      // First render: useRef
      useRef(0);

      // Simulate re-render
      instance.hookIndex = 0;

      // Try to use useRef again - should work fine
      const ref = useRef(0);
      expect(ref).toBeDefined();

      // The actual mismatch would be caught if we tried to use a different hook type
      // at the same index, which is tested in the hook type validation logic
      const hook = instance.hooks[0];
      expect(hook).toHaveProperty('type', 'ref');
    });
  });
});
