# 07 — The runtime

The runtime is what cannot be baked: fibers, the allocation walk, carrier writes, input reads, and each host's open/close detection. Everything else moves to the build.

## Package layout

```
packages/ui-runtime/src/
  jsx/  hooks/  core/fabric/          unchanged: JSX runtime, hooks, fibers, owners, contexts
  core/build/                         expand.ts  layout.ts  inherit.ts   (layout + inherit: build-only entry)
  core/ir/                            analyze.ts  claims.ts  validate.ts   (shared with the build)
  core/layout/                        islands.ts   (re-solves an island inside its reserved box; the only runtime flexbox)
  core/session/                       session.ts  owner.ts  events.ts   (event objects, handler dispatch)
  hosts/                              index.ts (the list)  types.ts (the contract)
    chest/                            host.ts  contract.ts  charset.ts  allocate.ts  build.ts  index.ts
      runtime/                        session, poll, cells/*, channels, reconcile, items, players, watch, store
    form.ts                           form-action + form-modal (the interpreter runtime is still under core/render until phase 5)
  compile.ts                          the build-time surface (as today, wider)
packages/ui-compile/src/
  emit/                               jsonui.ts  document.ts  shapes.ts
  hosts/                              chest/emit.ts  form-action/emit.ts  form-modal/emit.ts
  compile.ts                          screen in, documents + placement out
```

What moves down into `ui-runtime` is only what BOTH halves run: liveness analysis, the ordered `claim` walk that reads a tree's needs, and the needs-vs-offers check. The IR node kinds and their lowering stay in `ui-compile`, because only the build emits — the runtime never needs a node, only the order of the claims and the values on them. That keeps the runtime smaller than a shared full IR would, which is the point of [01-goals](./01-goals.md) rule 1.

Each host's numbering — where its claims physically land — is the host's own, next to its runtime. Contracts (`contract.ts`) are the only files both halves of a host import.

One import rule holds the graph together: `hosts/index.ts` reaches a host through its `host.ts` alone, never its barrel. A host's barrel pulls in its runtime, its runtime pulls in the render session, and the render session asks `hosts/index.ts` which host a tree belongs to — so a registry that imported barrels would close that circle. The registry only ever needs the contract.

## Public API

| Call | Host | Change from today |
| --- | --- | --- |
| `render(Screen, player)` | form-action / form-modal, by the root element | unchanged signature; picks the compiled layout by the screen's key ([08-build-flow](./08-build-flow.md)), falls back to the interpreter for a screen the build did not compile |
| `createContainerScreen(Screen, options)` | chest | unchanged |
| hooks | all | `useExit` returns a value the IR recognises; `usePlayer` throws on entity-owned hosts as today |
| handlers | all | the event object ([05-components](./05-components.md)) |

## The per-render loop

```
render(owner)
  tree      = expand(root, owner)             fibers, same ids, same state
  placement = allocate(ir(tree))              the shared walk; no layout
  islands   = layoutIslands(placement)        only those whose layout-live inputs changed
  rects     = islands.map(solve inside its reserved box)
  diff      = (placement.values + rects) - lastWritten   per carrier address
  host.write(session, diff)
```

`allocate` at runtime reads values off the built elements the same way the build did, so a handler and a value are found by position, never by name. The whole-tree layout pass is not run: the base is baked, and only an island whose inputs changed is re-solved, with its root's box fixed. (Today's chest runtime already reads handlers this way; today's form runtime lays out the whole tree and serializes on every present — that is the code that goes.)

## Host runtime loops

- **chest**: unchanged in substance — `entityContainerOpened` / interact open a session per entity, a tick poll over the drawn range fingerprints slots and hands changes to the cell role (`press`, `insert`, `remove`), channels are written by stack size, state persists on the entity. Moves under `hosts/chest/runtime/`.
- **form-action**: `show()` with the title carrying the key and the `form_buttons` entries carrying live fields; `response.selection` → the `press` input at that entry's position → handler → re-present. Per-present, as the engine dictates.
- **form-modal**: `show()`; native fields carry their own values; `submit` / `cancel` inputs; `formValues` re-keyed by placement order (decorative rows no longer occupy an ordinal).
- **the interpreter fallback**: today's presenters and serializer, untouched, reached by either form host when a screen has no compiled layout.

## Debug mode: making inference misses loud

With `debug: true` (both `render` options and `createContainerScreen` options), every render's IR is diffed against the baked snapshot the build recorded in the generated placement file: a prop that changed but was baked, an element sequence that differs, a text longer than its capacity — each is one content-log line naming the screen, the element and the prop. This is the runtime half of the guard in [03-ir](./03-ir.md). *Decided.*

## Deleted

| Today | Why it goes |
| --- | --- |
| `core/serializer.ts` (byte protocol, markers, padding, tails) | a compiled cell knows its own fields; entries carry bare values |
| `core/writers.ts` (`emitButton` / `emitLabel` / `emitHeader` / modal emitters) | hosts write entries and fields from the placement |
| `core/render/presenters/*` | replaced by `hosts/form-*/runtime.ts` |
| `core/componentRegistry.ts` (writers, `transparent`) | node kinds own lowering; transparency is a kind property |
| `core/render/validateForm.ts`, `validateContainer.ts` | needs vs offers |
| `components/*` writers, `nativeArgs`, `__textMetrics` as a payload contract | components emit elements only |
| `container/analyze.ts`, `container/allocate.ts` | become `core/ir/analyze.ts`, `core/ir/allocate.ts` |
| whole-tree `computeLayout` on every form present; `util/textMetrics.ts` at runtime | the base is baked; `core/layout/islands.ts` re-solves islands only; text metrics are build-only because live text reserves its box |

Everything in the table survives as the interpreter fallback until [09-plan](./09-plan.md) phase 5, then is deleted with it.
