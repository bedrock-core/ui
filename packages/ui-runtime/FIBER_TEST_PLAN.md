# Runtime Test Plan

This document defines a detailed plan for verifying correctness, isolation, and reliability
of the **custom async JSX runtime** described in `runtime-design.md`.

The runtime implements:
- Manual async context management (`runWithContext`)
- Hook state (`useState`, `useEffect`, `useEvent`)
- Independent fiber trees for multiple roots (e.g., one per player)
- Async-safe event handling

---

## 1. Test Objectives

1. ✅ Ensure that hooks correctly preserve and restore state.
2. ✅ Verify that async callbacks (`useEvent`, effects) execute in the proper fiber context.
3. ✅ Confirm isolation between multiple concurrent roots (no cross-player contamination).
4. ✅ Validate proper cleanup of event subscriptions and effects.
5. ✅ Check correct re-render scheduling and hook order consistency.
6. ✅ Stress-test concurrent async events for race conditions.
7. ✅ Confirm deterministic behavior under repeated renders.

---

## 2. Test Environment Setup

Create a minimal testing harness with:
- TypeScript + your runtime core (`runWithContext`, `useState`, `useEvent`, etc.)
- A fake `system.afterEvents.scriptEventReceive` event bus
- Mocked components (JSX elements represented as plain functions)
- A scheduler that simulates multiple player roots

<pre><code class="language-ts">
class FakeEventSource&lt;T&gt; {
  private subs = new Set&lt;(e: T) =&gt; void&gt;();

  subscribe(fn: (e: T) =&gt; void) { this.subs.add(fn); }
  unsubscribe(fn: (e: T) =&gt; void) { this.subs.delete(fn); }
  emit(event: T) { for (const fn of this.subs) fn(event); }
}

export const system = {
  afterEvents: {
    scriptEventReceive: new FakeEventSource&lt;{ id: string; message: string }&gt;(),
  },
  sendScriptEvent(id: string, message: string) {
    system.afterEvents.scriptEventReceive.emit({ id, message });
  },
};
</code></pre>

---

## 3. Unit Tests

### 3.1 Basic Hook State Preservation

**Goal:** Confirm `useState` retains values across re-renders.

<pre><code class="language-ts">
it("preserves useState values across re-renders", async () =&gt; {
  const Comp = () =&gt; {
    const [count, setCount] = useState(0);
    useEffect(() =&gt; { setCount(1); }, []);
    expect(count).toBeLessThanOrEqual(1);
  };

  await render(&lt;Comp /&gt;, "playerA");
  await flushRenders();
  const root = getRoot("playerA");
  expect(root.rootFiber.hooks[0]).toBe(1);
});
</code></pre>

---

### 3.2 Effect Execution and Cleanup

**Goal:** Verify `useEffect` runs only on dependency changes and cleans up.

<pre><code class="language-ts">
it("runs effect on deps change and calls cleanup", async () =&gt; {
  const cleanupSpy = vi.fn();
  const effectSpy = vi.fn(() =&gt; cleanupSpy);

  let toggle = true;
  const Comp = () =&gt; {
    useEffect(effectSpy, [toggle]);
  };

  await render(&lt;Comp /&gt;, "playerA");
  toggle = false;
  await render(&lt;Comp /&gt;, "playerA");

  expect(effectSpy).toHaveBeenCalledTimes(2);
  expect(cleanupSpy).toHaveBeenCalledTimes(1);
});
</code></pre>

---

### 3.3 Event Handling per Player

**Goal:** Ensure events update only the correct player’s fiber.

<pre><code class="language-ts">
it("isolates event updates per player", async () =&gt; {
  const Comp = () =&gt; {
    const [count, setCount] = useState(0);
    useEvent(system.afterEvents.scriptEventReceive, () =&gt; setCount(p =&gt; p + 1));
    return count;
  };

  await render(&lt;Comp /&gt;, "playerA");
  await render(&lt;Comp /&gt;, "playerB");

  system.sendScriptEvent("test", "x1");
  await flushRenders();

  const a = getRoot("playerA").rootFiber.hooks[0];
  const b = getRoot("playerB").rootFiber.hooks[0];
  expect(a).toBe(1);
  expect(b).toBe(1);

  system.sendScriptEvent("test", "x2");
  await flushRenders();

  expect(getRoot("playerA").rootFiber.hooks[0]).toBe(2);
  expect(getRoot("playerB").rootFiber.hooks[0]).toBe(2);
});
</code></pre>

---

### 3.4 Context Integrity in Async Handlers

**Goal:** Verify that callbacks maintain the correct fiber even after async delays.

<pre><code class="language-ts">
it("maintains fiber context across async callbacks", async () =&gt; {
  const Comp = () =&gt; {
    const [msg, setMsg] = useState("none");
    useEvent(system.afterEvents.scriptEventReceive, async (e) =&gt; {
      await new Promise(r =&gt; setTimeout(r, 10));
      setMsg(e.message);
    });
  };

  await render(&lt;Comp /&gt;, "playerA");
  system.sendScriptEvent("id1", "asyncTest");
  await flushRenders();

  const fiber = getRoot("playerA").rootFiber;
  expect(fiber.hooks[0]).toBe("asyncTest");
});
</code></pre>

---

### 3.5 Hook Order Consistency

**Goal:** Ensure hooks are called in the same order across re-renders.

<pre><code class="language-ts">
it("throws when hook order changes", async () =&gt; {
  const Comp = ({ toggle }: { toggle: boolean }) =&gt; {
    useState(0);
    if (toggle) useState(1); // illegal hook order change
  };
  await expect(render(&lt;Comp toggle={true} /&gt;, "playerA")).rejects.toThrow();
});
</code></pre>

---

### 3.6 Concurrent Render Stress Test

**Goal:** Ensure correct updates when multiple players receive simultaneous async events.

<pre><code class="language-ts">
it("handles concurrent events across multiple roots", async () =&gt; {
  await render(&lt;EventCounter /&gt;, "playerA");
  await render(&lt;EventCounter /&gt;, "playerB");

  // simulate concurrent events
  await Promise.all([
    Promise.resolve().then(() =&gt; system.sendScriptEvent("E1", "MsgA")),
    Promise.resolve().then(() =&gt; system.sendScriptEvent("E2", "MsgB")),
  ]);

  await flushRenders();

  const a = getRoot("playerA").rootFiber.hooks[0];
  const b = getRoot("playerB").rootFiber.hooks[0];
  expect(a).toBeGreaterThan(0);
  expect(b).toBeGreaterThan(0);
});
</code></pre>

---

### 3.7 Event Unsubscription on Unmount

**Goal:** Ensure event handlers are unsubscribed when components unmount.

<pre><code class="language-ts">
it("cleans up event subscriptions on unmount", async () =&gt; {
  const unsubscribeSpy = vi.fn();

  const fakeSource = {
    subscribe: vi.fn(),
    unsubscribe: unsubscribeSpy,
  };

  const Comp = () =&gt; {
    useEvent(fakeSource, () =&gt; {});
  };

  const root = await render(&lt;Comp /&gt;, "playerA");
  await unmount(root);
  expect(unsubscribeSpy).toHaveBeenCalled();
});
</code></pre>

---

## 4. Integration Tests

### 4.1 Realistic UI Flow Simulation

Simulate the `EventCounter` component reacting to multiple emitted events for two players.

Expected behavior:
- Each player’s displayed `eventCount` increments independently.
- Messages reflect the most recent event per player.
- `system.sendScriptEvent("bc-ui:test", "EventCounter mounted")` runs once per player.

<pre><code class="language-ts">
it("isolates full EventCounter state per player", async () =&gt; {
  await render(&lt;EventCounter /&gt;, "playerA");
  await render(&lt;EventCounter /&gt;, "playerB");

  system.sendScriptEvent("bc-ui:test", "A1");
  system.sendScriptEvent("bc-ui:test", "B1");
  await flushRenders();

  const aFiber = getRoot("playerA").rootFiber;
  const bFiber = getRoot("playerB").rootFiber;
  expect(aFiber.hooks[0]).toBe(1);
  expect(bFiber.hooks[0]).toBe(1);
});
</code></pre>

---

## 5. Stress & Edge Cases

1. **Rapid Event Bursts:**  
   Emit hundreds of events within milliseconds — verify no lost updates.

2. **Async Chain Depth:**  
   Event handlers performing nested `await` calls should still resolve in the correct fiber.

3. **Hook Memory Stability:**  
   Ensure no memory leaks after repeated mounts/unmounts.

4. **Error Propagation:**  
   Verify exceptions inside effects or event handlers do not corrupt other fibers.

---

## 6. Automation Strategy

- Use **Vitest** or **Jest** for unit/integration tests.
- Simulate async behavior using Promises + fake timers.
- For visualization, optionally build a console renderer that logs fiber state per root after each render.

Example helper:

<pre><code class="language-ts">
export async function flushRenders() {
  await Promise.resolve();
  // Wait for microtasks + any queued re-renders
}
</code></pre>

---

## 7. Success Criteria

| Category | Expected Outcome |
|-----------|------------------|
| Context Isolation | Each fiber only updates its own state |
| Hook Order | Deterministic order or clear error |
| Async Safety | Context preserved across awaits |
| Subscription Cleanup | No dangling listeners |
| Concurrency | Multiple roots update safely in parallel |
| Stability | No race conditions or memory leaks |

---

This test plan ensures full coverage of correctness, concurrency, and lifecycle behaviors
in the async JSX runtime across multiple player contexts.
