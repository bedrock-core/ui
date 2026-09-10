# 10 — Faces and hosts

Two passes over every screen, and one invariant between them: the **face pass** owns the
layout, the **host pass** owns the mechanism. A host may replace what a control *is*; it may
never move it. Every screen type is signed off visually as faces alone, in game, before any
host attaches a channel, and the build proves afterwards that the host changed nothing visible.

## Why two passes

One JSON UI tree per screen mixes the look and the transport, so every bug reads as one tree
and a rendering fix on one host says nothing about the next. Separating them gives:

- **One static document to validate.** Faces carry no bindings, so the rules that only
  hold for static trees ([06-render-pack](./06-render-pack.md) rules 3, 4, 5, 11, 14, 15) run
  once over the face document with no host in the loop.
- **Rule 12 by construction.** An engine component (a slider, a toggle) lives in a face,
  and a face has no bindings, so nothing constructed hidden behind a gate can evaluate a
  collection row that is not there.
- **Visibility first.** A carried `visible` is a host gate *around* the face. Whatever is
  inside is evaluated after the gate, never before.
- **A host with no channels draws faces alone.** The book, and the gallery below.

One engine fact shapes the split: a `$variable` as an `@` base mounts nothing, so a face
document cannot leave a named hole for another file to fill. The face pass therefore hands the
host a complete document, and the host splices its controls into it.

## Artifacts

| Layer | Artifact | Bindings | Emitted by |
| --- | --- | --- | --- |
| **Faces** | `RP/ui/core-ui/screens/<ns>/faces.json`, namespace `<ns>_faces`: every look the addon's screens use, deduplicated by signature | never | face pass |
| **Face document** | one per screen, complete and drawable: the skeleton with baked rects, faces referenced by name, every socket drawn as its inert face | never | face pass |
| **Screen** | `RP/ui/core-ui/screens/<ns>/<name>.json`: the face document with each socket replaced by the host's control | only here | host pass |
| **Preview** | `RP/ui/core-ui/screens/<ns>/<name>.preview.json`: the face document mounted on the action form, dev profile only | never | face pass |

Faces are per addon rather than in the render pack, so a styled layer other than `ore-styled`
ships its own with nothing added to the pack. The render pack keeps the vocabulary
([06-render-pack](./06-render-pack.md)): shapes, the hosts' carriers and the mounts. *Decided.*

## The face pass

Input: the built tree after expand, layout and inherit, with the IR's binding class on every
prop ([03-ir](./03-ir.md)). Output: the faces file and one face document per screen.

- **A face** is a node's look with its static props: the four textures of a button face, a
  label's font and scale, a cell frame, a nineslice. Faces are deduplicated by a signature over
  the props that reach JSON UI: `faceSignature` (`nodes/primitives/button.ts`) and
  `textSignature` (`nodes/primitives/text.ts`) are the shape every node kind follows. A screen references a face by name
  and overrides nothing at runtime; a static prop that differs between two uses is two faces.
- **A socket** is a node with at least one carried prop or one input: a button with a press,
  a label whose text is live, a slot, a native field, a subtree with a carried `visible`. The
  face document draws every socket as its inert face: the button face with no mappings, the
  label with its reference string, the slot as an empty `cell_frame`, the field as its
  payload-free twin, the chest chrome as an image. The socket list, in the claim walk's order,
  is the placement's address list ([02-pipeline](./02-pipeline.md)).
- **Static validation** runs over the face document alone: explicit pixel sizes under hosts,
  `keep_ratio: false` on stretched images, `localize` set on every label, every referenced
  control name resolving, control names unique per screen, no engine component reading a
  binding. A failure names the element and the rule.
- **The layout is the base.** Rects are baked here. Islands ([03-ir](./03-ir.md)) are the
  one runtime exception and stay parked with S6.
- **Every static JSON UI property is fair game.** The interpreter could only carry what its
  byte payload had room for; a face is written as JSON UI, so a component may expose any
  static property the engine has: `text_alignment`, `line_padding`, `clips_children`,
  `shadow`, `font_type`, `alpha`, `fill`, `color` on images, `tiled` nineslices, sounds on
  buttons. Each is added as a component prop the face bakes, and each lands in the visual
  pass (A4) as the first place it is seen. `Text align` is first.

## The compile's three layers

*Decided.* The stretch between the IR and the JSON UI is three directories, each a pure step
and each testable without the other two.

| Layer | Takes | Gives | Knows |
| --- | --- | --- | --- |
| **`faces/`** | plain data: a rect, textures, a style, children already drawn | one `ControlEntry` — the look, written as JSON UI | nothing else. No host, no context, no address |
| **`connectors/`** | that face, plus the address the host allocated | the control that stands in the face's place | one host each. `connectors/form` and `connectors/chest` are separate entry points, since both export a `press` and a `text` |
| **`nodes/`** | a JSX element | an IR node, and the mechanism that node needs | the IR, and what each kind *is* |

A face is `(data) => ControlEntry` and a connector is its mirror, `(data, face, ctx) =>
ControlEntry`: the same shape, one host, and free only to wrap or replace what it was handed —
the rect guard below proves it moved nothing. Children reach a face already drawn, so no
recursion crosses two layers.

`nodes/` sorts into `primitives/`, `compositions/` and `utils/`: a primitive is one JSON UI
control type with its static props, a composition is client logic built out of primitives, and
the utilities are what more than one lowering reads off an element.

### Behaviours

*Phase B3.* Five node kinds are still compositions inside the compile — `tabs`, `tab`,
`disclosure`, `disclosureHeader`, `list` — each carrying its client logic as a special case of
its own. They belong in the component layer, which first needs that logic to be something any
primitive can carry:

| Behaviour | What it is | Today |
| --- | --- | --- |
| `route` | a button's mappings: close, submit, form click | done — `action` on the `button` primitive |
| `group` | toggles that swap exclusively, one forced index each | in `faces/utils/swap.ts`, reachable only through `tabsFace` |
| `states` | which children a control draws per state | the same module, the same limit |
| `follows` | a sibling drawn from another control's state | the same module, reachable only through `disclosureFace` |

Nothing client-side is lost by moving up, because none of the four needs the server: a swap is
the one mechanism a compiled screen owns outright, and each composition is a swap plus a
placement. `Tabs` is a group whose panes sit in each toggle's checked state; `Disclosure` is
`follows` on a stack, which is what the faces layer already draws — `disclosureFace` takes the
swap's name and the rows read it, so no behaviour of its own; `List` is a stack whose rows a
count mechanism gates, and the count is a mechanism already. The one thing a composition may
not do is read a swap back: nothing outside the toggle learns which look is showing, on any
host, which is the limit these kinds have today.

### Fields are primitives

*Decided.* A modal field is two halves and they belong in two layers. An input is a primitive
like any other and has a face — a box, a placeholder, a style — that draws on any screen and in
the gallery. What makes it a *modal* field is the connector: `connectors/form/input.ts` places
the engine's own widget and tells it which row it is, and the modal is the only host that has
one. A host with no connector for a kind refuses it by name, which is the mechanism table
below.

So `field` splits along the line the faces already draw: one primitive per kind, with the
modal's wiring in `connectors/form/`. The interpreter's field wrappers are a modal-host detail
and go with it.

## The host pass

A host takes the face document and the placement and, for each socket, either **wraps** the
face (a gate reading a carried `visible`; a one-child `stack_panel` host carrying
`collection_index` and the `collection_details` binding for a press) or **replaces** it (a
chest cell over a container slot; a text carrier in place of a static label; a native field
placed by its row index). Nothing outside the sockets is touched.

The **rect guard** proves it: after the host emits, every control's `size`, `offset` and
`anchor_from` / `anchor_to` are diffed against the face document, and any difference is a
build error naming the control and the host. The guard runs in the compile tests and in
`yarn preflight`. *Decided.*

`HostEmit` ([04-hosts](./04-hosts.md)) keeps its shape, with one change of input: `readCarrier`
and `wireInput` receive the socket's face control and return the control that stands in its
place. *Proposed* names.

## Roots

A screen's root names its host, and there is no default. *Decided; done in B1.*

| Root | Host | Entry point |
| --- | --- | --- |
| `<Screen>` | form-action | `render(<Screen/>, player)` |
| `<Form>` | form-modal | `render(<Form/>, player)` |
| `<Container entity>` | chest | `createContainerScreen(<Container/>)` |
| `<Book>` | book, later | `render` |

`render()` refuses any other root with a message naming the three roots; `createContainerScreen()`
refuses anything but `<Container>`; `hostFor` throws instead of falling through to the action
form, and a root below the root is refused whatever it is. A component library never renders
a root: a root is the one element an author writes at the top of a `*.screen.tsx`, and an
embedded page is `<Screen>` around the `<Embed>`.

## One component set, per-host mechanisms

The public set is host-agnostic. Each host maps a component's need to its own mechanism, and
a host that has none refuses the component at build by name, as today. `Form.*` primitives
stop being public: they are the modal host's lowering targets, reached only through the plain
component. Only the roots, `Slot` and `SlotGrid` stay host-specific in public. *Decided.*

The table below is the host's, declared as `mechanisms` on its contract, and it answers both
questions at once: a component asks `useMechanism('Toggle')` and renders what it is told, and
the same table is what the build checks a tree against — a kind the host does not name has
nothing to be there and is refused in the host's own words. The root provides the host to its
subtree, so the question is answered wherever a component sits. *Done in B2.*

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

The one semantic difference between hosts is *when* a value arrives: a modal delivers
`onChange` at submit, with the whole `values` object; the action form on the press that
re-presents; the chest on the poll that saw the change. That is a property of the host's
input kind (`field`, `press`, `slot`) and is documented in the capability matrix, not in the
component.

`ore-styled` therefore drops its seven `Form.*` pairs and keeps one `Toggle`, one `Checkbox`,
one `Radio`, one `ToggleButtonGroup`, one `Slider`, one `Dropdown`, one `Input`. `Form`
remains as the root.

**Host-specific props, typed by the host.** A component is declared once, with the props every
host shares. Where one host takes more — the modal's `name` on a field, the chest's `role` on a
slot — those props are not a second component (`Form.Toggle` beside `Toggle`); they are typed
onto the one component by the host the element sits in. Two ways to know the host: the root
provides it to its whole subtree, so a `Toggle` under `<Form>` is a native field and takes the
modal's `name`; and a component library that renders into a host it does not own opens its
fragment with an expected-host marker (`<Expect host="form-modal">`), which says what it
assumed and fails by name on the wrong screen instead of failing once per field. A component
with no root above it at all is told that, by the kind that noticed. Nothing is declared
twice: the basics, and the combinations the hosts add. *Done in B2.*

TypeScript cannot narrow a component's props by the JSX parent it sits under, so the
host-specific props are declared on the one component and are the host's to enforce: a field
inside a `<Form>` says so when it has no `name`, and a screen of buttons refuses a `Slider`
outright rather than drawing an inert one.

## The gallery

Every screen type is looked at as faces only before any host serves it. The dev profile
(the `development` profile in `packages/resource-pack/config.json`, the one that stamps the
HUD) makes the build write two extra things:

- **A preview per screen.** The face document regenerated under the namespace
  `<ns>_<name>__preview`, written as `<name>.preview.json` and gated on its own title like any
  compiled form screen. Its own namespace because every gated compiled screen is constructed on
  every form open and a name a binding looks up is found screen-wide. Chest screens preview at
  the chest canvas, centred on the form. Nothing in a preview needs an entity, an entry or a
  channel; `Tabs` and `Disclosure` work because they are local. A preview shows the reference
  render: reference strings, reference visibility, fields as static twins.
- **A gallery screen.** `<ns>_gallery`, a compiled screen the filter writes and compiles last:
  a scroll of buttons, one per compiled screen of the addon whatever its root, each opening
  that screen's preview with `showCompiledTitle` and no entries. `openGallery(player)` is
  exported from `@bedrock-core/generated/ui`; a build without the gallery exports one that warns.
  The gallery is itself a face-only screen with presses, which is the same shape a guide home
  and a cross-addon reference have, so `<Link>` replaces its handlers in phase C.

The gallery is the `gallery: true` setting of the ui-compile filter, on in the reference pack's
development profile only, and stays, the way a component storybook does. *Decided.*

## References and navigation

A screen whose content is baked and whose only inputs are presses that open other screens is
**static**: it can be presented by any addon from a table, with no script of its owner
involved. Guides are the first case; the gallery, the addon list's pages and any menu are the
same shape.

- **`<Link to="<ns>:<screen>">`** is a `Button` whose press opens the named screen for the
  pressing player. The build reads the target off the prop, so a reference table needs no
  sentinel player. *Proposed.*
- **The reference feed.** `core-ui/reference` generalises `core-guide/reference`: one record
  per static screen, `{ key, title, entries: [{ target }] }`, published by the owning addon and
  replicated by sync. `@bedrock-core/navigation` gains `navigate('<ns>:<screen>')`, which
  resolves a key against the addon's own compiled screens first and the replicated references
  second, and presents the result. A foreign screen is shown by title with its entries baked
  from the record.
- **Guides on it.** `createGuide` and the manifest path go; `GuidesRegistry` becomes the
  table; `openGuide(ns, player)` is `navigate('<ns>:guide_home')`; the config app's Guide route
  rides the same call. Gating a guide per viewer is a carried `visible` on the compiled screen.
  Breaking, pre-1.0. *Decided.*
- **Generated types.** `@bedrock-core/generated/ui` exports the addon's screen keys as a
  union, so a `navigate` into another addon is typed against what that addon built.
- **`Embed` is a component embed.** An embedded page is a component drawn into the area a
  host leaves for it, not a screen laid over the host's frame. Its canvas is that area:
  `<Embed>` takes the area's size and the tree fills it, so the page holds no coordinate of
  the host's frame and the gallery shows it as its own canvas. Where the area sits inside the
  frame is the host's constant and goes on the mount: the router places an embedded root at
  the area's offset within the centred frame. The contract between the two packs stays the
  area rect and the slot count. *Decided; lands in A4 with the addon-page family.*

## Layout stays the build's

Percentages, `%c` and anchors are not exposed to authors. The flexbox solver is the one source
of geometry and it produces pixel rects against a canvas the host names; JSON UI's relative
sizes appear only where the *engine* has to decide at draw time — a stack sized `100%c` so
hidden rows collapse, a fill of `100%` inside a box the layout already sized. Mixing units
by hand would bring anchors, safe zones and UI scale into every screen, which is exactly what
baking against a 300×200 canvas inside the smallest scale was chosen to avoid. Revisited only
if a host needs a screen-relative canvas, and then as a host property, never a prop. *Decided
for now.*

## Phases

These order the remaining work; the rows in [09-plan](./09-plan.md) stay as the record of
what landed.

| # | Phase | Delivers | Estimate |
| --- | --- | --- | --- |
| A1 | **Face pass** ✅ | `faces.json` per addon; the face document per screen with every socket as its inert face; the static validator; the socket list as the placement's addresses | 5 days |
| A2 | **Gallery** ✅ | the preview mount on the action form; the generated gallery screen; `openGallery`; chest cells as frames | 3 days |
| A3 | **Rect guard** ✅ | the diff after host emit, run inside every compile, so the tests and `yarn preflight` both hit it | 1 day |
| A4 | **Visual pass** ✅ | starts from a clean slate: every demo screen in the reference pack's BP is deleted, and one screen per family is written from scratch as that family is signed off in game, fixes in `ore-styled` only. Families: a chest screen; guide home and one page; the config screens (scope, menu, list, picker, confirm, editor); the addon list and one addon page, with `Embed` reworked to the area (above); one modal with every field kind; one action form with a list and a scroll | 3 days |
| B1 | **Host roots** ✅ | `<Screen>`; `render` and `createContainerScreen` refuse non-host roots; `hostFor` throws instead of falling through | 0.5 day |
| B2 | **One component set** | the mechanism table per host in place of the flat `offers` list; the modal lowers the plain set to native fields; host-specific props typed by the root or an expected-host marker; `Form.*` internal and the `ore-styled` duplicates removed | 2.5 days |
| B3 | **The node layer** | `group`, `states` and `follows` attachable to any primitive; `Tabs`, `Disclosure` and `List` rebuilt on them in the component layer; `field` split into primitives | 3 days |
| C | **References** | `<Link to>`; the reference feed and `navigate('<ns>:<screen>')`; guides on it, `createGuide` deleted; generated key types | 5 days |
| D | **Delete the interpreter** | numbers as sliders on the config editor; serializer, writers, presenters and decoders deleted; state values readonly; pack minor | 3 days |
| E | **Build flow and the book** | the CLI template on the `core` filter; the docs site replaces this folder; then the book host, drawn from faces alone | after D |

After E: fibers mutate the tree in place instead of rebuilding it per render.

A precedes B because faces are what the roots serve, and A4 is the sign-off B builds on. B1
before B2 because the root is what types a subtree; B3 last because it reshapes what B2's
mechanisms attach to. C needs A so that a reference is a key plus baked faces. D closes the
last consumers of the byte protocol.
