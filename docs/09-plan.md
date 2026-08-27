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
| 2 | **Form host spike** (in game, throwaway) | title-key mount gate; static control with baked `collection_index` on `form_buttons` producing `selection`; a one-field entry decoded with one binding; modal field with an entry as its label; local toggle group under the form mount and under the chest mount | 2–3 days |
| 3 | **Form hosts** — *liveness probing landed early, see below* | `form-action` and `form-modal` contract / emit / runtime; the base baked, layout islands re-solved at runtime; `ui.generated.json`; `render()` routing by name; encoding `1` with `ENCODING_MIN/MAX`; reference addon screens compiled | 2 weeks |
| 4 | **Vocabulary** | `core_ui_shapes`; chest files renamed under `core_ui_chest`; form carriers and mount; the chest geometry carrier; `protocol.json` windows; `debug` diff | 1 week |
| 5 | **Consumers, then delete legacy** | `List max`, `Tabs`; the guides filter emits IR and pages compile as screens with a replicated reference table; config and the addon list on compiled `List max` screens; the interpreter fallback and its decoders deleted; pack minor | 2 weeks |
| 6 | **Build flow** | the single `core` filter; CLI template; docs site pages replace this folder | 4 days |
| 7 | **Next host** | the book: findings page, contract, emit, runtime, vocabulary | after 6 |

Phases 1 and 2 can run in parallel. Nothing in 3+ starts before 2 has measured its five items.

## Landed ahead of its phase

**Liveness probing** (`core/ir/probe.ts`, phase 3's analysis half). It needs no spike answer — it works on the built tree, not on JSON UI — so it shipped with phase 1. The build renders a screen once for the reference, then again with each `useState` / `useReducer` slot perturbed, and reports what moved: a baked `<Text>` that a state change rewrites, and a state change that adds, drops or reorders a cell. `compileScreen` turns both into build errors naming the observed strings and the `maxLength` to declare.

Two exclusions, both principled: live text already reserved its cells, and a `<Button>`'s children ARE its face — baked by definition, which is why live text inside one is refused outright. The second was found by running the probe against the reference addon, where ore-styled colours a caption by `enabled`; reporting that would have fired on nearly every styled button for behaviour the docs already state.

What it still cannot do is the rest of [03-ir](./03-ir.md): every prop gets a binding class, capacities are inferred where a host needs one, and the runtime `debug` diff catches what the probes missed. Those wait for carriers to exist on more than text.

## Spikes (Measure)

| # | Question | Blocks |
| --- | --- | --- |
| S1 | Does a pack-owned control with `collection_details` + baked `collection_index` on `form_buttons`, outside vanilla's factory, fire `button.form_button_click` and land in `response.selection`? | the form-action host |
| S2 | Does a `server_form` content re-declaration gated on a title key coexist with the legacy gate, on desktop and pocket? | the form mount |
| S3 | Can a `ModalFormData` field's label carry an entry that a compiled control reads by index, and do decorative rows without `label()` leave `formValues` aligned? | the form-modal host |
| S4 | Does a toggle group with sibling panels gated on `#toggle_state` work (a) on the pack-owned form mount, (b) under the modification-inserted chest mount? | local `Tabs` |
| S5 | Is a compiled cell with zero decode bindings and a literal rect measurably cheaper to open than the interpreter's cell, at 50 and 200 cells? | the perf claim; sets the numbers in the docs |
| S6 | Can an island's rect be written at runtime — on a form as entry digits bound to `#size_binding_x` / `use_anchored_offset`, on the chest as a durability value on a non-stackable — and does the engine re-lay a control whose size binding changed while the screen is open? | runtime layout islands; the chest geometry carrier |

Each spike is a hand-written RP file plus a ten-line script, recorded in a findings page whichever way it goes.

## Open questions

- **Guides — decided.** The guides filter emits the UI IR directly (MDX → IR, no block manifest in between); every page compiles into the owning addon's RP as a form-action screen, and a page's buttons navigate by opening another page's key. Cross-addon only a **reference** replicates over `@bedrock-core/sync`: the home key and, per page, the key each button opens — never the prose. Any realm can present another addon's guide from that reference alone: title = the key, `selection` → the next key, no script of the owning addon involved. `GuidesRegistry` shrinks from the manifest to the reference table; `createGuide` becomes navigation over compiled page keys.
- **Config — pick one.** The problem: realm A (the host election) draws addon B's config screen, but a compiled screen's shape is fixed when A is built, and B's schema only arrives at runtime over sync. Two ways out:
  1. *One generic screen, compiled by the renderer* (**decided**). A compiles a config screen of `List max` rows; each row holds the four field kinds gated by a carried enum, with the label and the value carried. Any schema fills it at runtime. Keeps today's property — the newest runtime draws everyone's config — and replicates nothing new. On form-modal the native fields are built per present anyway, so the row set is naturally dynamic on the engine side; only the decoration is compiled.
  2. *Each addon compiles its own config screen* (its schema is a plain object it can import at build) and A forwards the open. A simpler runtime, but a year-old addon shows year-old config screens — the property the config package exists to avoid.
- **Foreign-language wrapping on compiled forms.** A localized label that wraps gets a client-sized box (`text_wrap` exists today). Whether the box's height can be reserved without server measurement is a layout question for phase 3.
- **The chest's `enum` carrier.** N gated images on one stack size is the obvious encoding; whether it is worth a node kind of its own or a lowering of `image` with `values` is decided when the first screen needs it.
