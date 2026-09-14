# S9 — can a row-typed factory give a compiled slider its value back

**Status: open, and now the ONLY route left. Measured 2026-09-13: a compiled slider cannot read
its row, for a reason no amount of tuning fixes.**

## Why the read can never work as things stand

Every compiled screen is laid out on every form open (S8), and each screen's slider carries the
`collection_index` ITS OWN screen solved for it, reading `custom_form` — the collection of
whichever form is open NOW. So a slider belonging to screen X reads row N of screen Y's form: a
toggle's state, an input's text, another field's number. The value is not merely in the wrong
units, it belongs to a different control.

That closes the unit-matching route. The runtime was changed to hand the form STOP INDICES so
that `#custom_slider_value` and `#slider_value` share a unit (`emitSlider`, with the answer mapped
back through `ModalControlEntry.decode`) — a good change on its own, and kept — but it does not
help, because the row being read is the wrong row. Scaling that value in the binding (the
arithmetic option) fails for the same reason.

**A compiled slider can only read a row once its EXISTENCE is tied to that row**, which is what
this spike is about.

S8 established that a statically placed control is built on every server form in the world, and
that no gate the pack invents stops it. This asks the follow-up S8 raised: the interpreted
renderer had no such problem, so what did it have that the compiled one gave up?

## What the interpreted renderer did

Not a gate. A **factory keyed by row type**. Its modal container mounted one
`collection_panel` over `custom_form`, took its length from the engine's own
`#custom_form_length`, and handed the engine a `control_ids` map instead of a single
`control_name`:

```json
"factory": {
  "name": "buttons",
  "control_ids": {
    "label": "@…label_router",   "toggle": "@…toggle_router",
    "slider": "@…slider_router", "step_slider": "@…slider_router",
    "dropdown": "@…dropdown_router", "input": "@…input_router",
    "header": "@…unused",        "divider": "@…unused"
  }
}
```

If the engine picks the entry matching each row's own type, then a `slider` control was only ever
built where a slider ROW existed — and a form with no `custom_form` rows built none at all. That
would explain, with no defensive coding anywhere, why that renderer never raised either slider
assertion while a compiled screen raises both.

A compiled screen places its controls at solved positions instead. Existence stopped depending on
the row, and that is the whole regression.

## The probe

`hosts/form/type_probe.json` rebuilds exactly that shape: a `collection_panel` over `custom_form`
whose `control_ids` route `slider` and `step_slider` to a slider that is invalid by construction
(step 5 against a count of 1, failing `_setPercentage` the instant it is built) and every other
row type to an empty panel. Mounted on both `action_container` and `modal_container`, so it is
reached by every bcui form.

The assertion is the instrument: silence means the control was not built.

| # | Open | Expect | What the outcome says |
| --- | --- | --- | --- |
| 1 | `/economy:list` | silence | An action form has no `custom_form` rows, so the factory has nothing to count. An assert here would mean a factory builds even with a real collection at length 0, and S9 is dead. |
| 2 | config → server → **display** | silence | Rows exist and none is a slider. **This is the finding.** Silence means routing is by row TYPE, so a slider costs nothing on a screen without one. |
| 3 | config → server → economy → **balances** | the assert | This screen has a slider row. The assert proves the probe is reached at all — without it, silence in 1 and 2 would prove nothing. |

## If it holds

The fix is not to gate the compiled screens. It is to put the controls that carry ENGINE STATE
back behind the engine's own collection, and leave everything else compiled:

- Faces, text and layout stay statically placed. They hold no engine state and assert nothing.
- A `slider`, `toggle`, `dropdown` or `edit_box` becomes a cell of one `collection_panel` over
  `custom_form`, routed by `control_ids`, so it exists exactly when its row does — and can then
  read that row freely, which is what returns the slider's value.

The open cost is GEOMETRY. A factory cell is built by the engine in row order; it does not know
the rect the build solved for it. Options, cheapest first:

1. **Carry the rect on the row.** The runtime already sends a per-row payload, and `FormSlider`
   already serializes its own geometry into it at fixed offsets — the decode was removed from the
   pack, not the send from the runtime. Reinstating a rect decode for stateful controls only is
   far short of the interpreted renderer's full decode.
2. **Only the slider.** It is the one control that validates on construction today, so the change
   could be scoped to it and widened when something else needs it.

## Removing the probe

Delete `hosts/form/type_probe.json`, its `_ui_defs` entry, and the `probe@` mounts in
`hosts/form/action_container.json` and `hosts/form/modal_container.json`.
