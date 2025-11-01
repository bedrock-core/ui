# Architecture Mismatch Report

## Executive Summary

The current implementation **deviates significantly from the `UPDATE_PLAN.md` specification**. The plan outlines a **RenderContext-based async execution model** with manual context propagation, but the current code uses a different pattern that's breaking due to missing exports and incomplete implementations.

**Status:** 12 compilation errors blocking the build.

---

## Design Goals (from UPDATE_PLAN.md)

1. **Multiple independent fiber trees** – one per player or UI root
2. **Context management via `runWithContext()`** – manual context propagation without `AsyncLocalStorage`
3. **Async event handling** – callbacks wrapped to maintain fiber context
4. **React-like hooks** with fiber-isolated state
5. **No global mutable state** – everything keyed to player/root ID

---

## Current Architecture

The current implementation uses:

- **FiberRegistry** – centralized global registry (one per render session)
- **ComponentInstance stack** – fiber stack per registry
- **TraversalContext** – context passed during render tree expansion
- **Hook state storage** – per-component-instance hooks array
- **Direct Minecraft event subscriptions** – not wrapped in context

---

## Key Mismatches

### 1. **Missing Context Access API** ❌

**UPDATE_PLAN.md specifies:**
```typescript
interface RenderContext {
  fiber: Fiber;
}

let currentContext: RenderContext | null = null;

export function runWithContext<T>(ctx: RenderContext, fn: () => T): T {
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
```

**Current Implementation:**
- ❌ No `RenderContext` interface
- ❌ No `runWithContext()` function
- ❌ No `getCurrentContext()` function
- ❌ Missing `getCurrentActiveRegistry()` (breaking 5 files)
- ❌ Missing `setCurrentActiveRegistry()` (used in 5 test files)

**Compilation Errors:**
- `suspension.ts:4` – Cannot import `getCurrentActiveRegistry`
- `useExit.ts:1` – Cannot import `getCurrentActiveRegistry`
- `useState.ts:3` – Cannot import `getCurrentActiveRegistry`
- `useEffect.ts:61` – Cannot find `getCurrentActiveRegistry`
- `useReducer.ts:55` – Cannot find `getCurrentActiveRegistry`
- 5 test files – Cannot import `setCurrentActiveRegistry`

---

### 2. **Global Registry Management** ⚠️

**UPDATE_PLAN.md pattern:**
```typescript
const roots = new Map<string, FiberRoot>();

export function render(element: any, playerId: string) {
  const fiberRoot: FiberRoot = {...};
  roots.set(playerId, fiberRoot);
  scheduleRender(fiberRoot);
}
```

**Current Implementation:**
- Creates a new `FiberRegistry` per render session
- No global `roots` map tracking all active renderers
- No `playerId` based registration
- Registry is passed explicitly through `RenderOptions`

**Issue:** Tests and hooks trying to call `getCurrentActiveRegistry()` which doesn't exist as a global accessor.

---

### 3. **Fiber Structure Mismatch** ⚠️

**UPDATE_PLAN.md:**
```typescript
interface Fiber {
  id: string;
  type: Function;       // component function
  props: any;
  hooks: any[];
  hookIndex: number;
  root: FiberRoot;      // backreference to owning root
}
```

**Current Implementation:**
```typescript
interface ComponentInstance {
  id: string;
  player: Player;           // Direct player ref instead of root
  componentType: FunctionComponent;
  props: JSX.Props;
  hooks: Hook[];
  hookIndex: number;
  mounted: boolean;
  shouldRender: boolean;
  registry: FiberRegistry;  // Registry instead of FiberRoot
}
```

**Issue:** Nomenclature and structure don't align. Current uses `ComponentInstance` instead of `Fiber`, and stores `Player` instead of root reference.

---

### 4. **Async Event Handling** ❌

**UPDATE_PLAN.md specifies:**
```typescript
export function useEvent<T>(
  eventSource: { subscribe: (fn: (e: T) => void) => void; ... },
  handler: (event: T) => void
) {
  const { fiber } = getCurrentContext();

  useEffect(() => {
    const wrapped = (e: T) => runWithContext({ fiber }, () => handler(e));
    eventSource.subscribe(wrapped);
    return () => eventSource.unsubscribe(wrapped);
  }, [eventSource, handler]);
}
```

**Current Implementation (useEvent.ts):**
- Uses `useEffect` to manage subscriptions
- ✅ Good pattern, but...
- ❌ No `runWithContext()` wrapping of callbacks
- ❌ No context restoration when async events fire
- ❌ Events fire in unknown context, risk losing fiber reference

**Risk:** When a Minecraft event fires asynchronously (e.g., `world.afterEvents.playerJoin`), the callback has no access to `getCurrentContext()`, making state updates from global events dangerous.

---

### 5. **Hook Implementation Gaps** ⚠️

**useEffect.ts (line 61):**
```typescript
const instance: ComponentInstance | undefined = getCurrentActiveRegistry().getCurrentInstance();
```
❌ `getCurrentActiveRegistry()` doesn't exist

**useRef.ts (line 25):**
```typescript
const instance: ComponentInstance | undefined = ??;  // INCOMPLETE!
```
❌ Incomplete implementation – `??` syntax error

**useReducer.ts, useState.ts:**
- All trying to call missing `getCurrentActiveRegistry()`

---

### 6. **Test Infrastructure Broken** 🔴

**5 test files trying to import missing functions:**
```typescript
import { FiberRegistry, setCurrentActiveRegistry } from '../../core/fiber';
```

Tests can't run because:
- ❌ `setCurrentActiveRegistry()` not exported
- ❌ Tests can't set up isolated fiber contexts
- ❌ Testing async event handling impossible without context wrapping

---

## Compilation Error Summary

| File | Error | Root Cause |
|------|-------|-----------|
| `suspension.ts:4` | Cannot import `getCurrentActiveRegistry` | Missing global context API |
| `useExit.ts:1` | Cannot import `getCurrentActiveRegistry` | Missing global context API |
| `useState.ts:3` | Cannot import `getCurrentActiveRegistry` | Missing global context API |
| `useEffect.ts:61` | Cannot find `getCurrentActiveRegistry` | Missing global context API |
| `useReducer.ts:55` | Cannot find `getCurrentActiveRegistry` | Missing global context API |
| `useRef.ts:25` | Expression expected (`??`) | Incomplete implementation |
| `suspension.ts:71` | Parameter 'hook' implicitly any | Type annotation missing |
| 5 × `*.test.ts` | Cannot import `setCurrentActiveRegistry` | Missing test API |

---

## Recommended Fixes (Priority Order)

### Phase 1: Core Context Management
1. **Add `RenderContext` interface to `fiber.ts`**
   ```typescript
   export interface RenderContext {
     registry: FiberRegistry;
     instance: ComponentInstance;
   }
   ```

2. **Implement global context storage in `fiber.ts`**
   ```typescript
   let currentRenderContext: RenderContext | null = null;
   
   export function getCurrentActiveRegistry(): FiberRegistry {
     if (!currentRenderContext) throw new Error(...);
     return currentRenderContext.registry;
   }
   
   export function runWithContext<T>(
     ctx: RenderContext, 
     fn: () => T
   ): T {
     const prev = currentRenderContext;
     currentRenderContext = ctx;
     try {
       return fn();
     } finally {
       currentRenderContext = prev;
     }
   }
   ```

3. **Export `setCurrentActiveRegistry()` for testing**
   ```typescript
   export function setCurrentActiveRegistry(registry: FiberRegistry | null): void {
     currentRenderContext = registry ? { registry, instance: ... } : null;
   }
   ```

### Phase 2: Hook Fixes
4. **Complete `useRef.ts` implementation**
5. **Fix type annotations in `suspension.ts`**
6. **Update all hooks to use fixed global context API**

### Phase 3: Async Safety
7. **Wrap Minecraft event callbacks in `useEvent.ts`**
   ```typescript
   const wrapped = (e: T) => runWithContext({ registry, instance }, () => handler(e));
   ```

8. **Update `render.ts` to set context before calling components**
   ```typescript
   const ctx: RenderContext = { registry, instance };
   await runWithContext(ctx, () => expandAndResolveContexts(...));
   ```

### Phase 4: Testing
9. **Restore test helper functions**
10. **Ensure tests can create isolated fiber contexts**

---

## Architecture Alignment Checklist

| Requirement | Current | Status | Fix |
|------------|---------|--------|-----|
| Global context per fiber tree | ❌ Missing | 🔴 | Add `RenderContext` + `runWithContext()` |
| Manual context propagation | ⚠️ Via stack | 🟡 | Use explicit context wrapping |
| Per-player fiber isolation | ✅ Partial | 🟡 | Add player-based root tracking |
| Async event wrapping | ❌ Missing | 🔴 | Wrap callbacks in `useEvent` |
| Hook context access | ❌ Broken | 🔴 | Fix `getCurrentActiveRegistry()` |
| Test context setup | ❌ Missing | 🔴 | Add `setCurrentActiveRegistry()` |

---

## Risk Assessment

**High Risk:**
- ❌ Async events (e.g., `world.afterEvents.playerJoin`) will lose context → state updates fail
- ❌ Hooks can't find current instance → runtime errors
- ❌ Tests can't isolate context → can't test concurrent renders

**Medium Risk:**
- ⚠️ Multiple renders in flight might interfere (no async safety)
- ⚠️ Context not restored if exceptions occur (missing try/finally)

**Build Blocking:**
- 🔴 12 compilation errors prevent build
- 🔴 Tests can't run
- 🔴 No way to test async event handling

---

## Next Steps

1. Implement Phase 1 fixes to unblock compilation
2. Run full test suite to identify runtime issues
3. Add async event wrapping in Phase 3
4. Add integration tests for multi-player concurrent renders
