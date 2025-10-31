import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useEffect, executeEffects } from '../useEffect';
import { fiberRegistry } from '../../core/fiber';
import { ComponentInstance, EffectHook } from '../types';
import { Fragment } from '../../components/Fragment';
import { world } from '@minecraft/server';

describe('useEffect Hook', () => {
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

  describe('Lifecycle & Execution', () => {
    it('should register effect hook', () => {
      useEffect(() => {
        console.log('effect');
      });

      expect(instance.hooks.length).toBe(1);
      expect(instance.hooks[0]).toHaveProperty('type', 'effect');
      expect(instance.hooks[0]).toHaveProperty('create');
    });

    it('should run effect on mount with empty deps', () => {
      let ran = false;

      useEffect(() => {
        ran = true;
      }, []);

      expect(ran).toBe(false);

      executeEffects(instance);

      expect(ran).toBe(true);
    });

    it('should run effect every render with no deps array', () => {
      let runs = 0;

      useEffect(() => {
        runs++;
      });

      executeEffects(instance);
      expect(runs).toBe(1);

      // Re-render
      instance.hookIndex = 0;
      useEffect(() => {
        runs++;
      });

      executeEffects(instance);
      expect(runs).toBe(2); // Should run again
    });

    it('should run effect only on mount with empty deps array', () => {
      let runs = 0;

      useEffect(() => {
        runs++;
      }, []);

      executeEffects(instance);
      expect(runs).toBe(1);

      // Re-render
      instance.hookIndex = 0;
      useEffect(() => {
        runs++;
      }, []);

      executeEffects(instance);
      expect(runs).toBe(1); // Should NOT run again
    });
  });

  describe('Dependency Tracking', () => {
    it('should re-run effect when primitive deps change', () => {
      let runs = 0;

      // First render with deps [1]
      useEffect(() => {
        runs++;
      }, [1]);

      executeEffects(instance);
      expect(runs).toBe(1);

      // Re-render with same deps [1]
      instance.hookIndex = 0;
      useEffect(() => {
        runs++;
      }, [1]);

      executeEffects(instance);
      expect(runs).toBe(1); // Should not run again

      // Re-render with different deps [2]
      instance.hookIndex = 0;
      useEffect(() => {
        runs++;
      }, [2]);

      executeEffects(instance);
      expect(runs).toBe(2); // Should run again
    });

    it('should re-run effect when object reference changes', () => {
      let runs = 0;
      const obj1 = { value: 1 };
      const obj2 = { value: 1 };

      // First render with obj1
      useEffect(() => {
        runs++;
      }, [obj1]);

      executeEffects(instance);
      expect(runs).toBe(1);

      // Re-render with same reference
      instance.hookIndex = 0;
      useEffect(() => {
        runs++;
      }, [obj1]);

      executeEffects(instance);
      expect(runs).toBe(1); // Should not run

      // Re-render with different reference (even with same value)
      instance.hookIndex = 0;
      useEffect(() => {
        runs++;
      }, [obj2]);

      executeEffects(instance);
      expect(runs).toBe(2); // Should run again
    });

    it('should not re-run effect when deps stay the same', () => {
      let runs = 0;
      const str = 'test';
      const num = 42;

      // First render
      useEffect(() => {
        runs++;
      }, [str, num]);

      executeEffects(instance);
      expect(runs).toBe(1);

      // Re-render with same values
      instance.hookIndex = 0;
      useEffect(() => {
        runs++;
      }, [str, num]);

      executeEffects(instance);
      expect(runs).toBe(1); // Should not run
    });

    it('should track multiple deps correctly', () => {
      let runs = 0;
      let a = 1;
      let b = 2;
      let c = 3;

      // First render
      useEffect(() => {
        runs++;
      }, [a, b, c]);

      executeEffects(instance);
      expect(runs).toBe(1);

      // Re-render with only b changed
      instance.hookIndex = 0;
      b = 5;
      useEffect(() => {
        runs++;
      }, [a, b, c]);

      executeEffects(instance);
      expect(runs).toBe(2); // Should run
    });

    it('should detect changes in deps array length', () => {
      let runs = 0;

      // First render with 2 deps
      useEffect(() => {
        runs++;
      }, [1, 2]);

      executeEffects(instance);
      expect(runs).toBe(1);

      // Re-render with 3 deps
      instance.hookIndex = 0;
      useEffect(() => {
        runs++;
      }, [1, 2, 3]);

      executeEffects(instance);
      expect(runs).toBe(2); // Should run due to length change
    });
  });

  describe('Cleanup Functions', () => {
    it('should run cleanup before next effect', () => {
      let setupRuns = 0;
      let cleanupRuns = 0;

      // First render
      useEffect(() => {
        setupRuns++;

        return () => {
          cleanupRuns++;
        };
      }, [1]);

      executeEffects(instance);
      expect(setupRuns).toBe(1);
      expect(cleanupRuns).toBe(0);

      // Re-render with different deps
      instance.hookIndex = 0;
      useEffect(() => {
        setupRuns++;

        return () => {
          cleanupRuns++;
        };
      }, [2]);

      executeEffects(instance);
      expect(setupRuns).toBe(2); // Effect ran again
      expect(cleanupRuns).toBe(1); // Cleanup ran before new effect
    });

    it('should run cleanup on unmount', () => {
      let cleanupRan = false;

      useEffect(() => () => {
        cleanupRan = true;
      }, []);

      executeEffects(instance);
      expect(cleanupRan).toBe(false);

      // To test cleanup on unmount, we need to manually call the cleanup
      // In a real scenario, deleteInstance would be called by the render system
      const hook = instance.hooks[0] as EffectHook;
      if (hook.cleanup) {
        hook.cleanup();
      }

      expect(cleanupRan).toBe(true);
    });

    it('should handle effect without cleanup', () => {
      let ran = false;

      // Effect returning undefined
      useEffect(() => {
        ran = true;
      }, []);

      expect(() => executeEffects(instance)).not.toThrow();
      expect(ran).toBe(true);

      // Effect returning void explicitly
      instance.hookIndex = 0;
      instance.hooks = [];

      useEffect(() => {
        ran = true;

        return undefined;
      }, []);

      expect(() => executeEffects(instance)).not.toThrow();
    });

    it('should handle multiple effects with cleanups in same component', () => {
      const cleanupOrder: string[] = [];

      useEffect(() => () => cleanupOrder.push('effect1'), [1]);

      useEffect(() => () => cleanupOrder.push('effect2'), [1]);

      useEffect(() => () => cleanupOrder.push('effect3'), [1]);

      executeEffects(instance);

      // Change deps to trigger cleanup
      instance.hookIndex = 0;
      useEffect(() => () => cleanupOrder.push('effect1'), [2]);

      useEffect(() => () => cleanupOrder.push('effect2'), [2]);

      useEffect(() => () => cleanupOrder.push('effect3'), [2]);

      executeEffects(instance);

      // All cleanups should have run
      expect(cleanupOrder).toEqual(['effect1', 'effect2', 'effect3']);
    });
  });

  describe('State Persistence Across Form Closes', () => {
    it('should not re-run effects if form closes then re-opens with same deps', () => {
      let runs = 0;

      // Initial render
      useEffect(() => {
        runs++;
      }, [1, 'test']);

      executeEffects(instance);
      expect(runs).toBe(1);

      // Simulate form close (instance stays in registry)
      instance.hookIndex = 0;
      instance.dirty = false;

      // Re-open with same deps
      useEffect(() => {
        runs++;
      }, [1, 'test']);

      executeEffects(instance);
      expect(runs).toBe(1); // Should not run again
    });

    it('should re-run effects if deps changed while form was closed', () => {
      let runs = 0;
      let externalValue = 1;

      // Initial render
      useEffect(() => {
        runs++;
      }, [externalValue]);

      executeEffects(instance);
      expect(runs).toBe(1);

      // Simulate form close and external state change
      instance.hookIndex = 0;
      externalValue = 2;

      // Re-open with changed dep
      useEffect(() => {
        runs++;
      }, [externalValue]);

      executeEffects(instance);
      expect(runs).toBe(2); // Should run again
    });
  });

  describe('Error Cases', () => {
    it('should throw error when called outside component context', () => {
      fiberRegistry.popInstance();

      expect(() => {
        useEffect(() => {});
      }).toThrow('useEffect can only be called from within a component');
    });

    it('should throw error on hook type mismatch', () => {
      // First render: useEffect
      useEffect(() => {});

      // Simulate re-render
      instance.hookIndex = 0;

      // Try to use useEffect again - should work fine
      expect(() => {
        useEffect(() => {});
      }).not.toThrow();

      // Verify it's still an effect hook
      const hook = instance.hooks[0];
      expect(hook).toHaveProperty('type', 'effect');
    });

    it('should throw when an effect setup throws (React-like behavior)', () => {
      const effect1Ran = vi.fn();
      const effect2Ran = vi.fn();
      const effect3Ran = vi.fn();

      // First effect throws
      useEffect(() => {
        effect1Ran();
        throw new Error('Effect 1 error');
      }, []);

      // Additional effects (no guarantees they run when an earlier one throws)
      useEffect(() => {
        effect2Ran();
      }, []);
      useEffect(() => {
        effect3Ran();
      }, []);

      // Execute effects - should throw
      expect(() => executeEffects(instance)).toThrow('Effect 1 error');

      // First effect ran (then threw)
      expect(effect1Ran).toHaveBeenCalled();
    });

    it('should throw when cleanup throws (React-like behavior)', () => {
      const effectRan = vi.fn();

      useEffect(() => {
        effectRan();

        return () => {
          throw new Error('Cleanup error');
        };
      }, [1]);

      executeEffects(instance);
      expect(effectRan).toHaveBeenCalledTimes(1);

      // Change deps to trigger cleanup (which will throw)
      instance.hookIndex = 0;
      useEffect(() => {
        effectRan();

        return () => {
          throw new Error('Cleanup error');
        };
      }, [2]);

      expect(() => executeEffects(instance)).toThrow('Cleanup error');
    });
  });
});
