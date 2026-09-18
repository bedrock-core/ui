# S11 — can a factory build only the element a screen needs, where it needs it

**Status: answered 2026-09-17 — yes. A factory whose length is computed from an entry builds one
cell or none, in place, under the compiled form mount; a press inside the cell owns its entry.
Bindings inside the cell need `binding_condition: "always"`, or have to read outside the factory.**

## Why it was asked

A property whose values are a closed set is compiled as one copy per value. Gated by `visible`,
every copy is still built and laid out on every form open (S8), so the cost grows with each value.
A factory builds its children only when its `#collection_length` says so, so one factory per value,
its length computed from the entry that names the value, would build only the copy the present
asks for.

## The probe

A panel mounted beside `claimed` in `hosts/form/action_container.json`, so inside the same inserted
subtree every compiled form screen lives in, drawn for the title `corev0009spike:factory`. A command
showed it as an action form with four entries: the mode (`on`, `off` or `heavy`), `hide` for mode
`on` and `show` otherwise, a press, and a text. Every factory was a `collection_panel` with
`factory.control_name` and no collection, its length written by a view binding. Two rounds, asserts
on, no assertion in either.

## Measured

- **A computed length builds 0 or 1 cell.** `((#mode = 'on') * 1)` into `#collection_length`
  built the cell for `on` and nothing for `off` or `heavy`. It works with the mode read by a
  sibling and taken through `source_control_name` + `resolve_sibling_scope`, and with the factory
  reading the entry itself through its own `collection_index`.
- **One factory per value is an exclusive switch.** Two factories at one spot, lengths
  `(#mode = 'on')` and `(#mode = 'off')`, drew `ON` or `OFF` and nothing for `heavy`.
- **A length of 0 builds nothing.** A cell of 1,111 controls appeared only for `heavy`.
- **The layout log cannot measure this.** Every form open logged `Full re-layout of 18769
  controls` with or without the probe installed, in every mode: the count is taken before a
  factory builds its cells.
- **A press inside a built cell owns its entry.** A `button` with the `collection_details`
  binding, under a stack that declares `form_buttons` again with `collection_index: 2`, closed
  the form with `selection=2`.
- **A binding inside a built cell runs too early.** A label reading entry 3 through a nested
  stack drew nothing, content-sized and fixed-sized alike, until the game lost focus and got it
  back. Two shapes drew at once:
  - `binding_condition: "always"` on the collection binding;
  - reading the entry outside the factory, and copying it into the cell with a view binding by
    `source_control_name`.
- **A cell reads its own entry** when the factory declares `collection_name: form_buttons`, with
  the same early-binding delay.
- **`visible` works inside a built cell.** Bound with the default condition it applied only after
  the refocus; with `binding_condition: "always"` it hid the control at once.

## What it changes

- A closed set of values can be compiled so only the chosen copy is built. The cost of a copy
  that is not chosen is nothing.
- Everything a copy reads has to be `always` or copied in from outside the factory. `always`
  re-evaluates continuously; the copy-in keeps the collection read to one control outside.
- S9 recorded `visible` as ignored inside a factory subtree and pushed stray slider cells off
  screen instead. That reading matches this early binding, so `visible` with `always` probably
  works there too. Unmeasured on the modal's `custom_form` factory.
