# @bedrock-core/ui

How the library works, the engine rules it stands on, and what is left to build. The
measurements behind those rules are in [`spikes/`](./spikes/).

| Section | |
| --- | --- |
| [Principles](#principles), [cost model](#what-is-worth-baking--the-cost-model), [non-goals](#non-goals) | why the shape is this shape |
| [Pipeline](#pipeline), [the IR](#the-ir) | JSX to JSON UI, and the seam in the middle |
| [Faces and hosts](#faces-and-hosts), [hosts](#hosts), [components](#components) | the two passes, and what each host serves |
| [The render pack](#the-render-pack) | the vocabulary, and every measured emitter rule |
| [The runtime](#the-runtime), [build flow](#build-flow) | what is left at runtime, and what produces the rest |
| [Remaining work](#remaining-work) | the only open list |
| [Glossary](#glossary) | |

## Principles

1. **Build over runtime.** Anything the build can decide, the build decides. The runtime is
   fibers, one allocation walk, carrier writes and input reads. Layout is solved at build as
   the **base**; only the **islands** the analysis marks as layout-live are re-solved at
   runtime, inside boxes the build reserved. Text is never measured at runtime: live text
   reserves its box.
2. **One component set.** The same JSX draws on every host. A component never knows how a value
   travels; it emits an element and, at most, says what it needs (a press, a slot).
3. **The host owns transport.** Items, strings, native fields — that knowledge lives in exactly
   one place per host, split into a build half (JSON UI emission) and a runtime half (write and
   read loops). Nothing above a host dispatches on which host it is; nothing below it dispatches
   on which component it came from.
4. **Frozen shape.** A compiled screen never adds, removes or reorders controls at runtime.
   Change is a value on a carrier; a subtree that comes and goes is `visible`; a list has a
   declared maximum. This is what lets one JSON UI file serve every player and every state.
5. **Measured rules.** Every JSON UI rule here was measured in game and recorded. Nothing is
   assumed from the wiki alone. **Copy what works; do not reason about what ought to** — the
   expensive rounds in this library were always a mechanism nobody had read the whole of.

## What is worth baking — the cost model

"Baked, carried, or left to the client" has one answer per host, from this table. The
[liveness analysis](#liveness-analysis-build-only) applies it; authors never choose a class.
What baking is worth, measured ([S5](./spikes/S5-compiled-cost.md)): a screen assembled at
runtime costs 14 ms of server work at 50 cells and 53 ms at 200, every time it is opened. A
compiled one costs nothing.

| Class | Runtime cost | Who decides |
| --- | --- | --- |
| **Baked** | none — a literal in JSON UI | the default for every prop |
| **Local** | none on the server — the client keeps the state (a tab strip, a fold, a toggle nobody reads) | an interactive control whose state no handler reads and no live prop depends on |
| **Carried** | per host: a container slot per bool / int / character plus a poll fingerprint, or a form entry (one engine cell) per live cell plus per-present serialization | a prop whose value differs between renders (inferred), with a capacity the author declares where the carrier needs one |
| **Input** | a drawn slot + poll, or a form entry | a handler prop being present |
| **Native** | the engine owns the value while the screen is open (toggle, slider, text field, scroll offset) | a component that maps to a native control on that host |

- A prop is carried only when it **changes**; a handler is wired only when it is **present**.
  Everything else is baked, whatever it is.
- A control is **local** when it is interactive and unobserved. The moment a handler reads it or
  a live prop depends on it, it needs an input, and the host decides how.
- **Inference proposes; declaration decides capacity.** Liveness comes from real renders. A text
  length, a numeric range, an enum's members and a list's maximum are declared, because a wrong
  guess is a silent truncation. The build error that asks for a declaration prints the values it
  observed, so the author copies rather than guesses.
- Enum and limit inference is only worth doing on hosts whose carriers are numeric (the chest):
  a live string there has to become a number, and the observed set is the suggestion. On the
  form hosts strings are uncapped, so inferring an enum gains nothing.

## Non-goals

- Ore-UI / DDUI. Not JSON UI, not this library.
- Runtime re-layout. A compiled layout is final; content that must be sized at runtime (a
  foreign-language wrap) gets a client-sized box, never a server measurement.
- Static analysis of TypeScript. Liveness comes from rendering the real fibers, never from
  reading source.
- Percentages, `%c` and anchors as author-facing props. The flexbox solver is the one source of
  geometry and it produces pixel rects against a canvas the host names; JSON UI's relative sizes
  appear only where the *engine* has to decide at draw time — a stack sized `100%c` so hidden
  rows collapse, a fill of `100%` inside a box the layout already sized. Mixing units by hand
  would bring anchors, safe zones and UI scale into every screen, which is what baking against a
  300×200 canvas inside the smallest scale exists to avoid. Revisited only if a host needs a
  screen-relative canvas, and then as a host property.

## Pipeline

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
   JSON UI                     static definitions in the addon's RP, referencing the pack vocabulary
```

| Layer | Owns | Never knows |
| --- | --- | --- |
| **JSX** | components, hooks, styled layers | hosts, carriers, JSON UI |
| **IR** | node kinds, the binding class of every prop, capacities, inputs, the shape rules | how a carrier is physically read or written |
| **Host** | claiming a root, the carriers and mechanisms it offers, `allocate`, `fill`, the mount, the router, the runtime loops | component names, fibers |
| **JSON UI** | the render pack vocabulary; the emitted per-screen documents | anything about the server |

The IR is the seam the design rests on: above it nothing dispatches on a host, below it nothing
dispatches on a component. `core/ir/claims.ts` is where the seam is written down — a component
answers with the role its element takes and nothing else, and the host decides what that costs
and where it lands. Nothing above the seam names a container slot, a form entry or a collection;
each host-specific fact sits below it in one connector (the chest's transport item is
`connectors/chest/cell.ts` and nothing else reads it).

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

### Screen identity and routing

A compiled screen is picked on the client by a **routing key** the host reads from wherever it
can read one:

| Host | Key lives in | Key space |
| --- | --- | --- |
| chest | two sentinel stack sizes (2..64 each; a stack of one publishes nothing) | 1..3969, hash of `<ns>_<name>`, stamped on the entity at build |
| form | the form title | the namespaced name itself, no folding |

The key derives from the screen's namespaced name on both sides, so two addons built apart never
collide and a rebuild never moves a key.

The routing key is not the **navigation key**. A form screen gets one — `<ns>:<name>`, what
`<Link to>` and `navigate()` are written with, and what the generated module augments
`ScreenKeys` with. A chest screen gets none: it is reached by interacting with the entity that
carries its layout key, so there is nothing for `<Link to>` or `navigate()` to name, and only
form screens appear in `SCREEN_KEYS` and in the reference feed.

**Anything the compiler writes into someone else's pack — a namespace, a definition name, a
title format, a byte offset — is versioned or aliased, never renamed in place.** An addon
compiles its screens once and ships them; they keep referencing what they were built against for
as long as that pack exists, and the library cannot rebuild them. The engine gives no hint when
this breaks: the `@`-base stops resolving, so the control has no type at all, and what it reports
is `size` and `offset` as unknown properties.

## The IR

A tree of nodes with solved geometry whose every prop carries a **binding class**. Produced once,
at build, from the built tree; the runtime re-derives only the placement from it, by the same
walk.

### Nodes

One kind per visual primitive, host-agnostic. A kind declares its shape, how it lowers from a
host element, and which carriers and inputs it *may* need — never how they are served.

| Kind | Lowers from | May need |
| --- | --- | --- |
| `panel` | `Panel`, `Container` root | — |
| `label` | `Text` | carrier `text` when live |
| `image` | `Image` | carrier `enum` when the texture is live |
| `button` | `Button`, `Form.Button` | input `press` (or `submit` / `cancel` / `exit`); carrier `bool` for `enabled` |
| `slot` | `Slot`, foreign `Slot collection` | input `slot` (own) or nothing (foreign) |
| `grid` | `SlotGrid`, `PlayerInventory`, `Hotbar` | — (foreign collection) |
| `scroll` | `Scroll` | over a sole `List`: `fits` — the rows baked at two widths, the list's count choosing |
| `field` | `toggle`, `slider`, `input`, `dropdown`, `select` | native `field` |
| `list` | `List max={n}` | carrier `int` for the count; per-row nodes repeated `n` times |
| `swap` | `Tabs`, `Disclosure`, any client-side switch | nothing when local; input `press` per option when observed |

Every node carries `rect` (texels, relative to the nearest geometric parent), `layer`, and
`visible` — the last is a `Bound<boolean>` like any other prop, and `rect` is one too.

### Look vs mechanism

Every node is two things: what the player sees, and what it physically is on the host.

- **Look** — the baked visual: a shape from the vocabulary plus its static props. A `button_face`
  with four textures, a `cell_frame` with an item renderer, a label's font and scale.
  Host-agnostic; the same definition on every host; decided by the component and the IR.
- **Mechanism** — what the node *is* on the host, assigned by the host's `allocate` and emitted
  by the host. A chest `button` is a container slot holding a transport item behind the face; a
  form `button` is a `form_buttons` entry behind the same face. A chest `slot` is a real
  container cell the runtime polls; the same `slot` on a host with no container has no mechanism
  at all.

| Node | Look (every host) | Chest mechanism | Form mechanism |
| --- | --- | --- | --- |
| `button` | `button_face` + baked children | a slot: transport when enabled, guard when not | an entry with a baked index; `enabled` is one character of it |
| `label`, live | label style | one slot per glyph, stack size = character code | the entry text, uncapped |
| `slot`, own | `cell_frame` + item renderer + hover | a container cell, polled, role enforced by undo | none — refused at build |
| `slot`, foreign | `cell_frame` + item renderer | a cell over the named collection | *unmeasured*: which collections a form screen exposes |
| `image`, `panel` | nineslice / texture | — | — |

Visual parity is the look being the same vocabulary definition everywhere. Functional parity is
whether the host has a mechanism for the node's inputs — the [needs-vs-offers](#needs-vs-offers)
check. A component that reads its own look never changes; only the mechanism column grows when a
host is added.

### Binding classes

```ts
type Bound<T> =
  | { class: 'baked';   value: T }
  | { class: 'carried'; type: CarrierType; capacity: Capacity; initial: T }
  | { class: 'native' }                                   // the engine owns it while open
  | { class: 'local' }                                    // the client owns it; never reaches the server

type CarrierType = 'bool' | 'int' | 'enum' | 'text';
type Capacity =
  | { kind: 'bool' }
  | { kind: 'int';  min: number; max: number }
  | { kind: 'enum'; members: readonly string[] }
  | { kind: 'text'; maxLength: number };

interface Input { kind: 'press' | 'submit' | 'cancel' | 'exit' | 'slot' | 'field'; handler: Function }
```

A class is a property of the IR, not of a component: the same `<Text>` is baked on one screen and
carried on another, from the same source, because its value moved in one and not the other.

### Liveness analysis (build only)

The build runs real fibers, so liveness comes from **probing**, never from reading source:

1. Render with initial state → the reference tree, which is also the frozen shape.
2. For every state slot on every fiber (`useState`, `useReducer`), re-render with probe values
   chosen by the initial value's type — `!v` for a boolean; `v ± 1`, `0`, and a large value for a
   number; `''` and `v + 'x'` for a string; a different literal for an enum-looking prop — and
   diff every prop against the reference.
3. On hosts with a viewing player, the player is a probe input like state: render with two stub
   players and diff.
4. Any prop that differed is **carried**. Any element that appeared, vanished or moved is a
   **shape error** naming the element and the fix (`visible={…}` or `<List max>`).
5. Every carried prop is checked against the host's carriers. Where the carrier needs a capacity
   the author has not declared, the build fails with the observed values in the message.

Probing is not sound — a threshold can sit between two probes — so two guards make a miss loud
instead of silent: the explicit capacity props are also explicit liveness markers (a `maxLength`
makes a label carried whatever the probes saw), and the runtime's [`debug`](#debug-mode) mode
diffs every render against the baked snapshot and reports any baked prop that changed.

**Why probing, and not static analysis.** A value that is static but reaches a prop through
twenty functions is the case probing handles best: the probes perturb **state**, and a constant
that depends on no state produces the same value in every probe, whatever route it took through
helpers, closures, array methods or imports. Static analysis would have to trace all twenty calls
and would give up at the first dynamic import or higher-order function. Probing's weaknesses are
the opposite ones, and both have a guard:

| Weakness | Guard |
| --- | --- |
| a live value the probes fail to move (a threshold between two probe values) | the capacity prop marks it live; `debug` reports a baked prop that changed |
| the *set* a live value ranges over (an enum's members, an int's range, a string's length) | declared, with the observed values printed in the build error |

Values that differ between probes without any state — `Date.now()`, `Math.random()`, a player
field, a context whose value comes from state — are carried. That is correct: they do change from
render to render.

**Capacity props**, declared by the author:

| Prop | On | Declares |
| --- | --- | --- |
| `maxLength={n}` | `Text` | text capacity; also marks the text live |
| `range={[min, max]}` | number-valued props such as a bar's `value` | int capacity |
| `values={[…]}` | string-valued props such as `texture` | enum capacity |
| `max={n}` | `List` | list capacity |

**Carried `visible` cannot be declared.** `withControl` stamps `visible: true` on every element
and the inherit pass forces `false` down a hidden subtree, so the prop's presence says nothing
about the author's intent. The build probes it instead — an element whose `visible` a state flip
moved is carried, subtree ROOTS only, since descendants flip with their ancestor by inheritance
and one gate hides them all — and hands the runtime the element ordinals through the compiled
snapshot, the same walk on both sides. On the action form the bool is one entry (`'0'`/`'1'`); on
the modal, one bare label row; the emitted control is wrapped in a gate reading it, seeded with
the build's value. The chest refuses a live `visible`: it has no carrier for one.

### Shape rules

Every host freezes shape, so the rules are host-agnostic:

- The reference render is the shape. A later render producing a different element sequence at any
  position is a runtime error in `debug` and undefined otherwise; the build refuses the screen
  when a probe shows it.
- `visible` is the one legal way for a subtree to come and go; it is a carried bool on the
  subtree's root, and the whole subtree hides with one carrier.
- React's conditional idioms desugar to it at build: `{cond && <X/>}` becomes `<X visible={cond}/>`,
  and `{cond ? <A/> : <B/>}` becomes both branches with opposite `visible` (both are constructed
  and share the space; position them accordingly). The rewrite is source-level
  (`ui-compiler/lib/sugar.ts`), applied identically by the compile and the bundler; it also marks
  the element `liveVisible`, so the visibility is carried whether or not the liveness probe
  happens to flip it. A hand-written `visible` stays probe-detected. The desugaring applies only
  when each branch is a single element or nullish — a string or fragment branch stays an ordinary
  runtime conditional, which a compiled screen refuses as a shape change. `<Text>` wraps a
  conditional string.
- `List max={n}` is the one legal way to render a variable count: `n` copies are compiled, a
  carried int hides the rest.
- `key` on a list item pins identity across renders so that a reorder is a value change on every
  row, never a shape change.
- **State follows position + name + key** (React's rules, one deliberate difference). A component
  keeps its hook state while it renders at the same path under the same key; a changed `key` is a
  new instance with fresh state, and a fiber a pass no longer reaches is deleted with its cleanups
  run. The difference is the desugared conditional: `{cond && <X/>}` compiles to a
  hidden-but-mounted X, which is React's *render both and hide one* semantics — state in a hidden
  branch persists and its effects keep running, and the two arms of a ternary are two instances,
  not one. An author who wants unmount-style reset keys off the condition: `<X key={String(cond)}/>`.

### Layout: the base and the islands

The build solves the whole flexbox tree with the reference render. That is the **base**, baked as
literal rects. The analysis then marks every **layout-live** input: a carried prop that flexbox
reads (`width`, `height`, `flex*`, padding, margin, `visible` on a flow child, a `List` count) and
live text without a reserved width.

For each layout-live input the **island root** is the nearest ancestor whose own box the build can
fix: an explicit size, a `maxLength` (a live label reserves `maxLength × the widest glyph`), a
`List max` (rows reserve `max × row height`), `maxWidth` / `maxHeight`, or, failing all of those,
the screen root. At runtime an island whose inputs changed is re-solved with its root's box as the
fixed root, and only the rects that changed are written, as `int` carriers. Outside an island
nothing is ever recomputed.

- `rect` is a carried prop like any other: baked outside islands, carried inside them, and a host
  prices it like any int.
- Text is never measured at runtime. Live text reserves its box at build; content-sized live text
  (`wordBreak` or `maxLines` on a live string) gets a client-sized label.
- A prop that is live but not layout-live (a texture, `enabled`, the characters inside a reserved
  box) creates no island.
- The build log names every island with its root and its carrier cost. A screen-root island on a
  host whose geometry carriers are expensive (the chest: a slot per coordinate) is a build warning
  naming the prop that caused it.

The model is settled; **writing an island's rects at runtime is not built**, and cannot be until
[S6](./spikes/S6-runtime-rect.md) is finished — no compiled control can be sized by a binding
([rule 10](#rules-every-emitter-obeys)). One reflow needs no island at all: a `stack_panel` gives
an invisible child no space, so a `<List>` of gated rows collapses natively, and a scroll over it
reaches exactly the real rows.

## Faces and hosts

Two passes over every screen, and one invariant between them: the **face pass** owns the layout,
the **host pass** owns the mechanism. A host may replace what a control *is*; it may never move
it. Every screen type is signed off visually as faces alone, in game, before any host attaches a
channel, and the build proves afterwards that the host changed nothing visible.

The split buys four things:

- **One static document to validate.** Faces carry no bindings, so the rules that only hold for
  static trees ([3, 4, 5, 11, 14, 15](#rules-every-emitter-obeys)) run once over the face document
  with no host in the loop.
- **[Rule 12](#rules-every-emitter-obeys) by construction.** An engine component (a slider, a
  toggle) lives in a face, and a face has no bindings, so nothing constructed hidden behind a gate
  can evaluate a collection row that is not there.
- **Visibility first.** A carried `visible` is a host gate *around* the face. Whatever is inside
  is evaluated after the gate, never before.
- **A host with no channels draws faces alone** — the book, and the gallery.

One engine fact shapes the split: a `$variable` as an `@` base mounts nothing, so a face document
cannot leave a named hole for another file to fill. The face pass hands the host a complete
document, and the host splices its controls into it.

| Layer | Artifact | Bindings | Emitted by |
| --- | --- | --- | --- |
| **Faces** | `RP/ui/core-ui/screens/<ns>/faces.json`, namespace `<ns>_faces`: every look the addon's screens use, deduplicated by signature | never | face pass |
| **Face document** | one per screen, complete and drawable: the skeleton with baked rects, faces referenced by name, every socket drawn as its inert face | never | face pass |
| **Screen** | `RP/ui/core-ui/screens/<ns>/<name>.json`: the face document with each socket replaced by the host's control | only here | host pass |
| **Preview** | `RP/ui/core-ui/screens/<ns>/<name>.preview.json`: the face document mounted on the action form, dev profile only | never | face pass |

Faces are per addon rather than in the render pack, so a styled layer other than `ore-styled`
ships its own with nothing added to the pack.

### The face pass

Input: the built tree after expand, layout and inherit, with the IR's binding class on every prop.
Output: the faces file and one face document per screen.

- **A face** is a node's look with its static props: the four textures of a button face, a label's
  font and scale, a cell frame, a nineslice. Faces are deduplicated by a signature over the props
  that reach JSON UI — `faceSignature` (`nodes/primitives/button.ts`) and `textSignature`
  (`nodes/primitives/text.ts`) are the shape every node kind follows. A screen references a face by
  name and overrides nothing at runtime; a static prop that differs between two uses is two faces.
- **A socket** is a node with at least one carried prop or one input: a button with a press, a
  label whose text is live, a slot, a native field, a subtree with a carried `visible`. The face
  document draws every socket as its inert face — the button face with no mappings, the label with
  its reference string, the slot as an empty `cell_frame`, the field as its payload-free twin, the
  chest chrome as an image. The socket list, in the claim walk's order, is the placement's address
  list.
- **Static validation** runs over the face document alone: explicit pixel sizes under hosts,
  `keep_ratio: false` on stretched images, `localize` set on every label, every referenced control
  name resolving, control names unique per screen, no engine component reading a binding. A failure
  names the element and the rule.
- **The layout is the base.** Rects are baked here.
- **Every static JSON UI property is fair game.** A face is written as JSON UI, so a component may
  expose any static property the engine has: `text_alignment`, `line_padding`, `clips_children`,
  `shadow`, `font_type`, `alpha`, `fill`, `color` on images, `tiled` nineslices, sounds on buttons.
  Each is added as a component prop the face bakes.

### The compile's three layers

The stretch between the IR and the JSON UI is three directories, each a pure step and each
testable without the other two.

| Layer | Takes | Gives | Knows |
| --- | --- | --- | --- |
| **`faces/`** | plain data: a rect, textures, a style, children already drawn | one `ControlEntry` — the look, written as JSON UI | nothing else. No host, no context, no address |
| **`connectors/`** | that face, plus the address the host allocated | the control that stands in the face's place | one host each. `connectors/form` and `connectors/chest` are separate entry points, since both export a `press` and a `text` |
| **`nodes/`** | a JSX element | an IR node, and the mechanism that node needs | the IR, and what each kind *is* |

A face is `(data) => ControlEntry` and a connector is its mirror,
`(data, face, ctx) => ControlEntry`: the same shape, one host, and free only to wrap or replace
what it was handed. Children reach a face already drawn, so no recursion crosses two layers.

`nodes/` holds `primitives/` and `utils/` and nothing else. Every kind is one JSON UI control type
with its static props; the utilities are what more than one lowering reads off an element. There is
no composition layer in the compile — a composition is a component, built out of these.

### Behaviours

A behaviour is client-only logic a primitive carries: still static, still in the face document,
never a mechanism. Four of them, and between them they are every switch the library has.

| Behaviour | What it is | Where |
| --- | --- | --- |
| `route` | a button's mappings: close, submit, form click | `action` on the `button` primitive |
| `group` | swaps that move together, one forced index each | `group` on the `swap` primitive |
| `states` | which children a control draws per state | the `look` primitive, one per state |
| `follows` | a sibling drawn while a swap beside it is on | `follows`, on any node at all |

A swap is the one mechanism a compiled screen owns outright: a toggle changes its own content with
nothing reaching script, on the pack's own form mount and under the modification-inserted chest
mount alike ([S4](./spikes/S4-toggle-group.md)). So everything built on it is free — a tab change,
a fold, a choice between options costs no press, no re-present and no payload.

Content a swap shows lives INSIDE the look, which is what keeps it client-only and what keeps a
look that is not showing from being BUILT — an engine field behind a gate that reads a collection
row which is not there is an assertion, so this is not only an optimisation. Two things follow:

- A look may DRAW a sibling of its swap, which the compile moves inside it, re-based from the
  swap's own corner. For content too big to be solved inside the control that switches to it: a
  tab's pane is the whole box below the headers.
- `follows` is the one read in the other direction, for the case that cannot nest: a fold's rows
  have to reflow what is under them, and content inside a look has no say over its siblings. A
  stack gives a hidden child no space, which is the reflow.

`Tabs` and `Disclosure` are therefore components — a group of swaps whose panes are drawn, and one
swap with a panel that follows it. `List` needs none of this: it is a stack whose rows a count
mechanism gates, and the count is a mechanism already.

Everything crossing siblings — the group an exclusive swap joins, the swap a `follows` names, the
sibling a look draws — is resolved in the one walk that has the sibling list, because nothing
inside a node can see what sits beside it.

### Fields are primitives

A modal field is two halves and they belong in two layers. An input is a primitive like any other
and has a face — a box, a placeholder, a style — that draws on any screen and in the gallery. What
makes it a *modal* field is the connector: `connectors/form/widget.ts` names the row the engine's
own widget is mounted from and what that row reads, and the modal is the only host that has one. A
host with no connector for a kind refuses it by name.

So `field` is five primitives — `toggle`, `slider`, `input`, `dropdown`, `select` — each carrying
its own look, the row it answers on, and the variables its widget reads.

### The host pass

A host takes the face document and the placement and, for each socket, either **wraps** the face (a
gate reading a carried `visible`; a one-child `stack_panel` host carrying `collection_index` and the
`collection_details` binding for a press) or **replaces** it (a chest cell over a container slot; a
text carrier in place of a static label; a native field placed by its row index). Nothing outside
the sockets is touched.

The **rect guard** proves it: each socket's placement — `size`, `offset`, `anchor_from` /
`anchor_to`, `layer` — is diffed against the face entry the host was handed, and any difference is a
build error naming the control and the host. It runs on every fill, so a host that moves something
never reaches a pack.

### The gallery

Every screen type is looked at as faces only before any host serves it. `gallery: true` on the
ui-compiler filter makes the build write two extra things:

- **A preview per screen.** The face document regenerated under the namespace
  `<ns>_<name>__preview`, written as `<name>.preview.json` and gated on its own title like any
  compiled form screen. Its own namespace, because every gated compiled screen is constructed on
  every form open and a name a binding looks up is found screen-wide. Chest screens preview at the
  chest canvas, centred on the form. Nothing in a preview needs an entity, an entry or a channel;
  `Tabs` and `Disclosure` work because they are local. A preview shows the reference render:
  reference strings, reference visibility, fields as static twins.
- **A gallery screen.** `<ns>_gallery`, compiled last: a scroll of `<Link>`s, one per compiled
  screen of the addon whatever its root, each naming that screen's preview key. A preview is
  registered as a compiled screen whose tree is empty — the title is the whole of what reaches the
  layout — so a press is rendered through the session and leaves the gallery cleanly.
  `openGallery(player)` is exported from `@bedrock-core/generated/ui`; a build without the gallery
  exports one that warns.

Turn it on in the profile a pack is developed under and leave it off in the one it ships from. It
stays, the way a component storybook does.

### Static screens and references

A screen is **static** when every string it shows is baked and every press it takes is a `<Link>`.
Nothing about it can differ between one present and the next, so the build knows the whole of what
showing it requires — the title, the value each entry carries, the key each press leads to — and the
addon ships that table instead of the code that would recompute it. `navigate()` shows one from the
table; it is the same walk that shows another addon's screen, so the local path and the foreign path
are one path.

- **`<Link to="<ns>:<screen>">`** is a `Button` whose press opens the named screen for the pressing
  player. The build reads the target off the prop, so a reference table needs no sentinel player. A
  key with no `<ns>:` in front of it is one of the bundle's own, named as its file is — which is how
  a screen links to a sibling without repeating a namespace it does not choose; a published
  reference carries the addon half filled in. `to` is also on ore-styled's `Button` and `MenuRow`.
- **The reference feed.** `core-ui/reference` is one record per static screen —
  `{ key, title, values, targets }` — published by the owning addon through
  `@bedrock-core/navigation`'s `screens(core)` and replicated by sync. `navigate('<ns>:<screen>')`
  resolves a key against this bundle's compiled screens first and, through whatever
  `provideReferences` installed, the replicated references second; a foreign screen is shown by
  title with its baked values and followed link by link (`presentReference`). The stack is a stack
  of KEYS — `back()` shows the screen navigated from, since a frozen shape cannot be restored, only
  shown again.
- **Guides are ordinary screens** in that table, and every press inside one is a `<Link>`.
  `openGuide(ns, player)` is a `navigate()`. The way out needs no entry at all — the client closes
  the form and a walk ends with it. Gating a guide per viewer is a carried `visible` on the compiled
  screen.
- **Generated types.** The generated module augments `ScreenKeys` with this addon's keys, so
  `navigate` autocompletes them and a typo is an error, while a key belonging to an addon this build
  has never seen still passes — which it must, since resolving one of those is the point.
- **`<Screen static>` is the assertion, not the mechanism.** A qualifying screen is detected either
  way; declaring it makes the build FAIL when the screen stops qualifying rather than quietly
  growing a component again. A press is a press to the build: somewhere to go is a `<Link>`, and
  anything else is decoration. What stays a component is anything with a live value or a press of
  its own — a modal never qualifies, and neither does a config editor, a list or the addon page.
- **`Embed` is a component embed.** An embedded page is a component drawn into the area a host
  leaves for it, not a screen laid over the host's frame. Its canvas is that area: `<Embed>` takes
  the area's size and the tree fills it, so the page holds no coordinate of the host's frame and the
  gallery shows it as its own canvas. Where the area sits inside the frame is the host's constant and
  goes on the mount: the router places an embedded root at the area's offset within the centred
  frame. The contract between two packs is the area rect and the slot count.

## Hosts

A host is one Minecraft screen the library draws on, and the transport that screen offers. Every
screen-specific fact in the codebase lives in a host: the routing trick, the carriers, the inputs,
the vanilla file that is hooked, the chrome, the runtime loop. A host is a folder in each package —
`packages/ui-runtime/src/hosts/<id>/` for the contract the registry reads, the allocation walk and
the runtime, `packages/ui-compiler/src/hosts/<id>/` for the emitter and the router. Three of them:
`chest`, and the two form hosts sharing `hosts/form/`.

```ts
// shared: packages/ui-runtime/src/hosts/types.ts, one contract per host in hosts/<id>/host.ts
interface HostContract {
  id: 'chest' | 'form-action' | 'form-modal';
  /** For error messages: what the author calls this screen. */
  label: string;
  /** The element type that names this host at a screen's root: <Screen>, <Form>, <Container>. No default. */
  root: string;
  /** Who may serve a screen of this host: an entity owns a container screen, a player a form. */
  owners: readonly Owner['kind'][];
  /** The canvas a screen is laid out against, in texels. */
  canvas: { width: number; height: number };
  /** Whether a screen of this host is baked at build time by default, for callers that do not say. */
  compiled: boolean;
  /** What a value that changes at runtime can travel on here. */
  carriers: readonly CarrierKind[];       // bool | int | enum | text
  /** What each kind of component becomes here; a kind absent from the table is refused by name. */
  mechanisms: Partial<Record<ComponentKind, Mechanism>>;
  /** How this host words a refusal — the wording belongs to it because the fix does. */
  refuse(kind: ComponentKind): Error;
  /** What the host demands of the root itself, beyond the rules every screen obeys. */
  check?(tree: JSX.Element): void;
}

// build half: packages/ui-compiler/src/hosts/<id>/emit.ts
interface HostEmit {
  id: string;
  /** Controls put under every screen's canvas, before its content. */
  chrome?(): ControlEntry[];
  /** The mechanism that stands in a socket, by socket kind. A kind absent here is one the host cannot serve. */
  fill: Partial<Record<Exclude<SocketKind, 'visible'>, (node, entry: ControlEntry, ctx: Emit) => ControlEntry>>;
  /** The gate around a node whose `visible` is carried: the wrapper keeps the face's placement. */
  wrapVisible?(node: IrNode, entry: ControlEntry, ctx: Emit): ControlEntry;
  /** Controls put under the canvas AFTER its content, for chrome that must sit over everything drawn. */
  overlay?(root: IrNode, ctx: Emit): ControlEntry[];
  /** Document-level definitions derived from the whole tree, before any socket is filled. */
  assemble?(root: IrNode, document: Document, ctx: Emit): void;
}
```

The rest of a host is modules rather than one interface: the allocation walk both halves run is
`hosts/<id>/allocate.ts`, the constants the emitted JSON UI and the runtime agree on are
`hosts/<id>/contract.ts`, the routers are `ui-compiler/src/hosts/chest/index.ts` and
`ui-compiler/src/hosts/form/router.ts`, and the runtime loops are `hosts/chest/runtime/` and
`hosts/form/runtime.ts`. The host registry is a list, like `NODE_DEFINITIONS` and `CELLS`: adding a
host is adding a folder and a list entry, never a `switch`.

### Capability matrix

| | **chest** | **form-action** | **form-modal** | **book** (placeholder) |
| --- | --- | --- | --- | --- |
| Root element | `<Container entity>` | `<Screen>` | `<Form>` | `<Book>` |
| Owner | entity — shared by every viewer | player | player | player |
| Update model | live while open (poll, ≥1 tick) | per present — nothing changes while open | per present | unmeasured |
| Routing key | sentinel stack sizes → 1..3969, entity property | title string | title string | unmeasured |
| Carriers | `bool` (transport vs guard aux), `int` (stack size 2..64; durability 0..2031 on a non-stackable), `text` (one slot per char, 64-glyph table) | `bool` / `int` / `text` / `enum` as a form entry's text; strings uncapped | same, on a field's label | unmeasured |
| Inputs | `slot` — a button is an item taken and put straight back, a `<Slot>` one the player fills, both read by poll; `collection` for a `SlotGrid` the engine already publishes; `exit` | `press` (selection), `exit` | `submit`, `cancel`, `field` (native values at submit), `exit` | unmeasured |
| Native | item cells, hover text, touch chrome | scroll | toggle / slider / dropdown / text field | page turn |
| Geometry (island rects) | `int` on a non-stackable's durability, 0..2031, one slot per coordinate — blocked on S6 | digits in the entry, three per coordinate | same | unmeasured |
| Player in handlers | the actor, traced by the ledger | the viewer | the viewer | the viewer |
| Cost unit | inventory slot | form entry | form entry / field | unmeasured |
| Shape | frozen | frozen | frozen | frozen |

Two rows explain most of the design: the **update model** (a chest changes while open, a form only
between presents) and the **cost unit** (a slot is scarce and polled, an entry is cheap). The IR does
not care; the host's `carriers` and `mechanisms` tables do.

### The form hosts

- **Mount.** No vanilla file is ever re-declared. `main_screen_content` sizes the library's own
  container to the screen only when the title carries the protocol header, and `action_container` —
  the library's own definition, which declares its own `controls` — takes a placed subtree. A pack
  reaches a vanilla file only through a `modifications` entry at vanilla's own path, which is what
  makes every pack's edits stack. The mount is the library's own file,
  `core-ui/hosts/form/mount.json`, and `compiled_root` is what an addon's screens land in: the pack
  that DEFINES it lists its screens there directly, and every other pack inserts its router into
  `server_form.main_screen_content` through its own copy of that vanilla path — a `modifications`
  entry against another pack's file arrives as an unknown property and mounts nothing. The gating is
  two deep: `claimed` shows whenever the title carries the header, and under it each screen gates on
  its FULL title, `<header>:<key>`. Vanilla's own gate on the header is what hides `long_form` /
  `custom_form`. A pack-owned tree, so `$variables` are legal in its bindings — unlike the chest
  mount, which is modification-inserted.
- **The title keeps the protocol header.** `bcuiv0008core<E>:<key>`. Not a preference:
  `main_screen_content` sizes the library's container only when the header is present, and vanilla's
  `long_form` hides itself only then. A compiled screen keeps the header and adds its marker after
  it. The key is the screen's namespaced name, not a number — a chest folds its name into 1..3969
  because two stack sizes are all it can carry a key on, and a title has no such limit. The title can
  also carry screen-level carrier fields for **visibility and text**, but never for size.
- **Entries as carriers.** A cell with at least one carried prop, or a `press`, gets one
  `form_buttons` entry, in document order; the compiled cell reads it through a one-child
  `stack_panel` host with the entry's `collection_index` baked. The entry's text is that cell's live
  fields only, fixed-width from their capacities; a cell with one live field carries the bare value
  and decodes with zero slicing. No header, no type, no reserved block. Fully static cells cost no
  entry at all.
- **Every entry is a `button()` call.** `ActionFormData` numbers its entries twice: a JSON UI control
  reads `form_buttons` by collection index, which counts every entry, while `response.selection`
  counts only the pressable ones. Interleave a label and the two numberings drift. Emitting every
  entry through `button()` makes them coincide by construction, and the compiled control decides
  whether it can be pressed — an inert cell has no mappings and no `collection_details` binding, which
  is exactly what makes a press unattributable.
- **Press** ([S1](./spikes/S1-form-entry.md)). A baked button needs an entry for its index, and it
  must carry its OWN `collection_details` binding on `form_buttons` — a host supplying
  `collection_index` above it is not enough. With the binding, a placed control reports
  `response.selection` as its own index; without it the press still routes and the form closes, but
  arrives as `canceled`, indistinguishable from Esc. Every emitted control that reports a press
  carries that binding, and the emitter has no way to warn about a missing one.
- **Modal rows.** A compiled modal places every native field ITSELF, with a literal
  `collection_index` on `custom_form`, and does not use vanilla's row factory: a factory lays its
  controls out on its own pitch, so the decoration would sit where the author put it and the fields
  24 texels apart. `custom_form` and `formValues` are aligned one-to-one with `null` for rows that
  carry no value, over ONE index space counted across every row, decoration included
  ([S3](./spikes/S3-modal-entry.md)). `allocateModal` is the single definition of what a row is: the
  build numbers fields with it, the runtime writes rows with it, and the emitted index is baked
  against it. Decorative rows emit no `label()` entries, so a row costs nothing and a field's ordinal
  cannot shift under it. A modal screen's channels ride `custom_form` label rows, never
  `form_buttons`.
- **Fields are styled by replacing the decode, not the control.** Every library field control decodes
  its look out of `#custom_text`, which a compiled screen sends empty. The toggle mounts a
  payload-free twin (`compiled_toggle`); the slider, input and dropdown mount the interpreter's own
  `@core_ui_common.control` wrappers — never a piece from inside one — with the decode replaced, so
  geometry, faces and label scale arrive as `$variables` from the author's props. Three rules this
  rests on:
  - A `$variable` set where a control is MOUNTED does not reach a definition it merely references by
    name; that definition resolves its own scope and sees its own `|default`. Every hop restates what
    it forwards.
  - The slider sizes FOUR boxes from the payload (travel area, track, hover track, thumb), so all four
    take literals or each measures 0×0 and everything beneath it vanishes.
  - A static control and the decode CANNOT share one definition: a view binding that writes a
    `#property` overrides the literal property with whatever the empty payload yields. Each path is a
    payload-free twin (`static_face`, `label_static`, `dropdown_popup_background_static`), and where
    the engine finds a control BY NAME (`text_control`, `background_control`), `ignored` does not take
    the other path's copy out of the lookup — each path names its own and the mount swaps the name.
- **The dropdown popup is the compiler's to place.** A factory cannot pass per-row `$variables` and a
  compiled row has no payload, so the interpreted `popup_overlay` routers instantiate on a compiled
  screen and never open. The compiled screen emits its own router per dropdown cell at the screen
  root (`overlay` on `HostEmit`), baked with the cell's row index, `$compiled`,
  `$open_gate: "#custom_dropdown"`, the popup surface and `FormDropdown.popupHeight`. At the ROOT,
  never inside the cell: mounting the popup inside the native dropdown's own subtree crashes the
  client — the names in there are the engine's to resolve.
- **No fallback.** Both form hosts serve compiled screens only. A screen the build never saw has no
  layout in the pack to draw it with, so `render()` refuses it by name. What is left at runtime is the
  title that says which screen, the entries that carry the live values, and the response that says
  which entry was pressed.
- **`enabled` on a button stops nothing.** Bound false, the button still hands its press to script and
  draws no disabled look. A disabled button has to have no button in it at all, which is the shape the
  chest host uses.
- **A button draws only the child its `*_control` names.** A caption beside the state controls is
  never drawn; it belongs inside each face, on a layer above it, because being later in `controls`
  does not put it on top.

### The chest host

The runtime half is `packages/ui-runtime/src/hosts/chest/`: `host.ts` is the contract the registry
reads, `contract.ts` the constants the emitted JSON UI and the runtime agree on (the items, the
sentinel slots, the layout key, the entity property), `allocate.ts` the walk, `charset.ts` the glyph
table live text decodes through, and `runtime/` the loop — `cells/`, `poll`, `channels`, `reconcile`,
`session`, `items`, `players`, `watch`, `store`. The build half is
`packages/ui-compiler/src/hosts/chest/`: `emit.ts` for the mechanisms, `index.ts` for the hook and the
router, with the JSON UI each mechanism writes in `connectors/chest/`. Liveness and the claim walk are
the shared IR's. The engine rules all of it rests on are in
[spikes/jsonui-container-facts](./spikes/jsonui-container-facts.md).

**Hiding the transport is not an author's decision.** The transport item is the library's mechanism —
a press auto-places it into whichever of the player's slots is free — so nobody writing a screen
should have to know it exists to keep it from being drawn. The gate follows the collection: any cell
over `inventory_items` or `hotbar_items` hides it, grid or slot. `hideOwned` remains for asking over
some other collection. The cursor preview draws an item without going through a grid cell, so it
carries the same gate. And **a binding decides visibility from the frame it first resolves, not the
frame the control is created** — an unseeded control draws until then, so seed direction is a
judgement each time: the item preview seeds VISIBLE (a broken binding should leave a working preview),
the pointer seeds HIDDEN (a frame-late pointer is unnoticeable; a flash is not).

### Adding a host

1. Measure the screen: which vanilla file, which collection or string it publishes, what a control can
   read (numbers? strings?), what an input looks like from script, how it is opened and closed. Write
   it down as a spike page before any code.
2. Fill the capability row above. If a column is empty, the host offers nothing there and the
   needs/offers check refuses components that require it — that is correct, not a gap to paper over.
3. Write `host.ts` (root, owners, canvas, carriers, mechanisms, the wording of a refusal),
   `contract.ts`, `allocate.ts`, the runtime, and `emit.ts` plus a `connectors/<host>/` in the compile.
   No component changes. No IR changes unless the screen has a primitive nothing else has — and then a
   node kind, host-agnostic, with the host serving it.
4. Add the vocabulary the host needs to the render pack under `core_ui_<host>`.
5. Add a screen to the reference addon and the in-game checklist.

## Components

A component is a function from props to a host element with a small, fixed prop surface; everything
about transport is decided below it. Styled layers (`ore-styled`) compose the primitives —
`ore-styled/src/Button.ts` is the model: props in, primitive out, nothing else.

### Roots

A screen's root names its host, and there is no default.

| Root | Host | Entry point |
| --- | --- | --- |
| `<Screen>` | form-action | `render(<Screen/>, player)` |
| `<Form>` | form-modal | `render(<Form/>, player)` |
| `<Container entity>` | chest | `createContainerScreen(<Container/>)` |
| `<Book>` | book, later | `render` |

`render()` refuses any other root with a message naming the three roots; `createContainerScreen()`
refuses anything but `<Container>`; `hostFor` throws instead of falling through to the action form, and
a root below the root is refused whatever it is. A component library never renders a root: a root is
the one element an author writes at the top of a `*.screen.tsx`, and an embedded page is `<Screen>`
around the `<Embed>`.

### Needs vs offers

Every IR node kind lists what it *may* need; every host lists what it *offers*. The build checks one
against the other, per node, in context:

| Situation | Outcome |
| --- | --- |
| The node needs nothing (a baked panel, a baked label, an image) | draws on every host |
| The node needs an input the host offers (`Button onPress` on a form or a chest) | wired |
| The node needs an input the host lacks (`Slot` on a form) | **build error**: names the element, the host, and the nearest thing the host does offer |
| The node's carried prop needs a carrier the host lacks (a live `texture` on a chest with no `values={…}`) | **build error** with the observed values to declare |
| The node has a handler but the host cannot deliver it *there* (a live label inside a baked button face) | **build error** naming the position |
| The node is interactive and unobserved (a `Tabs` with no handler) | local; costs nothing |

### One component set, per-host mechanisms

The public set is host-agnostic. Each host maps a component's need to its own mechanism, declared as
`mechanisms` on its contract, and that one table answers both questions: a component asks
`useMechanism('Toggle')` and renders what it is told, and the same table is what the build checks a
tree against — a kind the host does not name is refused in the host's own words. The root provides the
host to its subtree, so the question is answered wherever a component sits.

| Component | Face | form-modal | form-action | chest |
| --- | --- | --- | --- | --- |
| `Button` | button face | refused, unless `submit` / `cancel` | entry with baked index | slot with transport item |
| `Toggle`, `Checkbox` | two-state face | native toggle field | button + carried bool | slot button + carried bool |
| `Radio`, `ToggleButtonGroup` | N faces | placed radio toggles over the native dropdown's options | buttons + carried enum | slot buttons + carried int |
| `Slider` | track + thumb | native slider | refused | refused |
| `Dropdown` | header + popup | native dropdown | refused | refused |
| `Input` | text box | native text field | refused | refused |
| `Text` live | label | row text | entry text | one slot per glyph |
| `Image` live | image | texture carrier | texture carrier | refused without `values` |
| `Tabs`, `Disclosure` | toggle group | local | local | local |
| `List max` | stack of rows | count row | count entry | refused |
| `Slot`, `SlotGrid` | cell frame | refused | refused | container cell |

The one semantic difference between hosts is *when* a value arrives: a modal delivers `onChange` at
submit, with the whole `values` object; the action form on the press that re-presents; the chest on the
poll that saw the change. That is a property of the host's input kind (`field`, `press`, `slot`) and
belongs in the capability matrix, not in the component.

`ore-styled` ships one `Toggle`, one `Checkbox`, one `Radio`, one `ToggleButtonGroup`, one `Slider`,
one `Dropdown` and one `Input`, each asking what it becomes here. `Form` remains as the root, with the
submit button that genuinely is modal-only. A `Checkbox` is a `Toggle` in a different skin — same
boolean, square textures, the caption on the other side — so the two share one implementation.
`Slider`, `Dropdown` and `Input` have no second form at all: no host but the modal offers a mechanism
for them, so each refuses elsewhere in that screen's own words. `Form.*` primitives are not public:
they are the modal host's lowering targets, reached only through the plain component. Only the roots,
`Slot` and `SlotGrid` stay host-specific in public.

**Host-specific props are typed by the host.** A component is declared once, with the props every host
shares. Where one host takes more — the modal's `name` on a field, the chest's `role` on a slot — those
props are not a second component; they are typed onto the one component by the host the element sits
in. Two ways to know the host: the root provides it to its whole subtree, and a component library that
renders into a host it does not own opens its fragment with an expected-host marker
(`<Expect host="form-modal">`), which says what it assumed and fails by name on the wrong screen
instead of failing once per field. A component with no root above it at all is told that, by the kind
that noticed. TypeScript cannot narrow a component's props by the JSX parent it sits under, so
enforcement is the host's: a field inside a `<Form>` says so when it has no `name`, and a screen of
buttons refuses a `Slider` outright rather than drawing an inert one.

### The event object

Every handler receives one object. `player` is always present: the viewer on a player-owned screen, the
actor on an entity-owned one. `host` is present only on entity-owned screens.

```ts
interface UiEvent        { player: Player; host?: Entity }   // Form.onCancel
type      PressEvent   = UiEvent                             // Button.onPress
interface ContainerEvent extends UiEvent { host: Entity }    // Container.onOpen / onClose
interface SlotEvent      extends ContainerEvent { stack: ItemStack }  // Slot.onInsert / onRemove
interface SubmitEvent    extends UiEvent { values: FormValues }       // Form.onSubmit
interface ChangeEvent<T> extends UiEvent { value: T }        // Tabs.onChange
```

A screen an entity owns always has that entity, so those events narrow `host` from optional to required
rather than declaring a second field. `useExit()` returns a handler value like any other; the IR
recognises it as input `exit` and the host decides what a close is (the native close on a form, the
client-side close button on a chest).

`Text maxLength` keeps its meaning: capacity plus liveness marker. Localized text is a key resolved on
the client with `localize: true` on every host; the server never measures a player's language.
`registerComponent` and custom native components are **experimental** — the contract is "register an IR
node kind plus a host emitter", and it may still change.

### Config screens exist where the addon is

A config screen shaped for a schema is compiled into the OWNING addon's pack, so a realm has a screen
for its own lists and none for anybody else's. The stack answers that two ways. A section is drawn by
its OWNER: the realm that cannot draw it asks that addon over `core:ui.show`, which needs the owner's
realm to be alive — a dependency accepted here because a section's controls are its schema's and
nothing generic can stand in for them. A list ITEM takes the other way out, because it is the one
editor a section cannot draw inline and because one field is all it ever is: `list_item_text` and
`list_item_choice` ship in the library set, baked into every addon by the same setting that bakes the
rest, and a realm falls back to them whenever the owner's shaped screen is not in its bundle. The trail
already names the list, the value travels per present, and a dropdown's options travel with it because
the engine reads those off the modal row.

## The render pack

The pack ships a **vocabulary**: definitions with defaults that compiled screens reference by name. The
per-screen JSON UI lives in the addon's own resource pack, generated at build.

The split between the two families follows two measured rules: a derived control's `bindings` array
**replaces** its base's, nothing merges (`common/control.json`); and a `$variable` inside a
`source_property_name` is dropped in a subtree inserted through `modifications`. On a definition the
pack owns outright, variables in bindings work.

| Family | Namespace | Has bindings? | Extended by | Examples |
| --- | --- | --- | --- | --- |
| **Shapes** | `core_ui_shapes` | never | reference with `$var` overrides for static props | `panel`, `nineslice`, `label`, `button_face` (4 state textures), `scroll` (viewport + track), `cell_frame`, `bar` |
| **Carriers** | `core_ui_<host>` | yes — the whole chain, literal | emitted per screen as a literal definition, one per binding *shape*, deduplicated by signature | chest: `slot_host`, `cell`, `text_host`, `gated_item`, `output_slot`; form: `entry_host`, `entry_bool`, `entry_text` |
| **Mounts** | `core_ui_<host>` | yes | never — the pack owns the mount and the router root | chest: `chest_root`, `chrome`; form: the mount and the compiled gate |

A namespace answers "whose mechanism is this?":

| Namespace | Owns |
| --- | --- |
| `core_ui_shapes` | Controls that are the same wherever they are drawn: no collection, no bindings, nothing about transport. The scrolling region is the first — it clips and scrolls identically on a chest and on a form. |
| `core_ui_chest` | The chest host's mechanism: item cells, slot buttons, the text host that spells a string one glyph at a time, the renderer that hides the transport item, the chrome. |
| `core_ui_form` | The form host's mechanism: the mount, and the gate that decides which compiled screen is shown. |
| `core_ui_router` | Deliberately not renamed: it is the insertion point every addon's emitted router extends, not a file of the chest's own. |

Shapes are **leaves**. A derived control's `controls` array replaces its base's like `bindings` does, so
a shape never declares children a compiled screen would have to extend; a face with content is a
compiled panel *composing* four `nineslice` shapes and a content panel, not a shape inheriting one.

**A shared frame for a look does not work.** Writing a panel and its texture once as a frame whose
caption is a variable, and deriving each state from it, compiles clean and cuts a pack's faces by a
third — and then the client refuses every caption in the world (`unknown UIType: [] for control`). The
frame resolves `caption@$core_content` in its OWN scope, where the variable was never set, so the
reference names nothing and the control has no type at all. Vanilla's `icon@$icon_image_ref` is not the
same shape: there the variable is set by the control that MOUNTS the definition as a child, not by a
definition that derives from it. Sharing has to happen at the mount — the screen's own control naming
the frame and its caption together — which means every consumer that references a face carries the
caption name with it.

### Rules every emitter obeys

1. `collection_index` is accepted only on a direct child of a control declaring `collection_name`, and
   that is legal only on `stack_panel` and `grid`. Anything reading a collection gets a one-child
   `stack_panel` host.
2. No `$variable` in a binding expression under a modification-inserted subtree. Literals only;
   parameterise through references.
3. Explicit pixel sizes under a host. Percentages along a stack panel's axis resolve unreliably.
4. `keep_ratio: false` on stretched images.
5. `localize: false` on literal labels; `localize: true` with a key for localized ones.
6. Never insert into an array the target definition only inherits — the insert shadows the inherited
   array. Re-declare the screen instead, as the chest hook does.
7. `modifications` resolve per file path; hooks live at vanilla's own path, define nothing, and stack
   across packs.
8. A binding expression uses `+ - *`, `=`, `not`, `and`, `or`; never `/`, `>=` or an empty literal.
   `#inventory_stack_count` is a string inside an expression. An ordering comparison (`>`) over a
   coerced entry string draws nothing; compare with `=` and enumerate.
9. A `remove` of an inherited child drops the whole file silently. Hide with a binding instead.
10. No `#size_binding_*` under a modification-inserted subtree — seed and binding alike are inert
    there, and every compiled screen is one, so **no compiled control can be sized by a binding**. A
    runtime-variable extent is a `stack_panel` whose children hide: an invisible child takes no space,
    static or bound.
11. Every `scroll_view` sets `allow_scroll_even_when_content_fits: false`, and compiled scroll content
    is never shorter than its viewport.
12. **A control behind a runtime gate is still CONSTRUCTED, and its components still run —
    `binding_condition: "visible"` does not save it.** Every compiled screen's tree exists on every
    form screen, hidden by its title gate, so a statically placed `slider` reads the rows of whatever
    form is open and asserts (`SliderComponent::_setCurrentStep`, Marketplace-blocking, on every form
    open in the world). The rule: a control that validates engine state against the form is never
    placed statically. The compiler emits at the slider's socket a `collection_panel` over
    `custom_form` whose factory `control_ids` route `slider` and `step_slider` to the cell
    (`core_ui_form_components.slider_live`) and every other row type to `core_ui_common.unused`, so the
    engine builds a slider only where a slider ROW exists and its reads and write-back are legal.
    Inside a factory subtree `visible` is ignored: the cell a socket gets for a row that is not its own
    is pushed off-screen through `use_anchored_offset`, gated by the literal row address the compiler
    bakes into it.
13. `$variables` DO substitute inside `property_bag` values in a definition mounted under a
    modification-inserted subtree — unlike binding expressions (rule 2), bag entries are ordinary
    properties. Baked bag seeds can be parameterised through mount `$variables`.
14. A `view` binding with `source_control_name` reads a SIBLING's `#toggle_state` under a
    modification-inserted subtree: a toggle header and a `stack_panel` of rows whose `visible` reads it
    fold on the client with nothing reaching script, and the stack gives the hidden rows no space.
    This is what `<Disclosure>` is built on. **The lookup is by NAME across the screen unless
    `resolve_sibling_scope: true`** — and every gated compiled screen is constructed on every form open
    (rule 12), so a second addon's screen with a control of the same name is the one read. Name such
    controls after the screen and resolve among siblings.
15. **Every control name referenced anywhere must resolve** — `dropdown_area`, `*_control` pointers,
    and the like. An unresolvable name is `Control name could not be resolved`
    (`UIControl::_resolveControlNames`), an assertion and therefore a Marketplace rejection, even where
    the no-host fallback renders exactly what was wanted. Point such references at a real zero-size,
    invisible dead-end control instead (the inline select's `inline_offscreen_area`).
16. **Inside a factory cell, a control reads its row with a plain collection binding and no
    `collection_details` of its own.** The cell already owns the row; a details binding declared on a
    descendant silences the read.
17. **The engine's slider steps in whole numbers, and its row text is `<label>: <value>`.** A
    fractional step, or a range that does not start and end on a whole number, is a thumb that cannot
    move; the writer sends such a range as a count of stops from zero and maps the answer back on
    submit. The number is read by slicing the sent block off `#custom_slider_text`;
    `#custom_slider_text_value` is not readable from a label.
18. **A label draws nothing for a number.** A binding result that is only digits is a number to the
    engine, and the label stays blank (`": 63"` draws, `"63"` does not). Keep a non-digit in front — a
    `§r` reset code draws as nothing — when text is sliced down to a number.

### Versioning — a window, as in `@bedrock-core/sync`

Two numbers are the contract between an addon's compiled screens and the render pack. Both move by the
sync protocol's rule: a **range** is supported, the newest version both sides know is used, and raising
the minimum is a breaking change.

| Number | What it versions | Carried in | Moves when |
| --- | --- | --- | --- |
| **Encoding** `E` | how live fields are packed into an entry's text and the title | the title header, `core` + `E`, on every form present | a padding is removed, a field width changes, a carrier type is packed differently |
| **Vocabulary** `V` | the definitions the pack ships and their `$var` names | the generated screen file header and `ui.generated.json` | a shape or carrier is added (minor) or changed (major) |

- `packages/resource-pack/protocol.json` declares `encoding: { min, max }` and
  `vocabulary: { min, max }` next to the pack version and hash; the pack description prints both ranges
  where a player can read them.
- `ui-runtime` exports `ENCODING_MIN` / `ENCODING_MAX`. A compiled screen emits at the newest encoding
  the pack it was built against decodes (recorded in `ui.generated.json`); the form mount routes on the
  header to the decoder generation for that `E`. The window is two versions wide: an encoding stays
  decodable for two pack minors after it stops being the newest, then the minimum rises in a pack
  major.
- A screen whose `V` or `E` is outside the pack's window falls through to the vanilla form or the
  vanilla chest, and the runtime `debug` log names the versions on both sides. Nothing renders garbage.
- The pack minor follows the library meta minor at release, which the release script does.

## The runtime

What cannot be baked: fibers, the allocation walk, carrier writes, input reads, and each host's
open/close detection.

```
packages/ui-runtime/src/
  jsx/  hooks/  core/fabric/          JSX runtime, hooks, fibers, owners, contexts
  core/build/                         expand.ts  layout.ts  inherit.ts   (layout + inherit: build-only entry)
  core/ir/                            analyze.ts  claims.ts  validate.ts   (shared with the build)
  core/layout/                        islands.ts   (re-solves an island inside its reserved box)
  core/session/                       session.ts  owner.ts  events.ts
  hosts/                              index.ts (the list)  types.ts (the contract)
    chest/                            host.ts  contract.ts  charset.ts  allocate.ts  build.ts  index.ts
      runtime/                        session, poll, cells/*, channels, reconcile, items, players, watch, store
    form/                             form-action + form-modal
  compile.ts                          the build-time surface
packages/ui-compiler/src/
  faces/  connectors/  nodes/         the three layers
  emit/                               jsonui.ts  document.ts  shapes.ts
  hosts/                              chest/emit.ts  form/emit.ts  form/router.ts
  compile.ts                          screen in, documents + placement out
```

What lives in `ui-runtime` is only what BOTH halves run: liveness analysis, the ordered `claim` walk
that reads a tree's needs, and the needs-vs-offers check. The IR node kinds and their lowering stay in
`ui-compiler`, because only the build emits — the runtime never needs a node, only the order of the
claims and the values on them.

One import rule holds the graph together: `hosts/index.ts` reaches a host through its `host.ts` alone,
never its barrel. A host's barrel pulls in its runtime, its runtime pulls in the render session, and the
render session asks `hosts/index.ts` which host a tree belongs to — so a registry that imported barrels
would close that circle. The registry only ever needs the contract.

| Call | Host | Notes |
| --- | --- | --- |
| `render(Screen, player)` | form-action / form-modal, by the root element | picks the compiled layout by the screen's key; refuses a screen the build never compiled |
| `createContainerScreen(Screen, options)` | chest | |
| hooks | all | `useExit` returns a value the IR recognises; `usePlayer` throws on entity-owned hosts |
| handlers | all | the event object |

State values are readonly (`Immutable<T>` from `useState` / `useReducer`).

```
render(owner)
  tree      = expand(root, owner)             fibers, same ids, same state
  placement = allocate(ir(tree))              the shared walk; no layout
  islands   = layoutIslands(placement)        only those whose layout-live inputs changed
  rects     = islands.map(solve inside its reserved box)
  diff      = (placement.values + rects) - lastWritten   per carrier address
  host.write(session, diff)
```

`allocate` at runtime reads values off the built elements the same way the build did, so a handler and a
value are found by position, never by name. The whole-tree layout pass is not run: the base is baked.

- **chest** — `entityContainerOpened` / interact open a session per entity, a tick poll over the drawn
  range fingerprints slots and hands changes to the cell role (`press`, `insert`, `remove`), channels
  are written by stack size, state persists on the entity.
- **form-action** — `show()` with the title carrying the key and the `form_buttons` entries carrying
  live fields; `response.selection` → the `press` input at that entry's position → handler →
  re-present. Per-present, as the engine dictates.
- **form-modal** — `show()`; native fields carry their own values; `submit` / `cancel` inputs;
  `formValues` re-keyed by placement order.

### Debug mode

`registerCompiledScreen` takes the build's snapshot beside the title: the visible ordinals
(load-bearing — the runtime re-marks the same elements, keeping the entry numbering identical to the
bake) and the claim fingerprint plus baked strings. With `debug: true` on `render` or
`createContainerScreen` options, every present is diffed against that snapshot and each difference is
one content-log line naming the screen, the element and the prop: a prop that changed but was baked, an
element sequence that differs, a baked string that drifted. This is the runtime half of the probe's
guard. A live string past its reservation is not reportable — `<Text>` slices to `maxLength` at element
creation.

## Build flow

### Discovery

Every compiled screen is a module `BP/scripts/**/*.screen.tsx` that default-exports its component. The
root element decides the host.

The build evaluates the screen module on a build machine with `@minecraft/server` and
`@minecraft/server-ui` replaced by a stub that answers any name with nothing. Three places, three
answers:

| Where | World access | Why |
| --- | --- | --- |
| Module scope, at `import` time — `world.afterEvents.*.subscribe(...)`, `system.run(...)`, a dynamic-property read next to an `import` | **no** | the build evaluates it and the stub returns nothing; at runtime it would run once per bundle whether or not the screen is ever opened |
| The component body, while computing JSX — `world.getPlayers()`, `host.getProperty(...)` in render | **no** | the build calls the body with the stub, so the value is `undefined` at build and the tree differs from the runtime's; at runtime it would run on every render and every probe |
| Hooks and handlers — `useEffect(() => { … })`, `onPress(e)`, `onInsert(e)` | **yes** | effects and handlers never run at build; an effect runs while the screen is viewed and its cleanup runs when it closes |

Subscribing to a world event **inside the component** is the intended way for a screen to react to the
world: subscribe in `useEffect`, set state from the callback, and the render that follows writes the
carriers. The build sees only the initial state and the effect's existence, never its body.

### Screen identity

A screen's name is its file name without the suffix; its identity is `<namespace>_<name>`; its routing
key is derived from that string by the host.

- The filter writes `packs/data/ui/ui.generated.json` — one record per compiled screen: `name`, `host`,
  `key`, the **placement** (addresses in document order, capacities), and the baked snapshot `debug`
  diffs against. It is reached as `@bedrock-core/generated/ui`, the way
  `@bedrock-core/generated/i18n` is, and inlined by the bundler.
- The link from a component to its record is by **name**: `render(Screen, player)` reads
  `Screen.screenName`, which the filter stamps by rewriting the screen module's default export
  (`export default withScreen('furnace', Furnace)`) in the workspace copy before the bundler runs.
  Nothing in the author's file changes. Identity by a hash of the IR shape was rejected: any
  build/runtime divergence in expansion (a stub player, a locale) would silently change the key and the
  screen would render as a vanilla form, where a name fails loud.

### One filter

One Regolith entry, `core`, runs the whole stack in the only order it supports, with the namespace
declared once under `shared`:

```
manifest -> generator -> guides -> i18n -> ui-compiler -> bundler
```

Each stage runs in its own Node process out of its own folder, exactly as Regolith would run it — same
cwd, same `ROOT_DIR`, same settings JSON, same exit code — so `core` only assembles the settings and
enforces the order. Per-stage settings sit under the stage's key and are merged over `shared`; `false`
skips a stage; `generator` is opt-in because it writes types into the project. A stage whose inputs are
absent reports that it has nothing to do and the run continues, so a project may use part of the stack.
A project that needs a filter of its own between two stages lists the six one by one instead. The
individual filters keep resolving from the repository until 2.0.

The filter bundles each screen together with the **project's** copy of `ui-runtime` and `ui-compiler`
(esbuild, game modules aliased to a stub), so a screen compiles against the library the addon ships. One
esbuild build with every screen as an entry point covers all of them. The compiler's own error messages
are relayed unchanged. The ui-compiler entry loads the addon's i18n bundle before compiling, so a
localized `<Text>` is detected and measured as its real default-locale string.

| Output | Where | Content |
| --- | --- | --- |
| `RP/ui/core-ui/screens/<ns>/faces.json` | addon RP | the addon's faces |
| `RP/ui/core-ui/screens/<ns>/<name>.json` | addon RP | the compiled screen, referencing `core_ui_shapes` and its own carrier definitions |
| `RP/ui/core-ui/screens/<ns>_router.json` | addon RP | the addon's router for each host it uses |
| `RP/ui/chest_screen.json`, `RP/ui/server_form.json` | addon RP, vanilla paths | hooks: one `modifications` entry each, defining nothing |
| `RP/ui/_ui_defs.json` | addon RP | the above registered |
| `RP/texts/<locale>.lang` | addon RP | the 64-glyph table, only when a chest screen has live text |
| `BP/entities/<file>.json` | addon BP | `inventory_size`, `core:ui_layout` — chest screens only |
| `packs/data/ui/ui.generated.json` | data | names, keys, placements, baked snapshots |
| the screen modules | workspace copy | default export wrapped with the screen's name |

Every compiled screen is baked at a 300×200 canvas (inside the 320×210 the smallest UI scale draws), and
the form gate mounts every compiled canvas centred, since the form's content box is 0×0 at screen centre
for a compiled title.

### Working loop

What has to be true before a change is worth a look in game.

1. **One deploy path.** `yarn preflight` — tests, lint, `regolith run` on the development profile, then a
   read-back of the pack the game will load. The `build` profile fills
   `packages/resource-pack/build/` for CI and nothing else; a `build` script never deploys to
   com.mojang.
2. **A build stamp on the HUD.** The development profile sets `"stamp": true` on `ui-compiler`, which
   bakes `ui <hash6> HH:MM` at the HUD's top-left — a hash of every compiled screen plus the clock.
   Preflight fails when the deployed stamp is not the one it just built; a `regolith watch` holding the
   session lock fails the same way, named.
3. **Console, not chat.** `render(Screen, player, { debug: true })` logs what each present wrote
   (`[ui] <title> entries [...]`) and the `debug` diff to the content log, where a line copies with a
   click.
4. **Probe first, build second.** A JSON UI behaviour not in the [rules](#rules-every-emitter-obeys) or
   a spike page gets a probe matrix before a feature stands on it: one atom per probe, lettered,
   readable as colours and text without debug mode, one deploy, one reading.
5. **Structured readings.** A test request names where to look, what working looks like, and what
   failing looks like.
6. **Asserts on, always, and `yarn gamelog` after every pass.** Marketplace review runs the client with
   assertions enabled, so a screen that works in a release build and asserts in a debug one is a
   rejection. `yarn gamelog` prints every `Assertion failed` (with its condition and function) and every
   `[ui]` script line from the newest debug and content logs — read before anything is called done.

## Remaining work

### Build flow and the book

| | Delivers |
| --- | --- |
| **CLI template** | `npx @bedrock-core/cli` scaffolds the single `core` filter, one `*.screen.tsx` per host the template shows, and the pack download; `scripts/sync-cli-template.mjs` keeps the template's filter version in step |
| **The docs site replaces this folder** | the page-by-page split is root [`PLAN.md`](../../PLAN.md) §4; when it lands, this file goes |
| **The book host** | parked. Findings page, contract, emit, runtime, vocabulary, in that order — [adding a host](#adding-a-host) |

After that: fibers mutate the tree in place instead of rebuilding it per render.

### Guides, second half

The own-addon half is built: pages compile into the owning addon's RP as form-action screens through
generated `*.screen.tsx` files, and navigation is `navigate()`. Left:

- The header breadcrumb bakes as a resolved default-locale string; it should be a rawtext the client
  resolves.
- Cross-addon presentation from the replicated **reference** table (home key + per page the key each
  entry opens, never the prose), so any realm shows another addon's guide with title = key,
  `selection` → next key, and no script of the owner involved. `GuidesRegistry` then shrinks from the
  manifest to that table, and the config app's Guide route moves onto it.
- A gated guide keeps rendering through the old path until gating rides a carried `visible`.

### Unmeasured

- **[S6](./spikes/S6-runtime-rect.md), half B** — whether a bound size RE-LAYS while a screen is open.
  Half A settled that `#size_binding_*` are 0–1 fractions of a control's own declared size, and that a
  bound size under `use_anchored_offset` inside a collection cell crashes the client on a chest screen.
  Blocks runtime layout islands and the chest geometry carrier; nothing else waits on it.
- **Foreign-language wrapping on compiled forms.** A localized label that wraps gets a client-sized box
  (`text_wrap` today). Whether its height can be reserved without server measurement is open.
- **The chest's `enum` carrier.** N gated images on one stack size is the obvious encoding; whether it
  is worth a node kind of its own or a lowering of `image` with `values` is decided when the first
  screen needs it.
- **Foreign collections on a form.** Which collections a form screen exposes to a `slot` is unmeasured.

### Documentation

Root [`PLAN.md`](../../PLAN.md) §4 owns the docs-site backlog (undocumented exports, JSDoc gaps,
`@example` conventions, the 1.0 README stubs). What is specific to this repository:

| Location | Text | Becomes |
| --- | --- | --- |
| `scripts/bump-meta.mjs:17-21` | "removes the old `MAX_BUMP` clamp" | drop the clause |
| `packages/ui-runtime/scripts/generate-font-metrics.mjs:22` | "clipped the bottom of wrap_box'd headings" | the box height is the measured height and clips children |
| `…/common/label_router.json:1-11`, `…/common/button_router.json:1-9` | "Stage 1 perf shape"; "no longer knows about regions" | the region gate lives in the routers; the base control does not decode regions |
| `…/screens/scroll_pool.json:66,236-240` | "S4 spike"; "SPIKE S5"; "previously collapsed"; "The bet:" | drop tags and the bet; rewrite the rest |
| `…/screens/scroll.json:37` | "worked but this didn't until renamed" | drop the clause |
| `…/common/state.json:96`, `…/components/image.json:25` | "SPIKE S2"; "S2-proven semantics" | drop tags |
| `packages/flexbox/src/__tests__/layout.test.ts:168,803` | "Regression: …"; "The bug was that deriveSize summed" | the invariant |

Seven of `ui-runtime`'s exports carry a `//` line where a `/** */` belongs. The docs repo's `stash@{0}`
holds new findings for [`spikes/jsonui-container-facts.md`](./spikes/jsonui-container-facts.md); the
apply command is in root `PLAN.md` §4.

## Glossary

- **Host** — one Minecraft screen the library can draw on (server form, chest, later book) together
  with the transport it offers. The only layer that knows how a value travels.
- **Carrier** — a physical channel a host offers for a value that changes at runtime: a container
  slot's stack size, a form entry's text, a native field. Typed, with a capacity.
- **Input** — a physical signal a host can deliver to script: an item moving, a form selection, a
  submit.
- **Baked** — decided at build and written into JSON UI as a literal. Costs nothing at runtime.
- **Placement** — the result of allocation: every carried value and every input given an address on
  the host, by one walk the build and the runtime both run.
- **Vocabulary** — the definitions the render pack ships that compiled screens reference by name.
- **Face** — a node's look with its static props, no bindings; deduplicated per addon and referenced
  by name.
- **Socket** — a node with a carried prop or an input. The face document draws it as its inert face;
  the host pass wraps or replaces it, never moves it.
- **Swap** — a client-side switch a compiled screen owns outright: content changes with nothing
  reaching script.
- **Gallery** — the dev-profile screen that opens every compiled screen as faces only, for visual
  sign-off before any host serves it.
- **Static screen** — every string baked, every press a `<Link>`; shippable as a table and presentable
  by any addon.
