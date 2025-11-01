# Custom Async JSX Runtime Design

This document describes how to design a **custom JSX runtime** that supports:
- Multiple independent fiber trees (e.g., one per player or UI root)
- Async execution and event handling
- React-like hooks (`useState`, `useEffect`, `useEvent`)
- Context-safe updates without relying on Node’s `AsyncLocalStorage`

---

## 1. Core Concepts

Your runtime needs to maintain **per-component state** even when asynchronous events fire at any time.  
Each rendered UI (for example, one per player) will have its own **fiber tree**, and each component in that tree stores its own hook state.

When async events occur, the runtime ensures that callbacks execute **inside the correct fiber context** — so each player's UI updates independently.

---

## 2. Context Management

We maintain a manually propagated execution context to emulate something like `AsyncLocalStorage`.

<pre><code class="language-ts">
interface RenderContext {
  fiber: Fiber;
}

let currentContext: RenderContext | null = null;

export function runWithContext&lt;T&gt;(ctx: RenderContext, fn: () =&gt; T): T {
  const prev = currentContext;
  currentContext = ctx;
  try {
    return fn();
  } finally {
    currentContext = prev;
  }
}

export function getCurrentContext(): RenderContext {
  if (!currentContext) throw new Error("No active render context");
  return currentContext;
}
</code></pre>

Every time you render a component or invoke a user callback, wrap it inside `runWithContext`.

---

## 3. The Fiber Structure

A **fiber** represents one instance of a component in the tree.

<pre><code class="language-ts">
interface Fiber {
  id: string;
  type: Function;       // component function
  props: any;
  hooks: any[];
  hookIndex: number;
  root: FiberRoot;      // backreference to owning root
}

interface FiberRoot {
  id: string;           // e.g. player id
  rootFiber: Fiber;
}
</code></pre>

---

## 4. Rendering

Each UI root (per player) starts with its own fiber tree.

<pre><code class="language-ts">
const roots = new Map&lt;string, FiberRoot&gt;();

export function render(element: any, playerId: string) {
  const fiberRoot: FiberRoot = {
    id: playerId,
    rootFiber: createFiber(element),
  };
  roots.set(playerId, fiberRoot);
  scheduleRender(fiberRoot);
}

function createFiber(element: any): Fiber {
  return {
    id: crypto.randomUUID(),
    type: element.type,
    props: element.props,
    hooks: [],
    hookIndex: 0,
    root: null as any, // assigned later
  };
}

async function scheduleRender(root: FiberRoot) {
  await runWithContext({ fiber: root.rootFiber }, async () =&gt; {
    root.rootFiber.hookIndex = 0;
    await root.rootFiber.type(root.rootFiber.props);
  });
}
</code></pre>

---

## 5. Hooks Implementation

### `useState`

<pre><code class="language-ts">
export function useState&lt;T&gt;(initial: T): [T, (v: T | ((p: T) =&gt; T)) =&gt; void] {
  const { fiber } = getCurrentContext();
  const i = fiber.hookIndex++;
  if (!(i in fiber.hooks)) fiber.hooks[i] = initial;

  const setState = (value: T | ((prev: T) =&gt; T)) =&gt; {
    fiber.hooks[i] = typeof value === "function"
      ? (value as any)(fiber.hooks[i])
      : value;
    scheduleRender(fiber.root);
  };

  return [fiber.hooks[i], setState];
}
</code></pre>

---

### `useEffect`

<pre><code class="language-ts">
export function useEffect(effect: () =&gt; void | (() =&gt; void), deps: any[]) {
  const { fiber } = getCurrentContext();
  const i = fiber.hookIndex++;
  const prevDeps = fiber.hooks[i]?.deps;

  const changed = !prevDeps || deps.some((d, j) =&gt; d !== prevDeps[j]);
  if (changed) {
    if (fiber.hooks[i]?.cleanup) fiber.hooks[i].cleanup();
    const cleanup = effect();
    fiber.hooks[i] = { deps, cleanup };
  }
}
</code></pre>

---

### `useEvent`

`useEvent` subscribes to an external async event source.  
Each subscription is wrapped in the **fiber’s context**, ensuring isolated updates.

<pre><code class="language-ts">
export function useEvent&lt;T&gt;(
  eventSource: { subscribe: (fn: (e: T) =&gt; void) =&gt; void; unsubscribe: (fn: (e: T) =&gt; void) =&gt; void },
  handler: (event: T) =&gt; void
) {
  const { fiber } = getCurrentContext();

  useEffect(() =&gt; {
    const wrapped = (e: T) =&gt; runWithContext({ fiber }, () =&gt; handler(e));
    eventSource.subscribe(wrapped);
    return () =&gt; eventSource.unsubscribe(wrapped);
  }, [eventSource, handler]);
}
</code></pre>

---

## 6. Example: EventCounter Component

<pre><code class="language-ts">
export const EventCounter = () =&gt; {
  const [eventCount, setEventCount] = useState(0);
  const [lastEventId, setLastEventId] = useState("None");
  const [lastMessage, setLastMessage] = useState("-");

  useEvent(system.afterEvents.scriptEventReceive, event =&gt; {
    setEventCount(prev =&gt; prev + 1);
    setLastEventId(event.id);
    setLastMessage(event.message);
  });

  useEffect(() =&gt; {
    system.sendScriptEvent("bc-ui:test", "EventCounter mounted");
  }, []);

  return (
    &lt;Panel width={192} height={140} x={414} y={160}&gt;
      &lt;Text value={`Events: ${eventCount}`} /&gt;
      &lt;Text value={`ID: ${lastEventId}`} /&gt;
      &lt;Text value={`Msg: ${lastMessage}`} /&gt;
    &lt;/Panel&gt;
  );
};
</code></pre>

---

## 7. How it Works with Multiple Players

1. Each player’s call to `render(&lt;EventCounter /&gt;, playerId)` creates a new **fiber root**.  
2. The fiber tree stores its own hook data (`useState`, `useEffect`, etc.).  
3. When the global `system.afterEvents.scriptEventReceive` emits:
   - Every `useEvent` callback runs wrapped in its **own fiber context**.
   - `getCurrentContext()` returns that player’s fiber.
   - State updates and re-renders are isolated to that player’s tree.

This architecture allows truly concurrent async rendering without shared mutable globals.

---

## 8. Optional Debug Hook

Expose the current fiber for advanced inspection:

<pre><code class="language-ts">
export function useFiber(): Fiber {
  return getCurrentContext().fiber;
}
</code></pre>

---

## 9. Summary

| Concern | Solution |
|----------|-----------|
| Multiple async entry points | Each root has its own `FiberRoot` |
| Context propagation | Manual `runWithContext()` wrapper |
| Hook state storage | On `fiber.hooks[]` indexed by call order |
| Async callbacks losing context | Wrap callbacks using `runWithContext()` |
| Concurrent renders | Independent fiber trees for each player |

---

This design pattern gives you React-like semantics without depending on Node internals or a global render stack, fully async-safe and suitable for distributed runtime environments.
