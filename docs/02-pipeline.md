# 02 — Pipeline

```
   JSX components              one component set, host-agnostic
        |  expand (fibers, hooks, contexts)
        v
   Built tree                  host elements with resolved props
        |  layout (flexbox, text metrics)          <- build: the base; runtime: islands only
        |  inherit (visible / enabled)
        v
   IR                          nodes; every prop tagged baked | carried | native | local; inputs
        |  analyze (liveness by probing)           <- build only
        |  allocate (the ONE walk)                 <- build AND runtime
        v
   Placement                   every carried value and input has a host address; a routing key
        |  face (looks alone, no bindings)         <- build only
        v
   Face document               complete and drawable; every socket at rest
        |  fill (the host stands a mechanism in every socket)   <- build only
        v
   JSON UI                     static definitions in the addon's RP, referencing the render pack vocabulary
```

## Layers and their contracts

| Layer | Owns | Never knows |
| --- | --- | --- |
| **JSX** | components, hooks, styled layers | hosts, carriers, JSON UI |
| **IR** | node kinds, the binding class of every prop, capacities, inputs, the shape rules | how a carrier is physically read or written |
| **Host** | claiming a root, the carriers and mechanisms it offers, `allocate`, `fill` (the control that stands in each socket, the mount, the router), the runtime loops | component names, fibers |
| **JSON UI** | the render pack vocabulary; the emitted per-screen documents | anything about the server |

The IR is the seam the design rests on: above it nothing dispatches on a host, below it nothing dispatches on a component. `core/ir/claims.ts` is where the seam is written down — a component answers with the role its element takes and nothing else, and the host decides what that costs and where it lands. Nothing above the seam names a container slot, a form entry or a collection; the host-specific facts sit below it, each in one connector (the chest's transport item is `connectors/chest/cell.ts` and nothing else reads it).

## What runs where

| Stage | Build (filter) | Runtime (script) |
| --- | --- | --- |
| expand | yes | yes — same fibers, same owner rules |
| layout | yes — the base, every rect | islands only, inside boxes the build reserved |
| text metrics | yes | **no** — live text reserves its box |
| inherit | yes | no — folded into the IR at build |
| analyze (probes) | yes | no |
| allocate | yes | yes — must produce the same placement, position for position |
| face, then fill (JSON UI) | yes | no |
| write carriers / read inputs | no | yes |

The runtime cost of a compiled screen is one expand per render, one allocation walk, the island solves whose inputs changed, and the writes that changed. No whole-tree flexbox, no serializer, no string metrics, no per-cell payload assembly.

## Runtime loop, per host

```
open(screen)                 the host detects the open (interact, show(), ...)
  |- session(owner)          player-owned or entity-owned fibers (the Owner)
  |- render -> tree
  |- allocate(tree) -> placement
  '- host.write(placement)   every carrier takes its value; inputs are armed
input arrives                the host reads it (poll, selection, submit, ...)
  |- handler(event)          one event object, see 05-components
  |- render -> tree
  |- allocate -> placement   same shape by construction
  '- host.write(diff)        only what changed
close                        the host detects it; effects clean up; state persists per the owner's rules
```

## Screen identity and routing

A compiled screen is picked on the client by a **routing key** the host reads from wherever it can read one:

| Host | Key lives in | Key space |
| --- | --- | --- |
| chest | two sentinel stack sizes (measured: 2..64 each, a stack of one publishes nothing) | 1..3969, hash of `<ns>_<name>`, stamped on the entity at build |
| form | the form title | a string — the namespaced name itself, no folding |

The key derives from the screen's namespaced name on both sides, so two addons built apart never collide and a rebuild never moves a key. How a form screen learns its own name at runtime is in [08-build-flow](./08-build-flow.md).

The routing key is not the **navigation key**. A form screen gets one — `<ns>:<name>`, what `<Link to>` and `navigate()` are written with, and what the generated module augments `ScreenKeys` with. A chest screen gets none, on purpose: it is opened by interacting with the entity that carries its layout key, so there is nothing to navigate to and nothing that could resolve such a key.
