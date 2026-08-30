# 09 — Plan

## 1.0 first

1.0 ships the **authoring API** on today's two backends, with the changes that would be breaking later made now:

1. Every handler takes the event object ([05-components](./05-components.md)). `onPress(e)`, `onInsert(e)`, `onRemove(e)`, `onOpen(e)`, `onClose(e)`, `onSubmit(e)`, `onCancel(e)`.
2. `registerComponent` and custom native components are documented as **experimental**: the contract changes in v2.
3. `Text maxLength`, `Slot`, `SlotGrid`, `Container`, `Form.*`, hooks, navigation, i18n, guides, config: frozen as they are.

Pack `2.0` accompanies library `1.0` by the existing rule (pack major = library major + 1). v2 of the internals then lands as library `1.x` minors and pack `2.x` minors as long as the authoring API holds — which is the point of freezing it first.

## Phases

| # | Phase | Delivers | Estimate |
| --- | --- | --- | --- |
| 0 | **1.0 freeze** ✅ | event object across both backends; experimental flag on `registerComponent`; release still to cut | done |
| 1 | **Seam refactor, no behaviour change** ✅ | `core/ir/` (`analyze`, the shared `claim` walk, `validate`); `hosts/` registry — `chest`, `form-action`, `form-modal` — picked by the root the author wrote; needs/offers replaces both validators; `container/*` moved under `hosts/chest/`. **Remaining:** re-run the in-game checklist | done |
| 2 | **Form host spike** (in game, throwaway) — S1 ✅, S2 folded in | title-key mount gate; static control with baked `collection_index` on `form_buttons` producing `selection`; a one-field entry decoded with one binding; modal field with an entry as its label; local toggle group under the form mount and under the chest mount | 2–3 days |
| 3 | **Form hosts** ✅ | `form-action` and `form-modal` contract / emit / runtime; the base baked (runtime layout islands parked with S6); `ui.generated.json`; `render()` routing by name; encoding `1` with `ENCODING_MIN/MAX`; reference addon screens compiled (`counter`, `settings`, `tabs`). **Remaining:** the in-game pass | done |
| 4 | **Vocabulary** — *`core_ui_shapes`, `core_ui_chest` and the form mount done* | ~~`core_ui_shapes`~~; ~~chest files renamed under `core_ui_chest`~~; ~~the form mount~~; form carriers; the chest geometry carrier (S6); `protocol.json` windows; `debug` diff | 1 week |
| 5 | **Consumers, then delete legacy** | `List max`, ~~`Tabs`~~ (landed with phase 3); the guides filter emits IR and pages compile as screens with a replicated reference table; config and the addon list on compiled `List max` screens; the interpreter fallback and its decoders deleted; pack minor | 2 weeks |
| 6 | **Build flow** | the single `core` filter; CLI template; docs site pages replace this folder | 4 days |
| 7 | **Next host** | the book: findings page, contract, emit, runtime, vocabulary | after 6 |

Phases 1 and 2 can run in parallel. Phase 3 was gated on S1, which is now answered — the rest of the spikes gate later phases, not that one.

## Landed ahead of its phase

**Liveness probing** (`core/ir/probe.ts`, phase 3's analysis half). It needs no spike answer — it works on the built tree, not on JSON UI — so it shipped with phase 1. The build renders a screen once for the reference, then again with each `useState` / `useReducer` slot perturbed, and reports what moved: a baked `<Text>` that a state change rewrites, and a state change that adds, drops or reorders a cell. `compileScreen` turns both into build errors naming the observed strings and the `maxLength` to declare.

Two exclusions, both principled: live text already reserved its cells, and a `<Button>`'s children ARE its face — baked by definition, which is why live text inside one is refused outright. The second was found by running the probe against the reference addon, where ore-styled colours a caption by `enabled`; reporting that would have fired on nearly every styled button for behaviour the docs already state.

What it still cannot do is the rest of [03-ir](./03-ir.md): every prop gets a binding class, capacities are inferred where a host needs one, and the runtime `debug` diff catches what the probes missed. Those wait for carriers to exist on more than text.

**`Tabs`** (phase 5's consumer). S4's answer made it a pure lowering — a radio toggle group whose panes swap on the client, nothing reaching script — so it landed with the form hosts instead of waiting. Every pane is baked, which is paid in pack size and nothing at runtime; a serialized screen refuses `<Tabs>` outright, because there the same shape would cost every pane's payload on every open. It is a real layout box, not a transparent group: registering it transparent flattened the panes onto the header row.

## Spikes (Measure)

| # | Question | Blocks |
| --- | --- | --- |
| ~~S1~~ | **Answered 2026-08-27: yes, both halves** — see [spikes/S1](./spikes/S1-form-entry.md). A placed control owns an entry when THE CONTROL ITSELF carries a `collection_details` binding on `form_buttons`; an ancestor supplying the index is not enough, and the failure is a press that reads as a dismissal. | ~~the form-action host~~ — unblocked |
| ~~S2~~ | **Folded into phase 3.** S1 mounted a placed subtree in `action_container` with no vanilla edit at all, and `main_screen_content` already gates the library's container on the header — so a compiled screen needs no `server_form` re-declaration. | — |
| ~~S3~~ | **Answered 2026-08-28: yes, both halves** — see [spikes/S3](./spikes/S3-modal-entry.md). A placed control owns a `custom_form` row on S1's terms, and `custom_form` / `formValues` are aligned one-to-one with `null` for rows that carry no value. One index space, counted over every row including decoration. | ~~the form-modal host~~ — unblocked |
| ~~S4~~ | **Answered 2026-08-28: yes, both mounts** — see [spikes/S4](./spikes/S4-toggle-group.md). A radio toggle group swaps its panels with nothing reaching script, on the pack's form mount and under the modification-inserted chest mount alike. A tab's content lives inside its toggle's `checked_control`, so nothing outside observes the state. | ~~local `Tabs`~~ — unblocked |
| ~~S5~~ | **Answered 2026-08-28** — see [spikes/S5](./spikes/S5-compiled-cost.md). Interpreted server work per open: **14 ms at 50 cells, 53 ms at 200** (~0.27 ms/cell). Compiled: zero. The CLIENT-side draw cost stays unmeasured and must not be given a number. | ~~the perf claim~~ — numbers in hand |
| S6 | **Half A answered; half B PARKED unmeasured** — see [spikes/S6](./spikes/S6-runtime-rect.md). A rect can come from a binding, and `#size_binding_*` are 0–1 fractions of the control's own size. Whether a bound size RE-LAYS while the screen is open is still unknown: the harness crashed the client twice on a chest screen. Nothing is blocked today — the design already treats a compiled base as complete before it is shown. | runtime layout islands; the chest geometry carrier |

Each spike is a hand-written RP file plus a short script, recorded in a findings page whichever way it goes — a "no" is worth the same as a "yes". Each is deleted, with its mount and its script, the moment its page is written.

S4(b) and S6 mount into the chest root **ungated**: the chest is claimed by an item rather than a title, so while those two are installed they draw on every compiled chest screen. Deliberate, and the reason they go as soon as they are read.

## Measured while building phase 3

Three engine facts, all found by opening a compiled form rather than by reasoning:

1. **`enabled` on a button stops nothing.** Bound false, the button still handed its press to script and drew no disabled look. A disabled button has to have no button in it at all — which is the shape the chest host already used, for a reason I had read as chest-specific and is not.
2. **A button draws only the child its `*_control` names.** A caption beside the state controls is never drawn; it belongs inside each face. And it needs a layer above the face, because being later in `controls` does not put it on top.
3. **`host.compiled` was two questions wearing one name.** It meant "this host's layouts are always baked", and `buildTree` used it to decide whether live text reserves its full width. A compiled FORM is the first screen where "the host is compiled" and "this layout is frozen" differ — so live text hugged its first value and ellipsised the moment the count reached two digits.

   Split and swept. `buildTree` takes the answer and hands it to `validate`; the contract keeps `compiled` only as the *default* for callers that do not say. Every other reader was checked, and three were the same bug unfired:

   - The two rules that refuse a live `<Text maxLength>` and a `<SlotGrid>` inside a button asked the host, so a compiled form would have **baked a live string into a shared face definition** and drawn its build-time value forever — the exact failure the chest rule exists to prevent, on a screen the rule never looked at.
   - The nested-`<Scroll>` rule the same way: a compiled form lays regions out flat too.
   - The `<Container>`-placement rule and `requireOwner` were never about baking at all; both ask `host.id === 'chest'` now, which is what they meant.
   - `render()`'s **supersede** path built its background rebuilds without the flag, so a compiled screen that replaced a live one lost the frozen layout on every rebuild after the first.

4. **The close button had bug 2 as well.** `<Button onPress={useExit()}>` put its caption beside the state controls, so a labelled close button was blank. The chest's demo uses a texture-only X, which is why it went unseen. Fixed where the kind is lowered, so it holds on every host.

## Hiding the transport is not an author's decision

Found in game: pressing a button showed a repeating command block in the first hotbar slot for a tick, and the pointer flashed for players not using a gamepad.

Three separate holes, one cause each:

1. **`hideOwned` was opt-in.** `<PlayerInventory>` and `<Hotbar>` set it; a bare `<SlotGrid>` over the same collection did not, and a foreign `<Slot>` had no way to ask at all. But the transport is the LIBRARY's mechanism — a press auto-places it into whichever of the player's slots is free — so nobody writing a screen should have to know it exists to keep it from being drawn. The gate now follows the collection: any cell over `inventory_items` or `hotbar_items` hides it, grid or slot. `hideOwned` remains for asking over some other collection.
2. **The cursor preview drew the selected item directly**, the one place an item is drawn without going through a grid cell, so `gated_item` never covered it. It carries the same gate now.
3. **A binding decides visibility from the frame it first resolves, not the frame the control is created.** An unseeded control draws until then. Seed direction is a judgement each time: the item preview seeds VISIBLE (a broken binding should leave a working preview), the pointer seeds HIDDEN (a frame-late pointer is unnoticeable; a flash is not).


## What the spikes have settled

- **S1** — a placed control owns a `form_buttons` entry when it carries its own `collection_details` binding.
- **S3** — the same holds on `custom_form`: a placed control reads a modal row by baked index. The alignment half (`formValues` has a `null` slot per decorative row) turned out to be **already documented in `core/writers.ts` and already handled by the interpreter** — it should never have been a spike. A form-modal compiles over ONE index space counted across every row, decoration included.
- **S4** — a radio toggle group swaps content with nothing reaching script, on both mounts. `Tabs` costs nothing wherever it is drawn, and client-side toggle state crosses the `modifications` boundary intact.
- **S6** — parked without an answer, after seven rounds and two client crashes. What it did produce: `#size_binding_x` / `#size_binding_y` are 0–1 fractions of a control's own declared size, not pixels; and a bound size under `use_anchored_offset` inside a collection cell crashes the client on a chest screen.
- **S5** — an interpreted screen costs 14 ms of server work at 50 cells and 53 ms at 200, every time it is opened. A compiled one costs nothing. That is the case for compiling, in numbers.

Nearly every failed round failed on the HARNESS rather than the engine, and they all failed the same way: **a control driven by a mechanism nobody had read the whole of.** A toggle with two of its eight state controls vanished on hover and took no press. Two `render()` calls in a row superseded each other, so a timing measured a swap. A nearest-entity search found the player, who has an inventory component and is always closest to themselves. A bar was written to the container slot the whole screen's claim gate reads. A size property that takes a 0–1 fraction was fed a pixel count for four rounds.

None of that is a finding about Minecraft. All of it is the cost of writing a harness from memory instead of from the working definition sitting beside it — `core_ui_form_components.toggle_base`, `core_ui_chest.stack_count_label`, `core_ui_common.control` — or from the JSON UI knowledge base, where the fraction rule is written down plainly. **Copy what works; do not reason about what ought to.**


## The compiled modal, and why the generator went away

A compiled modal places every native field ITSELF, with a literal `collection_index` on `custom_form`. It does not use vanilla's row factory at all.

The first attempt did, and it could not work. A factory instantiates one control per row and lays them out on its own pitch, so a compiled screen had no say in where a field went — the decoration sat where the author put it and the fields sat 24 texels apart, and the two disagreed by construction. Placing them instead:

- puts a field exactly where the layout put it, which is the whole point of compiling the layout;
- costs one control per field the screen has, rather than the factory's machinery over the collection.

The rule it rests on is S1's, measured again on `custom_form` in S3: **a control the pack places owns a collection entry when it carries a literal `collection_index` under a host declaring the collection, plus its own `collection_details` binding.** Having measured that twice and then reached for a generator anyway is the mistake worth remembering.

`allocateModal` is the single definition of what a row is. The build numbers fields with it, the runtime writes rows with it, and the emitted index is baked against it — three walks that must agree, over one function that cannot disagree.

**The fields are styled by replacing the decode, not the control.** Every one of the library's field controls decodes its look out of `#custom_text`, which a compiled screen sends empty. Vanilla's own rows are no way out — each draws its own caption inside its own rect, and its slider renders `"<label>: <value>"`, a stray `: 7` beside a bare label. So the toggle mounts a payload-free twin (`compiled_toggle`), and the slider, input and dropdown mount the interpreter's own wrappers — the `@core_ui_common.control` variants, never a piece from inside one — with the decode replaced: geometry, faces and label scale arrive as `$variables` from the author's props, and the dropdown mounts a popup of its own because the shared one gates on a `#type` no compiled cell sends.

Three rules paid for in rounds. A `$variable` set where a control is MOUNTED does not reach a definition it merely references by name — that definition resolves its own scope and sees its own `|default` — so every hop restates what it forwards. The slider sizes FOUR boxes from the payload (travel area, track, hover track, thumb), so all four take literals or each measures 0×0 and everything beneath it vanishes — which is why it stayed invisible through two rounds of fixing its textures. And a static control and the decode CANNOT share one definition: a view binding that writes a `#property` overrides the literal property with whatever the empty payload yields. It cost three rounds in three costumes — the slider's statics kept decode bindings beside literal textures and drew nothing; the shared label's group decode wrote `#font_scale_factor` over the mount's `$scale` and drew the input's text at half size; the popup background's decode blanked its given surface. The shape that survives is a payload-free twin (`static_face`, `label_static`, `dropdown_popup_background_static`) — and where the engine finds a control BY NAME (`text_control`, `background_control`), `ignored` does not take the other path's copy out of the lookup, so each path names its own and the mount swaps the name.

**The dropdown popup is the compiler's to place.** The interpreted popup rides `modal_container`'s `popup_overlay` factory — one `dropdown_popup_router` per row, each decoding what it needs from its row's payload. A factory cannot pass per-row `$variables` and a compiled row has no payload, so those routers instantiate on a compiled screen and never open. The compiled screen instead emits its own router per dropdown cell at the screen root (`overlay` on `HostEmit`), baked with the cell's row index, `$compiled`, `$open_gate: "#custom_dropdown"` (only a dropdown row has an open-state channel; the `#type` half of the shared gate reads a payload that never arrives), the popup surface and `FormDropdown.popupHeight`. At the ROOT, never inside the cell: the one attempt to mount the popup inside the native dropdown's own subtree crashed the client — the names in there are the engine's to resolve.


## Open questions

- **Guides — decided.** The guides filter emits the UI IR directly (MDX → IR, no block manifest in between); every page compiles into the owning addon's RP as a form-action screen, and a page's buttons navigate by opening another page's key. Cross-addon only a **reference** replicates over `@bedrock-core/sync`: the home key and, per page, the key each button opens — never the prose. Any realm can present another addon's guide from that reference alone: title = the key, `selection` → the next key, no script of the owning addon involved. `GuidesRegistry` shrinks from the manifest to the reference table; `createGuide` becomes navigation over compiled page keys.
- **Config — pick one.** The problem: realm A (the host election) draws addon B's config screen, but a compiled screen's shape is fixed when A is built, and B's schema only arrives at runtime over sync. Two ways out:
  1. *One generic screen, compiled by the renderer* (**decided**). A compiles a config screen of `List max` rows; each row holds the four field kinds gated by a carried enum, with the label and the value carried. Any schema fills it at runtime. Keeps today's property — the newest runtime draws everyone's config — and replicates nothing new. On form-modal the native fields are built per present anyway, so the row set is naturally dynamic on the engine side; only the decoration is compiled.
  2. *Each addon compiles its own config screen* (its schema is a plain object it can import at build) and A forwards the open. A simpler runtime, but a year-old addon shows year-old config screens — the property the config package exists to avoid.
- **Foreign-language wrapping on compiled forms.** A localized label that wraps gets a client-sized box (`text_wrap` exists today). Whether the box's height can be reserved without server measurement is a layout question for phase 3.
- **The chest's `enum` carrier.** N gated images on one stack size is the obvious encoding; whether it is worth a node kind of its own or a lowering of `image` with `values` is decided when the first screen needs it.

## Vocabulary, as it now stands

A namespace answers "whose mechanism is this?", and the answer is one of three:

| Namespace | Owns |
| --- | --- |
| `core_ui_shapes` | Controls that are the same wherever they are drawn: no collection, no bindings, nothing about transport. The scrolling region is the first — it clips and scrolls, and does so identically on a chest and on a form. |
| `core_ui_chest` | The chest host's mechanism: item cells, slot buttons, the text host that spells a string one glyph at a time, the renderer that hides the transport item, the chrome. |
| `core_ui_form` | The form host's mechanism: the mount, and the gate that decides between a compiled screen and the interpreter. |

`core_ui_router` is deliberately not renamed: it is the insertion point every addon's emitted router extends, not a file of the chest's own.

### A namespace the compiler emits is a contract

Renaming `core_ui_container` broke a **deployed** addon the moment the render pack updated — found by opening its chest screen in game, not by any test. An addon compiles its screens once and ships them; they keep referencing what they were built against for as long as that pack exists, and the library cannot rebuild them. The engine's report gives no hint of the cause: the `@`-base stops resolving, so the control has no type at all, and what it complains about is `size` and `offset` being *unknown properties*.

Only two packs were on the old format and both were rebuilt, so no compatibility shim ships — the rename stands as a clean break. It was affordable only because every affected pack was reachable, which is the exception rather than the rule.

The rule this leaves: **anything the compiler writes into someone else's pack — a namespace, a definition name, a title format, a byte offset — is versioned or aliased, never renamed in place.** The encoding window already does this for titles; namespaces now do it too.

The scroll started in the chest's namespace only because the chest was the only host there was — which is what a shared vocabulary is for. Moving it also surfaced a latent bug: `scrollLimit` is the interpreter's pool cap, so a compiled form with three scrolls compiled clean and threw the first time a player opened it.
