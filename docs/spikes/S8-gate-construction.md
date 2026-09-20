# S8 — can a gate keep a compiled screen from being BUILT, not just from being drawn

**Status: answered 2026-09-13, by the game's own layout log rather than by a probe. Every
compiled screen is laid out on every form open, and a `visible` gate does not prevent it.**

```
11:55:12:151 Created 'server_form.third_party_server_screen' screen in 1.329000ms
11:55:12:371 Layout background thread: Full re-layout of 5546 controls completed in 33.3987ms
             for screen 'server_form.third_party_server_screen'
11:55:12:418 Assertion failed: Step out of range
```

**5546 controls** on one form open is every compiled screen of every installed addon, and the
assertion lands 47 ms after that layout — not on a press, not on a row, but on the screen being
built. Two probes were written to measure this and both were inert (they sat in `[0,0]` panels, so
the engine never laid them out and never computed a percentage); the layout line settles it
without them.

**A slider assertion therefore only fires on a slider that is LAID OUT** — which every compiled
screen's slider is, on every form.

Every compiled screen of every installed addon is a permanent child of the one `server_form`
screen, and the gates that pick between them are `visible` bindings. `visible` decides what
DRAWS. It does not decide what gets BUILT. So opening any server form — ours, or a third party's
`ActionFormData` — constructs every screen in the pack, and every engine component inside them
initialises with whatever state it was handed.

## The chain, as it stands

1. The render pack hooks `server_form.json`, the one vanilla screen behind every server form.
2. `hosts/form/action_container.json` mounts `compiled@core_ui_form.claimed`;
   `hosts/form/modal_container.json` mounts `compiled_content@core_ui_form.claimed_modal`.
3. Both are panels with `"visible": "#visible"`, written by a view binding that matches
   `#title_text` against the `bcuiv0008` protocol header.
4. Inside sits `compiled_root` → `core_forms` → one `core_gate_<screen>` panel per compiled
   screen, each again `visible` against its own exact title.

## Why it matters

The cost is not the panels. It is the controls with ENGINE STATE inside them — `slider`,
`toggle`, `edit_box`, `dropdown` — because those validate on construction against state they were
given for a screen the player is not on.

The slider is where this surfaced, and the two assertions it raises are both construction-time:

- `SliderComponent::_setCurrentStep` — `step >= 0 && step < mNumberSteps`
- `SliderComponent::_setPercentage` — `progress >= 0.0f && progress <= 1.0f`

Both fire while opening a screen that contains no slider at all, because some other screen's
slider was built beside it. The current slider therefore seeds vanilla's literals and reads
nothing (`hosts/form/components/slider.json`): the only state that is safe for it to hold is
state that is valid on a screen with no form field. That is also why it cannot show a stored
value — the one channel that could carry it is a collection read, and a collection read is what
asserts.

**So this spike is upstream of the slider.** If a gate can stop construction, a compiled slider
can hold its own range again and the value can come back.

## Candidates, and what is already known about each

| Mechanism | Verdict |
| --- | --- |
| `visible` on an ancestor | **Measured, insufficient.** What this spike is replacing. A control's own `binding_condition: "visible"` does not help either — an ancestor being hidden does not stop the descendant evaluating. |
| `ignored` | **Load-time.** It takes a `$variable` expression resolved when the pack loads, and which screen the runtime is opening is not knowable then. Usable to split per PACK, never per screen. |
| `@$variable` mount — a definition named by a variable | **Measured dead.** Mounting through a variable name draws nothing (see the container-screens findings). |
| One real screen per compiled screen | **Dead.** The engine opens `server_form` for every server form; a pack cannot route to a different screen file. |
| `factory` over a collection whose `#collection_length` is bound | **UNKNOWN — this is the probe.** A factory builds one cell per entry, and `#collection_length` is writable by a binding (`server_form.json` does exactly this for `custom_dropdown`). If a length of 0 builds nothing, and a length that becomes 1 builds on demand, the gate moves from `visible` to cell count and nothing is constructed for a screen the player is not on. |

## The probe

The assertion is the instrument. A slider that is out of range cannot be ignored, cannot be
missed, and reports at exactly the moment this spike is asking about — construction — so it is a
better detector than anything that has to be read off a screen.

`hosts/form/gate_probe.json` holds one deliberately invalid slider: `slider_steps: 1` with
`#slider_value: 5`, which fails `_setPercentage` the instant it is built. It sits inside a
factory whose collection length is bound to 0, and that factory is mounted beside `claimed` in
`action_container`, so it is reached on every bcui form.

**No reading.** A crash was reported while the probe was installed, but the debug log for that
session records no bcui form being opened at all (`bcuiv0008` never appears, and the session ends
without a `SliderComponent` assertion). The probe was never reached, so it neither confirmed nor
denied anything. It has been removed.

**Re-running it correctly:** deploy it, open the form, then read
`%APPDATA%/Minecraft Bedrock/logs/Debug_Log<session>.txt` and check for
`Assertion failed: Progress out of range` AND for a line containing `bcuiv0008` proving a form was
actually opened. A session with no `bcuiv0008` line proves only that the test did not run.

## What the interpreted renderer did differently

Independent of the probe, and readable in git: it mounted one `collection_panel` over
`custom_form` whose length came from the engine's own `#custom_form_length`, and handed the engine
a `control_ids` map rather than a single `control_name` — `label`, `toggle`, `slider`,
`step_slider`, `dropdown`, `input`. A compiled screen places its controls statically instead, so a
slider exists whether or not there is a row behind it. Whether that difference is what kept the
old renderer safe is exactly what S9 has to measure.

## What it means

1. **Every compiled screen of every installed addon is built on every server form open** — ours
   and other people's alike. That is a standing cost as well as a correctness constraint.
2. **A statically placed compiled control may only hold state that is valid with no form field
   behind it.** The slider is the one control that validates on construction, so it is the one
   that cannot be placed statically at all: it is built by the engine instead, one cell per
   slider row, at the socket the build solved for it — see S9.
