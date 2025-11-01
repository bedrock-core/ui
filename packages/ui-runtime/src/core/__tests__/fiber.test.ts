import { describe, it, expect, vi } from 'vitest';
import type { FunctionComponent, JSX } from '../../jsx';
import type { Player } from '@minecraft/server';
import { FiberRegistry, runWithContext } from '../fiber';
import { executeEffects } from '../../hooks';
import { useState } from '../../hooks/useState';
import { useEffect } from '../../hooks/useEffect';
import { useEvent } from '../../hooks/useEvent';
import type { EventSignal } from '../../hooks/types';

// Minimal helper to simulate one render pass of a function component
function renderOnce<P = JSX.Props>(
  registry: FiberRegistry,
  id: string,
  comp: FunctionComponent<P>,
  props: P,
): void {
  const instance = registry.getOrCreateInstance(
    id,
    {} as unknown as Player,
    comp as unknown as FunctionComponent,
    props as unknown as JSX.Props,
  );

  registry.pushInstance(instance);
  try {
    runWithContext({ registry, instance }, () => {
      comp(props);
    });
  } finally {
    registry.popInstance();
  }

  // Execute effects scheduled by this render
  executeEffects(instance);
}

class FakeEventSource<T, O = Record<string, unknown>> implements EventSignal<T, O> {
  private _subs = new Set<(e: T) => void>();

  subscribe(cb: (e: T) => void): (e: T) => void {
    this._subs.add(cb);

    return cb;
  }

  unsubscribe(cb: (e: T) => void): void {
    this._subs.delete(cb);
  }

  emit(e: T): void {
    for (const cb of Array.from(this._subs)) {
      cb(e);
    }
  }
}

describe('core/fiber', () => {
  it('preserves useState values across re-renders', () => {
    const registry = new FiberRegistry();
    const id = 'playerA:Counter';

    const Comp: FunctionComponent = () => {
      const [count, setCount] = useState(0);
      // bump once on mount
      useEffect(() => {
        setCount(1);
      }, []);

      // Sanity check inside render
      expect(count).toBeLessThanOrEqual(1);

      return { type: 'fragment', props: { children: [] } } as unknown as JSX.Element;
    };

    // First render + run mount effect
    renderOnce(registry, id, Comp, {} as JSX.Props);

    // Re-render to observe updated state
    renderOnce(registry, id, Comp, {} as JSX.Props);

    const inst = registry.getInstance(id)!;
    const firstHook = inst.hooks[0];
    expect(firstHook).toBeDefined();
    if (!firstHook) return;
    expect(firstHook.type).toBe('state');
    if (firstHook.type === 'state') {
      expect(firstHook.value).toBe(1);
    }
  });

  it('runs effect on deps change and calls cleanup', () => {
    const registry = new FiberRegistry();
    const id = 'playerA:Effect';

    const cleanupSpy = vi.fn();
    const effectSpy = vi.fn(() => cleanupSpy);

    let toggle = true;
    const Comp: FunctionComponent = () => {
      useEffect(effectSpy, [toggle]);

      return { type: 'fragment', props: { children: [] } } as unknown as JSX.Element;
    };

    // initial render → runs effect
    renderOnce(registry, id, Comp, {} as JSX.Props);

    // change deps
    toggle = false;

    // second render → cleanup(prev) then run effect again
    renderOnce(registry, id, Comp, {} as JSX.Props);

    expect(effectSpy).toHaveBeenCalledTimes(2);
    expect(cleanupSpy).toHaveBeenCalledTimes(1);
  });

  it('isolates event updates per instance (simulating per-player)', () => {
    const registry = new FiberRegistry();
    const idA = 'playerA:EventCounter';
    const idB = 'playerB:EventCounter';
    const bus = new FakeEventSource<{ msg: string }>();

    const makeComp = (): FunctionComponent => {
      const Comp: FunctionComponent = () => {
        const [count, setCount] = useState(0);
        useEvent(bus, () => setCount(p => p + 1));

        // Return count for potential future assertions
        void count;

        return { type: 'fragment', props: { children: [] } } as unknown as JSX.Element;
      };

      return Comp;
    };

    const CompA = makeComp();
    const CompB = makeComp();

    renderOnce(registry, idA, CompA, {} as JSX.Props);
    renderOnce(registry, idB, CompB, {} as JSX.Props);

    // Both subscribed; emit two events
    bus.emit({ msg: 'x1' });
    bus.emit({ msg: 'x2' });

    const a = registry.getInstance(idA)!;
    const b = registry.getInstance(idB)!;
    const aHook = a.hooks[0];
    const bHook = b.hooks[0];
    expect(aHook).toBeDefined();
    expect(bHook).toBeDefined();
    if (!aHook || !bHook) return;
    expect(aHook.type).toBe('state');
    expect(bHook.type).toBe('state');
    if (aHook.type === 'state' && bHook.type === 'state') {
      expect(aHook.value).toBe(2);
      expect(bHook.value).toBe(2);
    }
  });

  it('cleans up event subscriptions on unmount', () => {
    const registry = new FiberRegistry();
    const id = 'playerA:Unmount';

    const unsubscribeSpy = vi.fn();

    const fakeSource: EventSignal<{ x: number }> = {
      subscribe: vi.fn(cb => cb),
      unsubscribe: unsubscribeSpy,
    };

    const Comp: FunctionComponent = () => {
      useEvent(fakeSource, () => { /* noop */ });

      return { type: 'fragment', props: { children: [] } } as unknown as JSX.Element;
    };

    // Mount once (subscribe happens via effect)
    renderOnce(registry, id, Comp, {} as JSX.Props);

    // Unmount: run cleanup only
    const inst = registry.getInstance(id)!;
    executeEffects(inst, true);
    registry.deleteInstance(id);

    expect(unsubscribeSpy).toHaveBeenCalledTimes(1);
  });

  it('throws when hook type at index changes across renders (order mismatch)', () => {
    const registry = new FiberRegistry();
    const id = 'playerA:HookOrder';

    const Comp: FunctionComponent<{ toggle: boolean }> = ({ toggle }) => {
      if (toggle) {
        useEffect(() => { /* noop */ }, []);
      }

      // This useState will shift to index 0 when toggle=false
      // causing a mismatch against previous useEffect at index 0
      useState(0);

      return { type: 'fragment', props: { children: [] } } as unknown as JSX.Element;
    };

    // First render with toggle=true → registers effect at index 0
    renderOnce(registry, id, Comp as unknown as FunctionComponent, { toggle: true } as unknown as JSX.Props);

    // Second render with toggle=false → useState at index 0 should throw
    expect(() => {
      renderOnce(registry, id, Comp as unknown as FunctionComponent, { toggle: false } as unknown as JSX.Props);
    }).toThrowError(/Hook type mismatch/);
  });

  it('throws when calling hooks outside of a render context', () => {
    // useState should throw because no current render context is set
    expect(() => {
      const [value, setValue] = useState(0);
      void value; void setValue;
    }).toThrowError(/No active render context/);

    expect(() => {
      useEffect(() => {});
    }).toThrowError(/No active render context/);
  });
});
