# 04 — Hosts

A host is one Minecraft screen the library draws on, and the transport that screen offers. Every screen-specific fact in the codebase lives in a host: the routing trick, the carriers, the inputs, the vanilla file that is hooked, the chrome, the runtime loop. Today's `packages/ui-compile/src/hosts/chest.ts` plus `packages/ui-runtime/src/container/*` is the chest host spread over two packages; the form has no host at all — its knowledge is spread across the serializer, the writers, the presenters and the render pack.

## The interface

Two halves, one contract module they share. *Decided* at this altitude; field names *Proposed*.

```ts
// shared: packages/ui-runtime/src/hosts/<id>/contract.ts
interface HostContract {
  id: 'chest' | 'form-action' | 'form-modal' | 'book' | …;
  canvas: { width: number; height: number };
  /** The element type that names this host at a screen's root: <Screen>, <Form>, <Container>, <Book>. No default. */
  root: string;
  /** What the host can carry, with the cost of each. */
  carriers: readonly CarrierSpec[];       // { type, capacity limits, cost }
  /** What the host can deliver to script. */
  inputs: readonly InputSpec[];           // { kind, cost }
  /** The one walk: IR -> placement. Run at build and at runtime. */
  allocate(ir: IrDocument): Placement;
  /** How the screen is identified on the client. */
  routing: { keyOf(screen: ScreenId): RoutingKey };
}

// build half: packages/ui-compile/src/hosts/<id>/emit.ts
interface HostEmit {
  /** JSON UI that reads one placed carrier: the bindings, literal, per shape. */
  readCarrier(address: Address, spec: CarrierSpec): Control;
  /** JSON UI that delivers one placed input. */
  wireInput(address: Address, spec: InputSpec): Control;
  /** The per-screen document around the emitted nodes: mount, chrome, backdrop. */
  screen(placement: Placement, body: ControlEntry[]): Document;
  /** The addon-level documents: hooks into vanilla files, the router. */
  route(screens: readonly CompiledScreen[]): PlacedDocument[];
}

// runtime half: packages/ui-runtime/src/hosts/<id>/runtime.ts
interface HostRuntime {
  /** Detects opens and closes; hands back an owner and a session. */
  serve(screen: Screen, config): Served;
  /** Writes carriers that changed. */
  write(session: Session, placement: Placement, diff: Diff): void;
  /** Reads inputs; dispatches handlers with the event object. */
  read(session: Session): void;
}
```

The host registry is a list, like today's `NODE_DEFINITIONS` and `CELLS`: adding a host is adding a folder and a list entry, never a `switch`.

## Capability matrix

| | **chest** | **form-action** | **form-modal** | **book** (placeholder) |
| --- | --- | --- | --- | --- |
| Root element | `<Container entity>` | default | `<Form>` | `<Book>` |
| Owner | entity — shared by every viewer | player | player | player |
| Update model | live while open (poll, ≥1 tick) | per present — nothing changes while open | per present | *Measure* |
| Routing key | sentinel stack sizes → 1..3969, entity property | title string | title string | *Measure* |
| Carriers | `bool` (transport vs guard aux), `int` (stack size 2..64; durability 0..2031 on a non-stackable), `text` (one slot per char, 64-glyph table) | `bool` / `int` / `text` / `enum` as a form entry's text; strings uncapped | same, on a field's label | *Measure* |
| Inputs | `press` (item move), `slot` (insert / remove by poll), `exit` (client close) | `press` (selection), `exit` | `submit`, `cancel`, `field` (native values at submit), `exit` | *Measure* |
| Native | item cells, hover text, touch chrome | scroll | toggle / slider / dropdown / text field | page turn |
| Geometry (island rects) | `int` on a non-stackable's durability, 0..2031, one slot per coordinate — *Measure* (S6) | digits in the entry, three per coordinate | same | *Measure* |
| Player in handlers | the actor, traced by the ledger | the viewer | the viewer | the viewer |
| Cost unit | inventory slot | form entry | form entry / field | *Measure* |
| Shape | frozen | frozen | frozen | frozen |

Two rows explain most of the design: the **update model** (a chest changes while open, a form only between presents) and the **cost unit** (a slot is scarce and polled, an entry is cheap). The IR does not care; the host's `carriers` and `inputs` tables do.

## The form hosts, concretely

*Proposed*, with the two *Measure* items called out.

- **Mount.** *Settled by S1: no re-declaration is needed.* `main_screen_content` already sizes the library's own container to the screen only when the title carries the protocol header, and `action_container` — the library's own definition, which declares its own `controls` — took a placed subtree with no vanilla edit at all. The title gates on the screen key: a compiled screen's title carries `<header>:<key>`; the mount shows the addon's screen whose key matches, and the interpreter's container for a header with no key. Vanilla's own gate on the header is what already hides `long_form` / `custom_form` today. A pack-owned tree, so `$variables` are legal in its bindings — unlike the chest mount, which is modification-inserted.
- **Entries as carriers.** A cell with at least one carried prop, or a `press`, gets one `form_buttons` entry, in document order; the compiled cell reads it through a one-child `stack_panel` host with the entry's `collection_index` baked — the same host rule the chest obeys. The entry's text is that cell's live fields only, fixed-width from their capacities; a cell with one live field carries the bare value and decodes with zero slicing. No header, no type, no reserved block: the compiled cell already knows what it is. Fully static cells cost no entry at all.
- **Every entry is a `button()` call.** *Decided.* `ActionFormData` numbers its entries twice: a JSON UI control reads `form_buttons` by collection index, which counts every entry, while `response.selection` counts only the pressable ones. Interleave a label and the two numberings drift, and every control would have to carry both. Emitting every entry through `button()` makes them coincide by construction, and the compiled control decides whether it can be pressed — an inert cell simply has no mappings and no `collection_details` binding, which by S1 is exactly what makes a press unattributable.
- **The title keeps the interpreter's header.** *Decided.* `bcuiv0008core<E>:<key>`. Not a preference: `main_screen_content` sizes the library's container to the screen only when the header is present, and vanilla's `long_form` hides itself only then. A compiled screen wants both, so it keeps the header and adds its marker after it. The key is the screen's namespaced name, not a number — a chest folds its name into 1..3969 because two stack sizes are all it can carry a key on, and a title has no such limit.
- **Press.** *Measured 2026-08-27, [spikes/S1](./spikes/S1-form-entry.md).* A baked button needs an entry for its index, and it must carry its OWN `collection_details` binding on `form_buttons` — a host supplying `collection_index` above it is not enough. With the binding, a placed control reports `response.selection` as its own index; without it the press still routes and the form closes, but arrives as `canceled`, indistinguishable from Esc. Every emitted control that reports a press carries that binding, and the emitter has no way to warn about a missing one, so it is not optional.
- **Title.** Header + key + screen-level carriers (none today). Measured while building `List`: a compiled control can decode title fields for visibility and text, but not for size — `#size_binding` is inert where compiled screens live — so the first candidate, a scroll's extent, is served by a collapsing stack instead. The scroll block and the backdrop slot the interpreted title carries are baked.
- **Modal.** Native fields stay `ModalFormData` calls; their label string is the field's own entry (live props of that field, often empty). Decorative rows no longer emit `label()` entries, which removes the ordinal-shift bug class outright. `Form.Button` becomes a `button` node with input `submit` / `cancel`.
- **Interpreter.** `form-action` and `form-modal` exist as hosts today (phase 1) with the byte-protocol interpreter as their runtime. Phase 3 gives them a compiled runtime and keeps the interpreter inside them as the fallback for a screen the build did not compile — which is what config, the addon list and guides ride until they compile ([09-plan](./09-plan.md)). There is no separate `form-legacy` host: the fallback is a second backend behind the same contract, not a second screen.

## The chest host

Already a host in all but layout; measured rules are in the docs repo (`container-screens/findings.md`) and in the code comments of `hosts/chest.ts`, `nodes/button.ts`, `nodes/text.ts`. What moves: `container/{allocate,analyze}` → the shared IR; `container/{cells,poll,channels,reconcile,session,items,players,watch,store}` → `hosts/chest/runtime/`; `ui-compile/hosts/chest.ts` + the chest-specific parts of `nodes/*` → `ui-compile/hosts/chest/emit.ts`. Behaviour unchanged.

## Adding a host (the book, the sign, whatever comes)

1. Measure the screen: which vanilla file, which collection or string it publishes, what a control can read (numbers? strings?), what an input looks like from script, how it is opened and closed. Write it down as a findings page before any code.
2. Fill the capability row above. If a column is empty, the host offers nothing there and the needs/offers check will refuse components that require it — that is correct, not a gap to paper over.
3. Write `contract.ts` (carriers, inputs, routing, `allocate`), `emit.ts`, `runtime.ts`. No component changes. No IR changes unless the screen has a primitive nothing else has (then a node kind, host-agnostic, with the host serving it).
4. Add the vocabulary the host needs to the render pack under `core_ui_<host>` ([06-render-pack](./06-render-pack.md)).
5. Add a screen to the reference addon and the in-game checklist.
