# @bedrock-core/ui v2 — working plan

Temporary. These pages are the design the v2 rewrite of `ui-runtime`, `ui-compile` and the
render pack follows. They are deleted, or moved to the docs site, once the code is the
documentation. Nothing here is user-facing.

## Status legend

| Tag | Meaning |
| --- | --- |
| **Decided** | Build to this. |
| **Proposed** | The default until a spike says otherwise. |
| **Measure** | Unverified in game. A spike comes before code depends on it. |

## Reading order

| Page | One line |
| --- | --- |
| [01-goals](./01-goals.md) | Principles, the cost model that decides what is worth baking, non-goals |
| [02-pipeline](./02-pipeline.md) | `JSX → IR → host → JSON UI`: the four layers, what runs at build and what at runtime |
| [03-ir](./03-ir.md) | The IR: nodes, binding classes, capacities, inputs, liveness analysis, shape rules |
| [04-hosts](./04-hosts.md) | The host interface, the capability matrix, how a new Minecraft screen is added |
| [05-components](./05-components.md) | One component set on every host: needs vs offers, the event object, the button case |
| [06-render-pack](./06-render-pack.md) | The pack as a versioned vocabulary: shapes vs carriers, the JSON UI rules |
| [07-runtime](./07-runtime.md) | The minimal runtime per host, and what is deleted |
| [08-build-flow](./08-build-flow.md) | Discovery, one filter, generated artifacts, screen identity |
| [09-plan](./09-plan.md) | Phases, estimates, the 1.0 decisions, the spikes |
| [example/](./example/README.md) | One screen end to end: JSX, IR, the shapes it uses, the compiled JSON UI per host, the placement record |

## Glossary

- **Host** — one Minecraft screen the library can draw on (server form, chest, later book …) together with the transport it offers. The only layer that knows how a value travels.
- **Carrier** — a physical channel a host offers for a value that changes at runtime: a container slot's stack size, a form entry's text, a native field. Typed, with a capacity.
- **Input** — a physical signal a host can deliver to script: an item moving, a form selection, a submit.
- **Baked** — decided at build and written into JSON UI as a literal. Costs nothing at runtime.
- **Placement** — the result of allocation: every carried value and every input given an address on the host, by one walk the build and the runtime both run.
- **Vocabulary** — the definitions the render pack ships that compiled screens reference by name.
