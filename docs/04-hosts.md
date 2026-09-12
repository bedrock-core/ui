# 04 — Hosts

A host is one Minecraft screen the library draws on, and the transport that screen offers. Every screen-specific fact in the codebase lives in a host: the routing trick, the carriers, the inputs, the vanilla file that is hooked, the chrome, the runtime loop. A host is a folder in each package — `packages/ui-runtime/src/hosts/<id>/` for the contract the registry reads, the allocation walk and the runtime that serves the screen, `packages/ui-compiler/src/hosts/<id>/` for the emitter and the router. Three of them: `chest`, and the two form hosts sharing `hosts/form/`.

## The interface

Two halves. The contract is what everything above a host reads; the emitter is the build's half.

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
  /** Whether a screen of this host is baked at build time by default, for the callers that do not say. */
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

The rest of a host is modules rather than one interface: the allocation walk both halves run is `hosts/<id>/allocate.ts`, the constants the emitted JSON UI and the runtime agree on are `hosts/<id>/contract.ts`, the routers are `ui-compiler/src/hosts/chest/index.ts` and `ui-compiler/src/hosts/form/router.ts`, and the runtime loops are `hosts/chest/runtime/` and `hosts/form/runtime.ts`.

The host registry is a list, like `NODE_DEFINITIONS` and `CELLS`: adding a host is adding a folder and a list entry, never a `switch`.

## Capability matrix

| | **chest** | **form-action** | **form-modal** | **book** (placeholder) |
| --- | --- | --- | --- | --- |
| Root element | `<Container entity>` | `<Screen>` | `<Form>` | `<Book>` |
| Owner | entity — shared by every viewer | player | player | player |
| Update model | live while open (poll, ≥1 tick) | per present — nothing changes while open | per present | *Measure* |
| Routing key | sentinel stack sizes → 1..3969, entity property | title string | title string | *Measure* |
| Carriers | `bool` (transport vs guard aux), `int` (stack size 2..64; durability 0..2031 on a non-stackable), `text` (one slot per char, 64-glyph table) | `bool` / `int` / `text` / `enum` as a form entry's text; strings uncapped | same, on a field's label | *Measure* |
| Inputs | `slot` — a button is an item taken and put straight back, a `<Slot>` one the player fills, both read by poll; `collection` for a `SlotGrid` the engine already publishes; `exit` (client close) | `press` (selection), `exit` | `submit`, `cancel`, `field` (native values at submit), `exit` | *Measure* |
| Native | item cells, hover text, touch chrome | scroll | toggle / slider / dropdown / text field | page turn |
| Geometry (island rects) | `int` on a non-stackable's durability, 0..2031, one slot per coordinate — *Measure* (S6) | digits in the entry, three per coordinate | same | *Measure* |
| Player in handlers | the actor, traced by the ledger | the viewer | the viewer | the viewer |
| Cost unit | inventory slot | form entry | form entry / field | *Measure* |
| Shape | frozen | frozen | frozen | frozen |

Two rows explain most of the design: the **update model** (a chest changes while open, a form only between presents) and the **cost unit** (a slot is scarce and polled, an entry is cheap). The IR does not care; the host's `carriers` and `mechanisms` tables do.

## The form hosts, concretely

What each rule rests on is called out with it.

- **Mount.** *Settled by S1: no re-declaration is needed.* `main_screen_content` sizes the library's own container to the screen only when the title carries the protocol header, and `action_container` — the library's own definition, which declares its own `controls` — takes a placed subtree. Nothing vanilla is ever re-declared: a pack reaches a vanilla file only through a `modifications` entry at vanilla's own path, which is what makes every pack's edits stack. The mount itself is the library's own file, `core-ui/hosts/form/mount.json`, and `compiled_root` is what an addon's screens land in: the pack that DEFINES it lists its screens there directly, and every other pack inserts its router into `server_form.main_screen_content` through its own copy of that vanilla path — a `modifications` entry against another pack's file arrives as an unknown property and mounts nothing. The gating is two deep: `claimed` shows whenever the title carries the header, and under it each screen gates on its FULL title, `<header>:<key>`. Vanilla's own gate on the header is what hides `long_form` / `custom_form`. A pack-owned tree, so `$variables` are legal in its bindings — unlike the chest mount, which is modification-inserted.
- **Entries as carriers.** A cell with at least one carried prop, or a `press`, gets one `form_buttons` entry, in document order; the compiled cell reads it through a one-child `stack_panel` host with the entry's `collection_index` baked — the same host rule the chest obeys. The entry's text is that cell's live fields only, fixed-width from their capacities; a cell with one live field carries the bare value and decodes with zero slicing. No header, no type, no reserved block: the compiled cell already knows what it is. Fully static cells cost no entry at all.
- **Every entry is a `button()` call.** *Decided.* `ActionFormData` numbers its entries twice: a JSON UI control reads `form_buttons` by collection index, which counts every entry, while `response.selection` counts only the pressable ones. Interleave a label and the two numberings drift, and every control would have to carry both. Emitting every entry through `button()` makes them coincide by construction, and the compiled control decides whether it can be pressed — an inert cell simply has no mappings and no `collection_details` binding, which by S1 is exactly what makes a press unattributable.
- **The title keeps the protocol header.** *Decided.* `bcuiv0008core<E>:<key>`. Not a preference: `main_screen_content` sizes the library's container to the screen only when the header is present, and vanilla's `long_form` hides itself only then. A compiled screen wants both, so it keeps the header and adds its marker after it. The key is the screen's namespaced name, not a number — a chest folds its name into 1..3969 because two stack sizes are all it can carry a key on, and a title has no such limit.
- **Press.** *Measured 2026-08-27, [spikes/S1](./spikes/S1-form-entry.md).* A baked button needs an entry for its index, and it must carry its OWN `collection_details` binding on `form_buttons` — a host supplying `collection_index` above it is not enough. With the binding, a placed control reports `response.selection` as its own index; without it the press still routes and the form closes, but arrives as `canceled`, indistinguishable from Esc. Every emitted control that reports a press carries that binding, and the emitter has no way to warn about a missing one, so it is not optional.
- **Title.** Header + key + screen-level carriers (none today). Measured while building `List`: a compiled control can decode title fields for visibility and text, but not for size — `#size_binding` is inert where compiled screens live — so the first candidate, a scroll's extent, is served by a collapsing stack instead. The scroll block and the backdrop are baked into the layout rather than carried on the title.
- **Modal.** Native fields are `ModalFormData` calls; their label string is the field's own entry (live props of that field, often empty). Decorative rows emit no `label()` entries, so a row costs nothing and a field's ordinal cannot shift under it. `Form.Button` lowers to a `button` node with input `submit` / `cancel`.
- **No fallback.** Both form hosts serve compiled screens only. A screen the build never saw has no layout in the pack to draw it with, so `render()` refuses it by name rather than reaching for a second backend; config, the addon list and guides are compiled like anything else, from what the addon declared. What is left at runtime is the title that says which screen, the entries that carry the live values, and the response that says which entry was pressed.

## The chest host

The runtime half is `packages/ui-runtime/src/hosts/chest/`: `host.ts` is the contract the registry reads, `contract.ts` the constants the emitted JSON UI and the runtime agree on (the items, the sentinel slots, the layout key, the entity property), `allocate.ts` the walk, `charset.ts` the glyph table live text decodes through, and `runtime/` the loop — `cells/`, `poll`, `channels`, `reconcile`, `session`, `items`, `players`, `watch`, `store`. The build half is `packages/ui-compiler/src/hosts/chest/`: `emit.ts` for the mechanisms, `index.ts` for the hook and the router, with the JSON UI each mechanism writes in `connectors/chest/`. Liveness and the claim walk are the shared IR's (`core/ir/`), not the chest's. The engine rules all of it rests on are in [spikes/jsonui-container-facts](./spikes/jsonui-container-facts.md) and in those modules' comments.

A container screen gets no navigation key. It is reached by interacting with the entity that carries its layout key, so there is nothing for `<Link to>` or `navigate()` to name; only form screens appear in `SCREEN_KEYS` and in the reference feed.

## Adding a host (the book, the sign, whatever comes)

1. Measure the screen: which vanilla file, which collection or string it publishes, what a control can read (numbers? strings?), what an input looks like from script, how it is opened and closed. Write it down as a findings page before any code.
2. Fill the capability row above. If a column is empty, the host offers nothing there and the needs/offers check will refuse components that require it — that is correct, not a gap to paper over.
3. Write `host.ts` (the contract: root, owners, canvas, carriers, mechanisms, the wording of a refusal), `contract.ts` (what the emitted JSON UI and the runtime agree on), `allocate.ts`, the runtime, and `emit.ts` plus a `connectors/<host>/` in the compile. No component changes. No IR changes unless the screen has a primitive nothing else has (then a node kind, host-agnostic, with the host serving it).
4. Add the vocabulary the host needs to the render pack under `core_ui_<host>` ([06-render-pack](./06-render-pack.md)).
5. Add a screen to the reference addon and the in-game checklist.
