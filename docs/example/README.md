# Example — one screen through every layer

The smallest screen that exercises every class: a baked background and title, a live label, a button with a live `enabled` and a press. Written once, compiled for two hosts.

| File | Layer | What to look at |
| --- | --- | --- |
| [Counter.tsx](./Counter.tsx) | JSX | the component; it never learns how `count` travels or what a press is |
| [counter.chest.screen.tsx](./counter.chest.screen.tsx), [counter.form.screen.tsx](./counter.form.screen.tsx) | JSX | the root element is the only difference between the two hosts |
| [ir.jsonc](./ir.jsonc) | IR | every prop tagged `baked` / `carried`; the look on each node; the inputs; the base rects |
| [shapes.jsonc](./shapes.jsonc) | JSON UI vocabulary | the three `core_ui_shapes` definitions the screen references — no bindings in any of them |
| [compiled.chest.jsonc](./compiled.chest.jsonc) | JSON UI, chest host | baked parts reference shapes; live parts are literal carrier definitions; the button is a slot behind a face |
| [compiled.form.jsonc](./compiled.form.jsonc) | JSON UI, form host (*Proposed*) | the same look; the button is an entry behind the same face; the live label reads its entry with no slicing |
| [placement.jsonc](./placement.jsonc) | runtime record | what `ui.generated.json` holds per host: addresses in document order, the key, the versions |

## The correspondences

1. `<Text>{'COUNTER'}</Text>` → IR `label_1`, `text: baked` → `label_1@core_ui_shapes.label` with `$text` on both hosts. Costs nothing at runtime anywhere.
2. `<Text maxLength={2}>` → IR `label_2`, `text: carried (text, 2)` → chest: two `text_host` cells reading stack sizes at slots 3 and 4; form: one entry, index 0, read straight into the label.
3. `enabled={count < 9}` → IR `button_1.enabled: carried (bool)` → chest: transport-or-guard aux on slot 2; form: one character of entry 1.
4. `onPress` → IR input `press` → chest: the transport leaving slot 2; form: `button.form_button_click` on entry 1.
5. The four state textures → one `button_1_face` per screen composing `nineslice` shapes, identical on both hosts.
6. Geometry → base rects from one build; nothing here is layout-live, so there are no islands and every rect is a literal.

Names and namespaces are the v2 proposal; every binding pattern under the chest is the one the current emitter produces and that renders in game.
