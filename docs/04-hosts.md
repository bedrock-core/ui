# 04 — Hosts

A host is one Minecraft screen the library draws on, and the transport that screen offers. Every screen-specific fact in the codebase lives in a host: the routing trick, the carriers, the inputs, the vanilla file that is hooked, the chrome, the runtime loop. Today's `packages/ui-compile/src/hosts/chest.ts` plus `packages/ui-runtime/src/container/*` is the chest host spread over two packages; the form has no host at all — its knowledge is spread across the serializer, the writers, the presenters and the render pack.

## The interface

Two halves, one contract module they share. *Decided* at this altitude; field names *Proposed*.

```ts
// shared: packages/ui-runtime/src/hosts/<id>/contract.ts
interface HostContract {
  id: 'chest' | 'form-action' | 'form-modal' | 'book' | …;
  canvas: { width: number; height: number };
  /** Which root element makes a screen this host's: <Container>, <Form>, <Book>, or the default. */
  claims(root: IrNode): boolean;
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

- **Mount.** The render pack's `server_form.json` re-declares the form's content the way the chest hook re-declares `small_chest_screen`, and gates on the title: a compiled screen's title carries `<header>:<key>`; the mount shows the addon's screen whose key matches, and the interpreter's container for a header with no key. Vanilla's own gate on the header is what already hides `long_form` / `custom_form` today. A pack-owned tree, so `$variables` are legal in its bindings — unlike the chest mount, which is modification-inserted.
- **Entries as carriers.** A cell with at least one carried prop, or a `press`, gets one `form_buttons` entry, in document order; the compiled cell reads it through a one-child `stack_panel` host with the entry's `collection_index` baked — the same host rule the chest obeys. The entry's text is that cell's live fields only, fixed-width from their capacities; a cell with one live field carries the bare value and decodes with zero slicing. No header, no type, no reserved block: the compiled cell already knows what it is. Fully static cells cost no entry at all.
- **Press.** A baked button still needs an entry for its index: the engine only reports `form_button_click` for a collection item. *Measure*: a static control with `collection_details` + baked `collection_index`, outside vanilla's `collection_panel` factory, must produce `response.selection`. First spike in [09-plan](./09-plan.md).
- **Title.** Header + key + screen-level carriers (none today). The scroll block and the backdrop slot the title carries now are baked.
- **Modal.** Native fields stay `ModalFormData` calls; their label string is the field's own entry (live props of that field, often empty). Decorative rows no longer emit `label()` entries, which removes the ordinal-shift bug class outright. `Form.Button` becomes a `button` node with input `submit` / `cancel`.
- **Interpreter.** The current byte-protocol form backend becomes `form-legacy`: a host whose `allocate` puts every cell on an entry and whose `emit` is the existing render pack. It exists so config, the addon list and guides keep working until they compile ([09-plan](./09-plan.md)); nothing new targets it.

## The chest host

Already a host in all but layout; measured rules are in the docs repo (`container-screens/findings.md`) and in the code comments of `hosts/chest.ts`, `nodes/button.ts`, `nodes/text.ts`. What moves: `container/{allocate,analyze}` → the shared IR; `container/{cells,poll,channels,reconcile,session,items,players,watch,store}` → `hosts/chest/runtime/`; `ui-compile/hosts/chest.ts` + the chest-specific parts of `nodes/*` → `ui-compile/hosts/chest/emit.ts`. Behaviour unchanged.

## Adding a host (the book, the sign, whatever comes)

1. Measure the screen: which vanilla file, which collection or string it publishes, what a control can read (numbers? strings?), what an input looks like from script, how it is opened and closed. Write it down as a findings page before any code.
2. Fill the capability row above. If a column is empty, the host offers nothing there and the needs/offers check will refuse components that require it — that is correct, not a gap to paper over.
3. Write `contract.ts` (carriers, inputs, routing, `allocate`), `emit.ts`, `runtime.ts`. No component changes. No IR changes unless the screen has a primitive nothing else has (then a node kind, host-agnostic, with the host serving it).
4. Add the vocabulary the host needs to the render pack under `core_ui_<host>` ([06-render-pack](./06-render-pack.md)).
5. Add a screen to the reference addon and the in-game checklist.
