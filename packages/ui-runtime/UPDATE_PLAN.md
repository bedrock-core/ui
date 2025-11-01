# 🧠 Fiber Dispatcher Design Plan

## Overview

This document describes an abstract architecture for a **hook and context management system** similar to React’s internals.  
It explains how multiple fibers (units of work) can each have independent dispatchers and hook registries, all managed asynchronously from a global map — **without requiring explicit context passing** by the user.

---

## 1. Core Concept

The system provides **implicit context** to hook calls by maintaining a dynamically scoped reference to the **currently active fiber** and its **dispatcher**.

When executing a function (e.g., a component or task):
- The system sets the “current fiber” globally.
- All hook calls made during this time automatically attach to that fiber.
- Once execution ends, the global state is restored.

This enables hook functions to operate without explicit arguments while still accessing the correct state and context.

---

## 2. Core Entities

### 🧩 Fiber
A **fiber** represents one unit of work — a task, component, or async operation.

Each fiber maintains:
- A unique **identifier**
- A list of **hook states** (values and metadata)
- A **hook index** (tracking hook order)
- A **dispatcher** defining the behavior of hooks

Fibers are self-contained and independent.

---

### ⚙️ Dispatcher
A **dispatcher** defines what each hook (e.g., `useState`, `useEffect`) *does* when called.

Each dispatcher:
- Is associated with exactly one fiber at a time
- Knows how to access and manipulate that fiber’s hook state
- Provides implementations like:
  - `useState`
  - `useContext`
  - `useEffect`
- Can vary by phase (initial mount, update, resume, etc.)

Different fibers can have different dispatchers active concurrently.

---

### 🌐 Global Context
A pair of global pointers define the *active execution context*:

- `CurrentFiber` — which fiber is currently running  
- `CurrentDispatcher` — the dispatcher to delegate hook calls to

During execution, these are set before running a fiber’s function and reset afterward.

All hook functions reference these globals to determine their operational context.

---

## 3. Global Registry

A **global fiber registry** (e.g., a map keyed by fiber ID) tracks all active fibers.  
Each entry includes the fiber’s state, dispatcher, and metadata.

This registry enables:
- Independent async execution
- Resuming suspended fibers
- Consistent lookup for debugging or introspection

---

## 4. Execution Model

### Step 1: Activation
Before running a fiber’s function:
1. Save the previous global context.
2. Set `CurrentFiber` to the target fiber.
3. Set `CurrentDispatcher` to the fiber’s dispatcher.
4. Reset the fiber’s `hookIndex` to zero.

### Step 2: Execution
The user’s function runs inside this context.  
Each hook call:
- Reads the current dispatcher from global scope.
- The dispatcher reads or initializes state from the fiber’s hook registry.
- The fiber’s hook index increments to preserve deterministic ordering.

### Step 3: Restoration
After execution:
1. The global context is restored to its previous state.
2. The fiber’s updated hook state is retained in the registry.
3. The system is ready to activate another fiber.

---

## 5. Hook Resolution Model

Each hook (e.g., `useState`, `useEffect`) is an interface that delegates to the **current dispatcher**, not a global implementation.

Example conceptually:

```
useState(initial) → CurrentDispatcher.useState(CurrentFiber, initial)
```

The dispatcher determines how to:
- Initialize new state (on first render)
- Retrieve existing state (on update)
- Queue updates or side effects
- Subscribe to contexts or signals

---

## 6. Context Propagation

### Context Registry
A global registry stores all context providers and their current values.

### Fiber Context Dependencies
Each fiber maintains a list of contexts it depends on.  
When a `useContext(Context)` call occurs:
1. The dispatcher reads the context’s current value from the global registry.
2. The fiber registers this dependency for revalidation when contexts change.

This allows fibers to react to external context changes without explicit data passing.

---

## 7. Concurrency & Async Handling

Each fiber can be **activated asynchronously**.  
To support this safely:
- The `CurrentFiber` and `CurrentDispatcher` pointers must be **scoped to an async execution frame**.
- Before running async tasks, the system binds the correct fiber context.
- On completion or suspension, the global state is restored.

This design allows multiple fibers to coexist, each executing in isolation, without shared-state conflicts.

---

## 8. Dispatcher Variants

Different dispatchers can be used depending on phase:

| Phase | Purpose |
|-------|----------|
| **Mount Dispatcher** | Handles first-time initialization of hooks |
| **Update Dispatcher** | Reuses existing hook state during re-renders |
| **Resume Dispatcher** | Restores state after an async pause |
| **Snapshot Dispatcher** | Used for concurrent or time-sliced updates |

Each dispatcher variant defines the same API surface (`useState`, `useEffect`, etc.) but with phase-specific behavior.

---

## 9. Lifecycle Summary

1. **Fiber Creation**  
   A fiber is instantiated and added to the global registry.

2. **Fiber Activation**  
   The global current pointers are set, and hook execution begins.

3. **Hook Evaluation**  
   Each hook call delegates to the current dispatcher for that fiber.

4. **Completion / Suspension**  
   Fiber state is saved, and the global pointers are reset.

5. **Reactivation**  
   The fiber resumes with its previous state intact.

---

## 10. Design Principles

| Principle | Description |
|------------|-------------|
| **Dynamic Scope** | Implicitly provides the current fiber/dispatcher to hooks |
| **Fiber-local State** | Each fiber maintains its own isolated hook registry |
| **Dispatcher Indirection** | Hook semantics determined per fiber or phase |
| **Deterministic Order** | Hook order defines state slot consistency |
| **Global Registry** | Enables fiber lookup and lifecycle control |
| **Async-safe Contexts** | Scoped global context per execution frame |

---

## 11. Summary

This architecture enables:
- Multiple concurrent or asynchronous “fiber” contexts
- Implicit context propagation for hooks
- Independent, phase-specific dispatchers
- Stable and deterministic state restoration
- A foundation for advanced scheduling and concurrency (like React’s Fiber system)

The design decouples **what hooks do** (dispatcher behavior) from **which fiber they belong to** (execution context), providing a flexible model for building composable, async-safe hook runtimes.

---
## 12. Fiber-Dispatcher Control Flow Diagram

```text
                ┌──────────────────────────┐
                │      Global Registry      │
                │  FiberID → Fiber Object   │
                └─────────────┬────────────┘
                              │
                              ▼
                   ┌─────────────────────┐
                   │   CurrentFiber      │◄───────────┐
                   │   CurrentDispatcher │            │
                   └─────────┬───────────┘            │
                             │                        │
                             ▼                        │
                   ┌─────────────────────┐            │
                   │      Fiber A        │            │
                   │  hookStates: [...]  │            │
                   │  hookIndex: 0       │            │
                   │  dispatcher: D_A    │            │
                   └─────────┬───────────┘            │
                             │                        │
     Hook call (useState) ───┘                        │
                             ▼                        │
                   ┌──────────────────────┐           │
                   │   Dispatcher D_A     │           │
                   │ useState(initial)    │           │
                   │ Reads/Writes state   │           │
                   │ in Fiber A hookStates│           │
                   └──────────────────────┘           │
                                                      │
                   ┌─────────────────────┐            │
                   │      Fiber B        │            │
                   │  hookStates: [...]  │            │
                   │  hookIndex: 0       │            │
                   │  dispatcher: D_B    │            │
                   └─────────┬───────────┘            │
                             │                        │
     Hook call (useState) ───┘                        │
                             ▼                        │
                   ┌──────────────────────┐           │
                   │   Dispatcher D_B     │           │
                   │ useState(initial)    │           │
                   │ Reads/Writes state   │           │
                   │ in Fiber B hookStates│           │
                   └──────────────────────┘           │

Notes:
- CurrentFiber / CurrentDispatcher are dynamically set before executing each fiber.
- Hook calls delegate to the dispatcher which manipulates fiber-local state.
- Multiple fibers can exist in the registry and execute asynchronously.
- Fiber state persists in the registry between activations.
