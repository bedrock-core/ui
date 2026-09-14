# S9 — can a row-typed factory give a compiled slider its value back

**Status: answered 2026-09-14 — yes. A compiled slider is now a cell the engine builds, emitted
at the slider's socket; it drags, draws its track and fill, and keeps its value.**

## Why a statically placed slider can never read its row

Every compiled screen is laid out on every form open (S8), and each screen's slider carries the
`collection_index` its own screen solved, reading `custom_form` — the collection of whichever form
is open now. The engine takes a slider's step range from the field behind it; where there is no
field there is no range, and any write to `#slider_value` — 0 included — fails `_setCurrentStep`.
A slider can only read a row once its EXISTENCE is tied to that row.

## Measured

- **Routing is by row type.** A `collection_panel` over `custom_form` whose factory hands the
  engine `control_ids` builds the `slider` entry only where a slider ROW exists; an action form
  has no `custom_form` rows and builds nothing. Opening `/economy:list` and a modal leaf without a
  slider were silent with an invalid slider behind `control_ids.slider`; the leaf with a slider
  row reached it.
- **A factory cell has the engine's field behind it**, so `#custom_slider_steps` and
  `#custom_slider_value` are legal reads and the engine writes the value back.
- **A factory builds one cell per matching row of the whole form**, whichever socket mounts it: a
  screen with three sliders gets three cells in every socket. `visible` is ignored inside a
  factory subtree, but `use_anchored_offset` is honoured, so a cell whose row is not its socket's
  is pushed off-screen: `((not #mine) * 1000)` into `#anchored_offset_value_y`.
  `#anchored_offset_value_*` are multiples of the parent's size — a small factor moves the cell
  by rows, not out of view.
- **The row index cannot travel as a `$variable`.** A `$variable` set on a derivation reached by
  reference does not substitute into the base's bindings; the binding is malformed and the engine
  drops the whole array. The compiler bakes the literal address into each cell's gate instead.
- **Which row a cell is** comes from the row's own payload: the runtime sends `{type, row}` for
  slider rows (9-byte header, two 83-byte fields), the gate slices it out of `#custom_slider_text`
  with `'%.Ns' *` formats and compares `#row = <address>` after `* 1` (a sliced string against a
  number). Expressions know only `=`, `not`, `and`, `or`; `<` is an `Invalid expression`.
- **No rect decode is needed**: the cell is emitted inside the socket the build solved, so it
  inherits the rect.

## Shipped shape

- `ui-compiler/src/hosts/form/emit.ts` — `sliderSocket` replaces a slider face's children with
  `live_slider`: a `collection_panel` over `custom_form`, `#custom_form_length` bound to
  `#collection_length`, factory `buttons` with `control_ids` routing `slider` and `step_slider`
  to `@<ns>.slider_cell_<address>` and every other row type to `@core_ui_common.unused`. Per
  slider it emits `slider_cell_<address>@core_ui_form_components.slider_live` whose `gate` panel
  carries `rowGate(address)` and the off-screen push.
- `resource-pack/.../hosts/form/components/slider.json` — `slider_live` (the cell frame) →
  `slider_body` (value label plus the travel inset) → `slider_control`, which
  reads its row.
- `ui-runtime/src/hosts/form/modal.ts` — `writeRow` sends the `{type, row}` payload for slider
  rows only. `modalRowIndex` counts collection rows; `modalControlIndex` counts answer slots,
  because a slider answers in ONE `formValues` slot.
