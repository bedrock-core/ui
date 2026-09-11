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

`nodes/` holds `primitives/` and `utils/` and nothing else. Every kind is one JSON UI control
type with its static props; the utilities are what more than one lowering reads off an element.
There is no composition layer in the compile — a composition is a component, built out of these.

### Behaviours

A behaviour is client-only logic a primitive carries: still static, still in the face document,
never a mechanism. Four of them, and between them they are every switch the library has.

| Behaviour | What it is | Where |
| --- | --- | --- |
| `route` | a button's mappings: close, submit, form click | `action` on the `button` primitive |
| `group` | swaps that move together, one forced index each | `group` on the `swap` primitive |
| `states` | which children a control draws per state | the `look` primitive, one per state |
| `follows` | a sibling drawn while a swap beside it is on | `follows`, on any node at all |

A swap is the one mechanism a compiled screen owns outright: a toggle changes its own content
with nothing reaching script, on the pack's own form mount and under the modification-inserted
chest mount alike. So everything built on it is free — a tab change, a fold, a choice between
options costs no press, no re-present and no payload.

Content a swap shows lives INSIDE the look, which is what keeps it client-only and what keeps a
look that is not showing from being BUILT — an engine field behind a gate that reads a
collection row which is not there is an assertion, so this is not only an optimisation. Two
things follow from that:

- A look may DRAW a sibling of its swap, which the compile moves inside it, re-based from the
  swap's own corner. For content too big to be solved inside the control that switches to it: a
  tab's pane is the whole box below the headers.
- `follows` is the one read in the other direction, for the one case that cannot nest: a fold's
  rows have to reflow what is under them, and content inside a look has no say over its
  siblings. A stack gives a hidden child no space, which is the reflow.

`Tabs` and `Disclosure` are therefore components — a group of swaps whose panes are drawn, and
one swap with a panel that follows it. `List` needs none of this: it is a stack whose rows a
count mechanism gates, and the count is a mechanism already.

Everything crossing siblings — the group an exclusive swap joins, the swap a `follows` names,
the sibling a look draws — is resolved in the one walk that has the sibling list, because
nothing inside a node can see what sits beside it.

### Fields are primitives

A modal field is two halves and they belong in two layers. An input is a primitive like any
other and has a face — a box, a placeholder, a style — that draws on any screen and in the
gallery. What makes it a *modal* field is the connector: `connectors/form/widget.ts` names the
row the engine's own widget is mounted from and what that row reads, and the modal is the only
host that has one. A host with no connector for a kind refuses it by name, which is the
mechanism table below.

So `field` is five primitives — `toggle`, `slider`, `input`, `dropdown`, `select` — each
carrying its own look, the row it answers on, and the variables its widget reads. The
interpreter's field wrappers are a modal-host detail and live with the connector.

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

`ore-styled` therefore ships one `Toggle`, one `Checkbox`, one `Radio`, one
`ToggleButtonGroup`, one `Slider`, one `Dropdown` and one `Input`, each asking what it becomes
here. `Form` remains as the root, with the submit button that genuinely is modal-only.

A `Checkbox` is a `Toggle` in a different skin — same boolean, square textures, the caption on
the other side — so the two share one implementation. `Slider`, `Dropdown` and `Input` have no
second form at all: no host but the modal offers a mechanism for them, so each is one component
that refuses elsewhere in that screen's own words.

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
  sentinel player. A key with no `<ns>:` in front of it is one of the bundle's own, named as its
  file is — which is how a screen links to a sibling without repeating a namespace it does not
  choose; a published reference carries the addon half filled in. *Built.*
- **The reference feed.** `core-ui/reference` replaced `core-guide/reference`: one record per
  static screen — `{ key, title, values, targets }` — published by the owning addon under
  `core.screens` and replicated by sync. `navigate('<ns>:<screen>')` resolves a key against this
  bundle's compiled screens first and, through whatever `provideReferences` installed, the
  replicated references second; a foreign screen is shown by title with its baked values and
  followed link by link (`presentReference`). The stack is a stack of KEYS — `back()` shows the
  screen navigated from, since a frozen shape cannot be restored, only shown again. *Built.*
- **Guides on it.** `createGuide`, `guideReference` and `presentGuideReference` are gone, and so
  is `core.guides`: a guide's pages are ordinary screens in the ordinary table, and every press
  inside one is a `<Link>`. `openGuide(ns, player)` is a `navigate()`. The way out needs no entry
  at all — the client closes the form and a walk ends with it. Gating a guide per viewer is still
  a carried `visible` on the compiled screen. *Built.*
- **Generated types.** The generated module augments `ScreenKeys` with this addon's keys, so
  `navigate` autocompletes them and a typo is an error, while a key belonging to an addon this
  build has never seen still passes — which it must, since resolving one of those is the point.
  *Built.*
- **`Embed` is a component embed.** An embedded page is a component drawn into the area a
  host leaves for it, not a screen laid over the host's frame. Its canvas is that area:
  `<Embed>` takes the area's size and the tree fills it, so the page holds no coordinate of
  the host's frame and the gallery shows it as its own canvas. Where the area sits inside the
  frame is the host's constant and goes on the mount: the router places an embedded root at
  the area's offset within the centred frame. The contract between the two packs stays the
  area rect and the slot count. *Decided; lands in A4 with the addon-page family.*

## Shaped config screens only exist where the addon is

Found in game 2026-09-11: `[config] no shaped item screen for server list 'bannedItems'`.

A config screen shaped for a schema is compiled into the OWNING addon's pack, and the elected host
draws every addon's config — so the host has a screen for its own lists and none for anybody
else's. The generic editor that preceded them had no such hole: one shape served any schema.

Not decided. The two ways out: a generic list-item editor in the library set, compiled into every
addon and used whenever the owner's shaped screen is not in this bundle; or the host asking the
owning realm to draw its own, which reintroduces the dependency on the owner's realm being alive
that references exist to remove. The same question is coming for every shaped screen, not just the
list item — this is only where it surfaces first, because a list item is the one editor a section
cannot draw inline.

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
| B2 | **One component set** ✅ | the mechanism table per host in place of the flat `offers` list; the modal lowers the plain set to native fields; host-specific props typed by the root or an expected-host marker; `Form` keeps only its root and submit button, and `ore-styled` ships one of each control | 2.5 days |
| B3 | **The node layer** ✅ | `swap` and `look` primitives with `group`, `states`, `follows` and a look that draws a sibling; `Tabs` and `Disclosure` rebuilt on them as components; `field` split into five primitives with the modal's wiring in its connector | 3 days |
| C | **References** ✅ | `<Link to>` (and `to` on ore-styled's `Button`/`MenuRow`); `core-ui/reference` as `core.screens`, replacing `core.guides`; `navigate('<ns>:<screen>')` with a per-player stack of keys and `back()`; guides on it — `createGuide`, `guideReference` and `presentGuideReference` deleted; `ScreenKeys` augmented by the generated module | 5 days |
| D | **Delete the interpreter** ✅ | numbers as sliders on the config editor; the serializer, the presenters and the runtime's tree description deleted — `render()` refuses a screen the build never compiled; state values readonly (`Immutable<T>` from `useState` / `useReducer`); the pack minor follows the meta minor at release, which the release script does | 3 days |
| E | **Build flow and the book** | the CLI template on the `core` filter; the docs site replaces this folder; then the book host, drawn from faces alone | after D |

After E: fibers mutate the tree in place instead of rebuilding it per render.

A precedes B because faces are what the roots serve, and A4 is the sign-off B builds on. B1
before B2 because the root is what types a subtree; B3 last because it reshapes what B2's
mechanisms attach to. C needs A so that a reference is a key plus baked faces. D closes the
last consumers of the byte protocol.
