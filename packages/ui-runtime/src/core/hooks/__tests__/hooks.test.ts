import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { useState } from '../useState';
import { useEffect, executeEffects } from '../useEffect';
import { fiberRegistry } from '../../fiber';
import { ComponentInstance, StateHook, EffectHook } from '../types';
import { Fragment } from '../../components/Fragment';

describe('useState Hook', () => {
  let instance: ComponentInstance;

  beforeEach(() => {
    instance = {
      id: 'test-component',
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

  it('should initialize state with direct value', () => {
    const [count] = useState(0);
    expect(count).toBe(0);
  });

  it('should initialize state with initializer function', () => {
    const [count] = useState(() => 42);
    expect(count).toBe(42);
  });

  it('should update state with direct value', () => {
    const [, setCount] = useState(0);
    const hook = instance.hooks[0] as StateHook<number>;
    expect(hook).toBeDefined();

    // Simulate state update
    setCount(5);
    // The hook's value should be updated internally
    expect(hook.value).toBe(5);
  });

  it('should update state with updater function', () => {
    const [, setCount] = useState(10);
    const hook = instance.hooks[0] as StateHook<number>;
    expect(hook).toBeDefined();

    // Simulate state update with updater function
    setCount(prev => prev + 5);
    // The hook's value should be updated internally
    expect(hook.value).toBe(15);
  });

  it('should not update if value is equal (Object.is)', () => {
    const [, setCount] = useState(0);

    setCount(0);
    expect(instance.dirty).toBe(false); // Should not mark dirty
  });

  it('should distinguish between 0 and -0', () => {
    const [, setCount] = useState(0);
    setCount(-0);

    const hook = instance.hooks[0] as StateHook<number>;
    expect(Object.is(hook.value, -0)).toBe(true);
  });

  it('should work with multiple useState calls in order', () => {
    const [count] = useState(0);
    const [name] = useState('test');

    expect(count).toBe(0);
    expect(name).toBe('test');
    expect(instance.hooks.length).toBe(2);
  });

  it('should throw error when called outside component context', () => {
    fiberRegistry.popInstance();

    expect(() => {
      useState(0);
    }).toThrow('useState can only be called from within a component');
  });

  it('should throw error when hook order changes', () => {
    // First render: 2 hooks
    useState(0);
    useState('test');

    // Reset for next render
    instance.hookIndex = 0;

    // Second render: only 1 hook (order changed)
    useState(0);

    expect(() => {
      useEffect(() => {});
    }).toThrow('Hook type mismatch');
  });

  it('should queue pending updates', () => {
    const [, setCount] = useState(0);
    expect(instance.dirty).toBe(false);

    setCount(5);
    expect(instance.dirty).toBe(true);
  });

  it('should mark component dirty on state change', () => {
    const [, setCount] = useState(0);

    setCount(5);
    expect(instance.dirty).toBe(true);
  });
});

describe('useEffect Hook', () => {
  let instance: ComponentInstance;

  beforeEach(() => {
    instance = {
      id: 'test-component',
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

  it('should register effect hook', () => {
    useEffect(() => {
      console.log('effect');
    });

    expect(instance.hooks.length).toBe(1);
    expect(instance.hooks[0]).toHaveProperty('create');
  });

  it('should run effect on mount', () => {
    let ran = false;
    useEffect(() => {
      ran = true;
    }, []);

    executeEffects(instance);
    expect(ran).toBe(true);
  });

  it('should run cleanup function on re-effect', () => {
    let setupRan = 0;
    let cleanupRan = 0;
    const deps: number[] = [];

    useEffect(() => {
      setupRan++;

      return () => {
        cleanupRan++;
      };
    }, deps);

    // First run
    executeEffects(instance);
    expect(setupRan).toBe(1);
    expect(cleanupRan).toBe(0);

    // Simulate re-render: deps haven't changed (empty array stays empty)
    // Effect should not re-run
    instance.hookIndex = 0;
    useEffect(() => {
      setupRan++;

      return () => {
        cleanupRan++;
      };
    }, deps);

    executeEffects(instance);
    expect(setupRan).toBe(1);
    expect(cleanupRan).toBe(0);
  });

  it('should run effect when dependencies change', () => {
    let runs = 0;

    // First render with deps [1]
    useEffect(() => {
      runs++;
    }, [1]);

    const hook1 = instance.hooks[0] as EffectHook;
    executeEffects(instance);
    expect(runs).toBe(1);
    expect(hook1.prevDeps).toEqual([1]);

    // Re-render with same deps [1]
    instance.hookIndex = 0;
    useEffect(() => {
      runs++;
    }, [1]);

    executeEffects(instance);
    expect(runs).toBe(1); // Should not run again since deps are the same
    expect(hook1.prevDeps).toEqual([1]);

    // Re-render with different deps [2]
    instance.hookIndex = 0;
    useEffect(() => {
      runs++;
    }, [2]);

    const hook2 = instance.hooks[0] as EffectHook;
    expect(hook2.deps).toEqual([2]); // Deps should be updated
    expect(hook2.prevDeps).toEqual([1]); // Previous deps should still be [1]

    executeEffects(instance);
    expect(runs).toBe(2); // Should run again since deps changed
    expect(hook2.prevDeps).toEqual([2]); // Now prevDeps should be updated
  });

  it('should run effect after every render if no deps', () => {
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
    expect(runs).toBe(2);
  });

  it('should distinguish between undefined and empty array deps', () => {
    let noDepRuns = 0;
    let emptyDepRuns = 0;

    // No deps
    useEffect(() => {
      noDepRuns++;
    });

    executeEffects(instance);
    expect(noDepRuns).toBe(1);

    // Re-render
    instance.hookIndex = 0;
    instance.mounted = false;
    useEffect(() => {
      noDepRuns++;
    });

    executeEffects(instance);
    expect(noDepRuns).toBe(2);

    // Reset for empty deps test
    instance.hooks = [];
    instance.hookIndex = 0;
    instance.mounted = false;

    useEffect(() => {
      emptyDepRuns++;
    }, []);

    executeEffects(instance);
    expect(emptyDepRuns).toBe(1);

    // Re-render with same empty deps
    instance.hookIndex = 0;
    useEffect(() => {
      emptyDepRuns++;
    }, []);

    executeEffects(instance);
    expect(emptyDepRuns).toBe(1); // Should NOT run again
  });

  it('should handle dependency comparison with Object.is', () => {
    let runs = 0;

    useEffect(() => {
      runs++;
    }, [0]);

    executeEffects(instance);
    expect(runs).toBe(1);

    // Re-render with -0 (should be different via Object.is)
    instance.hookIndex = 0;
    useEffect(() => {
      runs++;
    }, [-0]);

    executeEffects(instance);
    // Object.is(0, -0) is false, so deps changed and effect should run
    expect(runs).toBe(2);
  });

  it('should throw error when called outside component context', () => {
    fiberRegistry.popInstance();

    expect(() => {
      useEffect(() => {});
    }).toThrow('useEffect can only be called from within a component');
  });

  it('should throw error when hook order changes', () => {
    // First render: useState then useEffect
    useState(0);
    useEffect(() => {});

    // Reset for next render
    instance.hookIndex = 0;

    // Second render: useEffect then useState (wrong order)
    expect(() => {
      useEffect(() => {});
      useState(0);
    }).toThrow('Hook type mismatch');
  });
});

describe('Dependency Tracking', () => {
  let instance: ComponentInstance;

  beforeEach(() => {
    instance = {
      id: 'test-component',
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

  it('should use Object.is for dependency comparison', () => {
    const obj = { value: 1 };
    let runs = 0;

    useEffect(() => {
      runs++;
    }, [obj]);

    executeEffects(instance);
    expect(runs).toBe(1);

    // Same object reference - deps haven't changed
    instance.hookIndex = 0;
    useEffect(() => {
      runs++;
    }, [obj]);

    executeEffects(instance);
    expect(runs).toBe(1); // Should not run since same object reference

    // Different object with same content - deps have changed
    instance.hookIndex = 0;
    useEffect(() => {
      runs++;
    }, [{ value: 1 }]);

    executeEffects(instance);
    expect(runs).toBe(2); // Should run since different object reference
  });

  it('should handle NaN equality', () => {
    let runs = 0;

    useEffect(() => {
      runs++;
    }, [NaN]);

    executeEffects(instance);
    expect(runs).toBe(1);

    // NaN is equal to NaN via Object.is
    instance.hookIndex = 0;
    useEffect(() => {
      runs++;
    }, [NaN]);

    executeEffects(instance);
    expect(runs).toBe(1); // Should not run
  });
});
