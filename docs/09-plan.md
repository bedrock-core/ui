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
| 3 | **Form hosts** — *in progress: placement + title contract done* | `form-action` and `form-modal` contract / emit / runtime; the base baked, layout islands re-solved at runtime; `ui.generated.json`; `render()` routing by name; encoding `1` with `ENCODING_MIN/MAX`; reference addon screens compiled | 2 weeks |
| 4 | **Vocabulary** — *`core_ui_shapes`, `core_ui_chest` and the form mount done* | ~~`core_ui_shapes`~~; ~~chest files renamed under `core_ui_chest`~~; ~~the form mount~~; form carriers; the chest geometry carrier (S6); `protocol.json` windows; `debug` diff | 1 week |
| 5 | **Consumers, then delete legacy** | `List max`, `Tabs`; the guides filter emits IR and pages compile as screens with a replicated reference table; config and the addon list on compiled `List max` screens; the interpreter fallback and its decoders deleted; pack minor | 2 weeks |
| 6 | **Build flow** | the single `core` filter; CLI template; docs site pages replace this folder | 4 days |
| 7 | **Next host** | the book: findings page, contract, emit, runtime, vocabulary | after 6 |

Phases 1 and 2 can run in parallel. Phase 3 was gated on S1, which is now answered — the rest of the spikes gate later phases, not that one.

## Landed ahead of its phase

**Liveness probing** (`core/ir/probe.ts`, phase 3's analysis half). It needs no spike answer — it works on the built tree, not on JSON UI — so it shipped with phase 1. The build renders a screen once for the reference, then again with each `useState` / `useReducer` slot perturbed, and reports what moved: a baked `<Text>` that a state change rewrites, and a state change that adds, drops or reorders a cell. `compileScreen` turns both into build errors naming the observed strings and the `maxLength` to declare.

Two exclusions, both principled: live text already reserved its cells, and a `<Button>`'s children ARE its face — baked by definition, which is why live text inside one is refused outright. The second was found by running the probe against the reference addon, where ore-styled colours a caption by `enabled`; reporting that would have fired on nearly every styled button for behaviour the docs already state.

What it still cannot do is the rest of [03-ir](./03-ir.md): every prop gets a binding class, capacities are inferred where a host needs one, and the runtime `debug` diff catches what the probes missed. Those wait for carriers to exist on more than text.

## Spikes (Measure)

| # | Question | Blocks |
| --- | --- | --- |
| ~~S1~~ | **Answered 2026-08-27: yes, both halves** — see [spikes/S1](./spikes/S1-form-entry.md). A placed control owns an entry when THE CONTROL ITSELF carries a `collection_details` binding on `form_buttons`; an ancestor supplying the index is not enough, and the failure is a press that reads as a dismissal. | ~~the form-action host~~ — unblocked |
| ~~S2~~ | **Folded into phase 3.** S1 mounted a placed subtree in `action_container` with no vanilla edit at all, and `main_screen_content` already gates the library's container on the header — so a compiled screen needs no `server_form` re-declaration. | — |
| S3 | Can a `ModalFormData` field's label carry an entry that a compiled control reads by index, and do decorative rows without `label()` leave `formValues` aligned? | the form-modal host |
| S4 | Does a toggle group with sibling panels gated on `#toggle_state` work (a) on the pack-owned form mount, (b) under the modification-inserted chest mount? | local `Tabs` |
| S5 | Is a compiled cell with zero decode bindings and a literal rect measurably cheaper to open than the interpreter's cell, at 50 and 200 cells? | the perf claim; sets the numbers in the docs |
| S6 | Can an island's rect be written at runtime — on a form as entry digits bound to `#size_binding_x` / `use_anchored_offset`, on the chest as a durability value on a non-stackable — and does the engine re-lay a control whose size binding changed while the screen is open? | runtime layout islands; the chest geometry carrier |

Each spike is a hand-written RP file plus a ten-line script, recorded in a findings page whichever way it goes.

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
