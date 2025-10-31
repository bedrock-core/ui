import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useEvent } from '../useEvent';
import { executeEffects } from '../useEffect';
import { fiberRegistry } from '../../fiber';
import { ComponentInstance } from '../types';
import { Fragment } from '../../components/Fragment';
import { world } from '@minecraft/server';
import { EventSignal } from '../useEvent';

describe('useEvent Hook', () => {
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

  describe('Core Functionality (wraps useEffect)', () => {
    it('should subscribe to event signal', () => {
      const subscribeFn = vi.fn();
      const mockSignal: EventSignal<string> = {
        subscribe: subscribeFn,
        unsubscribe: vi.fn(),
      };

      const callback = vi.fn();

      useEvent(mockSignal, callback);

      // Should have subscribed (though actual subscription happens in executeEffects)
      expect(instance.hooks.length).toBe(1);
      expect(instance.hooks[0]).toHaveProperty('type', 'effect');
    });

    it('should unsubscribe on unmount', async () => {
      const subscribeFn = vi.fn((cb) => cb);
      const unsubscribeFn = vi.fn();
      const mockSignal: EventSignal<string> = {
        subscribe: subscribeFn,
        unsubscribe: unsubscribeFn,
      };

      const callback = vi.fn();

      useEvent(mockSignal, callback);

      // Execute effects to run subscription
      executeEffects(instance);

      expect(subscribeFn).toHaveBeenCalled();

      // Get the cleanup function and call it (simulating unmount)
      const hook = instance.hooks[0] as any;
      if (hook.cleanup) {
        hook.cleanup();
      }

      expect(unsubscribeFn).toHaveBeenCalled();
    });

    it('should fire callback when event triggered', async () => {
      let registeredCallback: ((event: string) => void) | null = null;

      const mockSignal: EventSignal<string> = {
        subscribe: (cb) => {
          registeredCallback = cb;
          return cb;
        },
        unsubscribe: vi.fn(),
      };

      const callback = vi.fn();

      useEvent(mockSignal, callback);

      // Execute effects to run subscription
      executeEffects(instance);

      expect(registeredCallback).not.toBeNull();

      // Simulate event firing
      registeredCallback!('test-event');

      expect(callback).toHaveBeenCalledWith('test-event');
    });

    it('should pass options to subscribe', async () => {
      const subscribeFn = vi.fn((cb) => cb);
      const mockSignal: EventSignal<string, { blockTypes: string[] }> = {
        subscribe: subscribeFn,
        unsubscribe: vi.fn(),
      };

      const callback = vi.fn();
      const options = { blockTypes: ['stone', 'dirt'] };

      useEvent(mockSignal, callback, options);

      // Execute effects to run subscription
      executeEffects(instance);

      expect(subscribeFn).toHaveBeenCalledWith(expect.any(Function), options);
    });
  });

  describe('Resubscription Logic', () => {
    it('should resubscribe when signal changes', async () => {
      const subscribe1 = vi.fn((cb) => cb);
      const unsubscribe1 = vi.fn();
      const mockSignal1: EventSignal<string> = {
        subscribe: subscribe1,
        unsubscribe: unsubscribe1,
      };

      const subscribe2 = vi.fn((cb) => cb);
      const unsubscribe2 = vi.fn();
      const mockSignal2: EventSignal<string> = {
        subscribe: subscribe2,
        unsubscribe: unsubscribe2,
      };

      const callback = vi.fn();
      
      // First render with signal1
      useEvent(mockSignal1, callback);
      executeEffects(instance);

      expect(subscribe1).toHaveBeenCalledTimes(1);

      // Second render with signal2
      instance.hookIndex = 0;
      useEvent(mockSignal2, callback);
      executeEffects(instance);

      expect(unsubscribe1).toHaveBeenCalledTimes(1); // Old signal unsubscribed
      expect(subscribe2).toHaveBeenCalledTimes(1); // New signal subscribed
    });

    it('should resubscribe when callback changes', async () => {
      const subscribeFn = vi.fn((cb) => cb);
      const unsubscribeFn = vi.fn();
      const mockSignal: EventSignal<string> = {
        subscribe: subscribeFn,
        unsubscribe: unsubscribeFn,
      };

      const callback1 = vi.fn();
      const callback2 = vi.fn();
      
      // First render with callback1
      useEvent(mockSignal, callback1);
      executeEffects(instance);

      expect(subscribeFn).toHaveBeenCalledTimes(1);

      // Second render with callback2
      instance.hookIndex = 0;
      useEvent(mockSignal, callback2);
      executeEffects(instance);

      expect(unsubscribeFn).toHaveBeenCalledTimes(1); // Unsubscribed
      expect(subscribeFn).toHaveBeenCalledTimes(2); // Resubscribed with new callback
    });

    it('should resubscribe when options change', async () => {
      const subscribeFn = vi.fn((cb) => cb);
      const unsubscribeFn = vi.fn();
      const mockSignal: EventSignal<string, { filter: string }> = {
        subscribe: subscribeFn,
        unsubscribe: unsubscribeFn,
      };

      const callback = vi.fn();
      
      // First render with options1
      const options1 = { filter: 'type1' };
      useEvent(mockSignal, callback, options1);
      executeEffects(instance);

      expect(subscribeFn).toHaveBeenCalledTimes(1);
      expect(subscribeFn).toHaveBeenCalledWith(expect.any(Function), options1);

      // Second render with options2
      instance.hookIndex = 0;
      const options2 = { filter: 'type2' };
      useEvent(mockSignal, callback, options2);
      executeEffects(instance);

      expect(unsubscribeFn).toHaveBeenCalledTimes(1);
      expect(subscribeFn).toHaveBeenCalledTimes(2);
      expect(subscribeFn).toHaveBeenLastCalledWith(expect.any(Function), options2);
    });

    it('should use custom deps if provided', async () => {
      const subscribeFn = vi.fn((cb) => cb);
      const unsubscribeFn = vi.fn();
      const mockSignal: EventSignal<string> = {
        subscribe: subscribeFn,
        unsubscribe: unsubscribeFn,
      };

      const callback = vi.fn();
      
      // First render with custom deps [1]
      useEvent(mockSignal, callback, undefined, [1]);
      executeEffects(instance);

      expect(subscribeFn).toHaveBeenCalledTimes(1);

      // Second render with same custom deps [1]
      instance.hookIndex = 0;
      useEvent(mockSignal, callback, undefined, [1]);
      executeEffects(instance);

      expect(subscribeFn).toHaveBeenCalledTimes(1); // Should not resubscribe

      // Third render with different custom deps [2]
      instance.hookIndex = 0;
      useEvent(mockSignal, callback, undefined, [2]);
      executeEffects(instance);

      expect(subscribeFn).toHaveBeenCalledTimes(2); // Should resubscribe
    });
  });

  describe('Cleanup', () => {
    it('should unsubscribe when component unmounts', async () => {
      const subscribeFn = vi.fn((cb) => cb);
      const unsubscribeFn = vi.fn();
      const mockSignal: EventSignal<string> = {
        subscribe: subscribeFn,
        unsubscribe: unsubscribeFn,
      };

      const callback = vi.fn();
      
      useEvent(mockSignal, callback);
      executeEffects(instance);

      expect(subscribeFn).toHaveBeenCalledTimes(1);

      // Simulate unmount by calling cleanup
      const hook = instance.hooks[0] as any;
      if (hook.cleanup) {
        hook.cleanup();
      }

      expect(unsubscribeFn).toHaveBeenCalledTimes(1);
    });

    it('should handle multiple useEvent calls independently', async () => {
      const subscribe1 = vi.fn((cb) => cb);
      const unsubscribe1 = vi.fn();
      const mockSignal1: EventSignal<string> = {
        subscribe: subscribe1,
        unsubscribe: unsubscribe1,
      };

      const subscribe2 = vi.fn((cb) => cb);
      const unsubscribe2 = vi.fn();
      const mockSignal2: EventSignal<number> = {
        subscribe: subscribe2,
        unsubscribe: unsubscribe2,
      };

      const callback1 = vi.fn();
      const callback2 = vi.fn();
      
      // Subscribe to both events
      useEvent(mockSignal1, callback1);
      useEvent(mockSignal2, callback2);
      executeEffects(instance);

      expect(subscribe1).toHaveBeenCalledTimes(1);
      expect(subscribe2).toHaveBeenCalledTimes(1);

      // Cleanup both
      const hook1 = instance.hooks[0] as any;
      const hook2 = instance.hooks[1] as any;

      if (hook1.cleanup) hook1.cleanup();
      if (hook2.cleanup) hook2.cleanup();

      expect(unsubscribe1).toHaveBeenCalledTimes(1);
      expect(unsubscribe2).toHaveBeenCalledTimes(1);
    });
  });

  describe('Error Cases', () => {
    it('should throw error when called outside component context', () => {
      fiberRegistry.popInstance();

      const mockSignal: EventSignal<string> = {
        subscribe: vi.fn(),
        unsubscribe: vi.fn(),
      };

      expect(() => {
        useEvent(mockSignal, vi.fn());
      }).toThrow('useEffect can only be called from within a component');
    });
  });
});
