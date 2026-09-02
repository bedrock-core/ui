# 06 — The render pack as a vocabulary

Today the render pack is an **interpreter**: every form entry instantiates the whole router subtree (about 19 controls across the variants, times the mounted scroll-pool clones), gates on `#type`, and runs ~28 string-slice bindings to decode geometry it could have been told. In v2 the pack ships a **vocabulary** — definitions with defaults that compiled screens reference by name — and the per-screen JSON UI lives in the addon's own resource pack, generated at build.

## Two families of definitions

The split follows two measured rules:

- A derived control's `bindings` array **replaces** its base's; nothing merges (`common/control.json`).
- A `$variable` inside a `source_property_name` is dropped in a subtree inserted through `modifications` (`findings.md`, six variations). On a definition the pack owns outright, variables in bindings work (the form decoders use `$type_gate`).

So:

| Family | Namespace | Has bindings? | Extended by | Examples |
| --- | --- | --- | --- | --- |
| **Shapes** | `core_ui_shapes` | never | reference with `$var` overrides for static props | `panel`, `nineslice`, `label`, `button_face` (4 state textures), `scroll` (viewport + track), `cell_frame`, `bar` |
| **Carriers** | `core_ui_<host>` | yes — the whole chain, literal | emitted per screen as a literal definition, one per binding *shape*, deduplicated by signature (today's `textSignature` / `faceSignature`) | chest: `slot_host`, `cell`, `text_host`, `gated_item`, `output_slot`; form: `entry_host`, `entry_bool`, `entry_text` |
| **Mounts** | `core_ui_<host>` | yes | never — the pack owns the mount and the router root | chest: `chest_root`, `chrome`; form: the `server_form` re-declaration |

A compiled screen references shapes for everything static and emits its own carrier definitions for everything live. A screen with no live values references the pack and emits nothing of its own beyond its tree.

Shapes are **leaves**. A derived control's `controls` array replaces its base's like `bindings` does, so a shape never declares children a compiled screen would have to extend; a face with content is a compiled panel *composing* four `nineslice` shapes and a content panel, not a shape inheriting one. The example in [example/](./example/README.md) shows the composition.

*Decided.* Names *Proposed*. Every minted namespace keeps the `core_ui_` prefix.

## Rules every emitter obeys

Measured, and kept from today's emitter comments:

1. `collection_index` is accepted only on a direct child of a control declaring `collection_name`, and that is legal only on `stack_panel` and `grid`. Anything reading a collection gets a one-child `stack_panel` host.
2. No `$variable` in a binding expression under a modification-inserted subtree. Literals only; parameterise through references.
3. Explicit pixel sizes under a host. Percentages along a stack panel's axis resolve unreliably.
4. `keep_ratio: false` on stretched images.
5. `localize: false` on literal labels; `localize: true` with a key for localized ones.
6. Never insert into an array the target definition only inherits — the insert shadows the inherited array (the plain-chest killer). Re-declare the screen instead, as the chest hook does.
7. `modifications` resolve per file path; hooks live at vanilla's own path, define nothing, and stack across packs.
8. A binding expression uses `+ - *`, `=`, `not`, `and`, `or`; never `/`, `>=` or an empty literal. `#inventory_stack_count` is a string inside an expression. An ordering comparison (`>`) over a coerced entry string drew nothing; compare with `=` and enumerate.
9. A `remove` of an inherited child drops the whole file silently. Hide with a binding instead.
10. No `#size_binding_*` under a modification-inserted subtree — seed and binding alike are inert there, and every compiled screen is one. A runtime-variable extent is a `stack_panel` whose children hide: an invisible child takes no space, static or bound.
11. Every `scroll_view` sets `allow_scroll_even_when_content_fits: false`, and compiled scroll content is never shorter than its viewport (precautionary; measured innocent of the assertion below).
12. **A control behind a runtime gate is still CONSTRUCTED, and its components still run — and `binding_condition: "visible"` does NOT save it.** Every compiled screen's tree exists on every form screen, hidden by its title gate — so a `slider` whose value/steps rode collection bindings read rows that do not exist there, stomped its safe seeds, and raised `Progress out of range` (`SliderComponent::_setPercentage`), a Marketplace-blocking assertion, on every form open in the world. Found by a strict removal bisect after three wrong scroll theories; `binding_condition: "visible"` on those bindings did not stop a control hidden by an ANCESTOR gate from evaluating them. The rule: a compiled control feeding an ENGINE COMPONENT's numeric state (a slider's value, not a look) carries NO collection bindings at all — its `bindings` array replaces the base's with `[]` and the values are BAKED into `property_bag` (`slider_control_compiled`: steps from min/max/step, starting value from `defaultValue` as a step index). The engine's own `slider_name`/`slider_collection_name` machinery still seeds from the form data, owns the drag, and writes back.
13. `$variables` DO substitute inside `property_bag` values in a definition mounted under a modification-inserted subtree (probe `BAGOK`, 2026-09-02) — unlike binding expressions (rule 2), bag entries are ordinary properties. Baked bag seeds can therefore be parameterised through mount `$variables`.
14. **Every control name referenced anywhere must resolve** — `dropdown_area`, `*_control` pointers, and the like. An unresolvable name is `Control name could not be resolved` (`UIControl::_resolveControlNames`), an assertion and therefore a Marketplace rejection, even where the no-host fallback renders exactly what was wanted. Point such references at a real zero-size, invisible dead-end control instead (the inline select's `inline_offscreen_area`).

## Versioning — a window, as in `@bedrock-core/sync`

Two numbers are the contract between an addon's compiled screens and the render pack. Both move by the sync protocol's rule (`PROTOCOL_MIN` / `PROTOCOL_MAX`): a **range** is supported, the newest version both sides know is used, and raising the minimum is a breaking change.

| Number | What it versions | Carried in | Moves when |
| --- | --- | --- | --- |
| **Encoding** `E` | how live fields are packed into an entry's text and the title | the title header, `core` + `E`, on every form present | a padding is removed, a field width changes, a carrier type is packed differently |
| **Vocabulary** `V` | the definitions the pack ships and their `$var` names | the generated screen file header and `ui.generated.json` | a shape or carrier is added (minor) or changed (major) |

- `packages/resource-pack/protocol.json` declares `encoding: { min, max }` and `vocabulary: { min, max }` next to the pack version and hash it carries today; the pack description prints both ranges where a player can read them.
- `ui-runtime` exports `ENCODING_MIN` / `ENCODING_MAX`. A compiled screen emits at the newest encoding the pack it was built against decodes (recorded in `ui.generated.json`); the form mount routes on the header to the decoder generation for that `E`. The window is two versions wide: an encoding stays decodable for two pack minors after it stops being the newest, then the minimum rises in a pack major.
- A screen whose `V` or `E` is outside the pack's window falls through to the vanilla form or the vanilla chest, and the runtime `debug` log names the versions on both sides. Nothing renders garbage.
- The legacy byte protocol stays exactly `bcuiv0008`, decoded by the interpreter fallback until it is deleted. Removing its paddings is not a version of it; it is encoding `1` of the compiled family, which carries no padding to begin with because a compiled cell knows its own fields.

*Decided.*

## What is deleted from the pack, and when

| File | Fate |
| --- | --- |
| `common/control.json`, `label_router`, `button_router`, `header_router`, `state.json`, `components/{button,text,image}.json`, `screens/scroll*.json`, `form_components/*` | legacy interpreter — deleted when the last consumer compiles ([09-plan](./09-plan.md)) |
| `container/*.json` | become `core_ui_chest` carriers and mounts, mostly renamed |
| `chest_screen.json` hook, `server_form.json` | mounts; `server_form.json` gains the compiled-screen gate |
| new `shapes.json` | the shapes family |
