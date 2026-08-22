# JSON UI spec sources for the compiler

What the compiler validates its output against, and where each part comes from.
Checked against `@minecraft/bedrock-schemas` `1.26.20-beta.21` (latest) and
`1.26.40-beta.26` (beta) on 2026-08-21.

## What Mojang actually publishes

Three UI artifacts ship in the package, and they are not equally useful.

| Artifact | Contains | Verdict |
| -------- | -------- | ------- |
| `schemas/rp/ui/index.schema.json` | `namespace: string`, nothing else | **Not usable.** A UI screen file validates against it no matter what is in it. |
| `types/rp/ui/UiElement.d.ts` | 90 documented properties, doc comments, enum *declarations* | **Useful as the emit type.** But every enum is declared with no members. |
| `forms/ui/ui_element.form.json` | The same fields plus the real **enum values** | **This is where the values are.** 30 KB. |

`schemas/rp/ui/global_variables.schema.json` documents three example colour
variables and is otherwise a stub.

## Action for the `generator` filter

`lib/schemas.js` drops `forms/` from the tarball as "11 MB of editor snippets".
That is where the only authoritative enum values live. Keep `forms/ui/` — it is
30 KB, and without it there is no official source for a valid `type`,
`binding_type` or `binding_condition`.

## Enum values, from `forms/ui/ui_element.form.json`

```
type                panel, stack_panel, image, label, button, toggle, slider,
                    slider_box, edit_box, grid, scroll_view, scrollbar_box,
                    dropdown, input_panel, screen, custom
anchor_from         top_left, top_middle, top_right, left_middle, center,
anchor_to           right_middle, bottom_left, bottom_middle, bottom_right
orientation         horizontal, vertical
text_alignment      left, center, right
font_type           default, smooth, rune, unicode, MinecraftTen
font_size           small, normal, large, extra_large
binding_type        global, collection, collection_details, view, none
binding_condition   always, visible, once, always_when_visible, visibility_changed
mapping_type        pressed, double_pressed, global, focused
input_mode_cond.    not_gaze, gamepad_and_not_gaze
grid_rescaling_type none, horizontal, vertical
```

Worth noting against the knowledge base's `data/jsonui-spec.json`: the official
list has `slider_box` which that spec lacks, and lacks `tab`, `carousel_label`,
`grid_item` and `selection_wheel` which it has. Neither list is a superset.

## The delta the compiler needs

Present in vanilla, used by our output, **absent from every official artifact**:

| Property | Why we need it |
| -------- | -------------- |
| `collection_index` | Addressing a specific slot. The whole private-bank design. **Only valid at an instantiation site**, never on a definition. |
| `localize` | Labels localize by default; literal text needs it off. |
| `clip_ratio`, `clip_direction`, `clip_pixelperfect` | Every progress bar and gauge. |
| `property_bag` | Seeding computed properties before bindings run. |
| `modifications` | Patching vanilla screens at all. |
| `variables` / `$vars` | Vanilla's own control parameterisation. |
| `nineslice_size` | Official has `nine_slice_left/right/top/buttom` — note the typo — but not the array form vanilla files use. |

## So the compiler validates in three layers

1. **Official types** as the emit type. `UiElement` from
   `@minecraft/bedrock-schemas` `types/rp/ui`, extended with the delta above in
   one clearly-marked declaration file. Anything in the extension is a property
   Mojang has not documented, which is exactly the set to re-check on each
   schema bump.
2. **Official enums** from `forms/ui/ui_element.form.json`, once the generator
   filter stops discarding them.
3. **Vanilla samples as ground truth** for anything the first two miss. The
   knowledge base's authority order applies: `docs/*.md` > sample packs > tool
   output, and `ok=true` from a validator is not sufficient on its own.
