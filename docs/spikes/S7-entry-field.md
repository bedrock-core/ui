# S7 — which of a form entry's two strings carries a value

**Status: answered 2026-09-13. The TEXT carries anything the icon can, and one thing the icon
cannot: a `RawMessage` the client resolves per player.**

A form entry has two strings — its text and its icon path. A compiled screen reads its values off
the ICON (`#form_button_texture`) and sets the text to a fixed decoy, which costs an edit to a
vanilla file: `server_form.json` blanks the icon image whenever the text matches that decoy, or
the engine would paint the payload as a texture path.

## What was measured

Six entries, no icon on any of them, each read back through `#form_button_text` on a label with
`localize: false`, so what the row says is what arrived.

| # | Sent | Drawn | Reading |
| --- | --- | --- | --- |
| 0 | `plain text` | `plain text` | the text arrives verbatim |
| 1 | `§aGREEN §cRED §r§lbold` | GREEN RED **bold**, coloured | `§` codes survive |
| 2 | `7 leading digit` | `7 leading digit` | a leading digit renders — no `%.Ns` format path on this field |
| 3 | `core.action.save` | `core.action.save` | the engine does NOT resolve a key before the binding |
| 4 | `200:` + 196 × `W` | all 200 characters | no cap short of what a trail needs |
| 5 | `{ rawtext: [{ translate: 'core.action.save' }, { text: ' §8> §r' }, { translate: 'core.action.cancel' }] }` | `Save > Cancel` | **the client resolves rawtext into the binding** |

## The press half

Every row is a button carrying the `collection_details` binding S1 measured, under the index host
that names its entry. Four rows pressed, four attributions, with the text being anything but the
decoy:

```
[s7] selection=0 canceled=false reason=undefined
[s7] selection=3 canceled=false reason=undefined
[s7] selection=5 canceled=false reason=undefined
[s7] selection=4 canceled=false reason=undefined
```

Row 5 — the `RawMessage` one — reports its own index like the rest, so a resolved rawtext is a
value a control can both draw AND be pressed on. Closing the form instead reports
`canceled=true reason=UserClosed`, which is how a dismissal stays distinguishable.

## What it means

**Row 5 is the finding.** A `RawMessage` is resolved by the CLIENT, in the reader's own language,
before the binding sees it — so one entry can carry a whole breadcrumb rather than one entry per
segment with a box reserved for each. `"{{}} > config"` is writable: build the rawtext, send it on
the text, paint it with `localize: false`.

**Row 3 is the other half of that.** A bare key is not resolved by the engine, so the two ways of
localizing a live string stay distinct and both keep working: a key travels whole and a
`localize: true` label resolves it, or a `RawMessage` travels and the client resolves it. Only the
second can hold more than one key.

**Rows 0, 1, 2 and 4** say the text field has none of the hazards the icon path was chosen to
avoid: codes, digits and length are all fine. S1's rule is unchanged and still the only thing that
attributes a press: the binding on the button, not the decoy in the text.

## Consequence

The value moves to `#form_button_text`, the icon is never set, and both the decoy
(`hosts/form/contract.ts` `ENTRY_TEXT`) and the icon-blanking hook in `server_form.json` are
deleted — one fewer edit to a vanilla file. Planned as phase E in the workspace `PLAN.md`.

## Where the probe lives

`ui/packages/resource-pack/packs/RP/ui/core-ui/spikes/form_text.json`, mounted beside the
library's own container and gated on the title marker `bcuiv0008S7`, with
`examples/economy/packs/BP/scripts/s7.ts` opening it from `/scriptevent core:s7`. Delete both with
this page's conclusions applied.

## Two things the probe also proved about its own shape

- A bound property belongs to the control that binds it. With the collection binding on the button
  and the text two controls below it, every row drew blank; the value has to be bound on the label
  that draws it, which is what the shipped carrier does.
- `font_type` takes `default` / `MinecraftTen`, not a font's internal name. `MinecraftSeven` is
  not a value the engine accepts, and a label carrying it silently draws nothing.
