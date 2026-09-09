---
sidebar_position: 3
---

# JSON UI and container facts

The rules the container backend is built on: how a chest screen addresses its slots, what a slot publishes and in which type, what the Script API allows around a container, and which official schema artifacts are worth validating against. Every rule below was measured in game or checked against Mojang's published files, and the numbers are the ones observed.

## Containers

### Routing and size

- `container_type: "container"` is the only `minecraft:inventory` type that routes to `chest_screen.json`.
- `private` must be `false`, or players cannot open the container at all.
- `inventory_size: 54` routes to `small_chest_screen`, not the large one. Its grid draws 9 × 3 = 27 cells while `#collection_total_items` reports the full 54 — 27 slots exist that no cell draws, with no grid patch and no effect on real double chests.
- `inventory_size: 200` works: the container opens, `#collection_total_items` reports 200, every index binds, and populating all 200 slots costs 14 ms once at spawn. No ceiling has been found.
- The undrawn slots are readable and live: a fill driven only by the durability of the item in slot 40 animates while the screen stays open.
- Over roughly 20,000 ticks and 11 sessions of shift-clicking, double-clicking to collect and drag-distributing across the grid, every item landed in a drawn slot; nothing ever reached the undrawn range. The undrawn range was kept full throughout, so "keep it full" and "the engine never addresses an undrawn slot" have not been separated.
- A one-tick poll over the whole container costs 0.3 ms at 54 slots and 3.3 ms at 200. The cost tracks container size, so a full scan does not scale — ten players on a 200-slot screen would eat two thirds of a tick. Polling the drawn range only brings it back to about 0.3 ms: the undrawn range has no cell, so nobody can touch it between sweeps, and a once-a-second integrity sweep covers it.
- The touch chest screen routes to `pocket_containers.small_chest_panel`, from the same `small_chest_screen` in `chest_screen.json`; one hook file covers both UI profiles.

### The screen title

- `$container_title` is the entity's live `nameTag`, and renders in controls inserted into the screen. An entity with no name tag falls back to `entity.unknown.name`.
- It cannot be used in a binding expression, so nothing can be routed on it. Routing goes through the marker slot instead.

## Collection addressing

- `collection_name` is legal on `stack_panel` and `grid` only. On `panel` and `image` the engine rejects it: *Unknown property [collection_name]*.
- `collection_index` is only accepted at an **instantiation site** — an entry in a parent's `controls`, inline or `@`-referenced. On a top-level definition the engine rejects it: *Unknown property [collection_index]*. It is rejected on an `image` in any position, and on a `label` it is accepted silently and does nothing.
- The index inherits down the subtree from wherever it is applied, so the control owning a binding sits *under* the control carrying the index.
- Consequently a compiled layout emits one small definition per control shape and applies the index, and the solved offset, at each reference: a slot grid costs one definition plus N references rather than N definitions.
- Bindings always name the collection themselves through `binding_collection_name`; the control tree only supplies the index.
- **A collection binding with no `collection_index` anywhere above it reads slot 0.** Measured on `chest.small_chest_panel` itself: `#item_id_aux` published the sentinel's aux with no index host in the tree, which is what lets vanilla's chest label and grid hide themselves on the protocol key without any control being inserted around them.
- **A binding expression can crash the client outright.** A probe carrying `(#count / 19)` and `('' + #count)` — a division and an empty string literal — closed the game on opening the screen; the same probe without those two forms ran. Keep expressions to `+ - *`, comparisons and non-empty literals.
- **`>=` is not a comparison the expression parser accepts.** `(#inventory_stack_count >= 100)` and `((#inventory_stack_count * 1) >= 100)` both held on a stack of 21, and `(… >= 2)` held on an empty slot: a binding whose expression fails leaves the property at its default, and `#visible` defaults to true. Only `=`, `<` and `>` are used anywhere.
- `#item_id_aux` of a command block item is `8978432`, exactly `137 × 65536` — a legacy block id, published unshifted.

## Variables, modifications and replacements

- **A `$variable` cannot be used inside a binding's `source_property_name` in a subtree inserted through `modifications`.** Six variations — quoted and bare, the engine-injected `$container_title` and a pack-defined variable, declared on the parent and on the binding's owner, with and without a `#property` in the expression — all fail identically: *Must define a source property name in the binding!* The same binding with no variable in it parses every time.
- The same constraint from the other side: a `$caption` in `text` substitutes fine, while a `$bind` inside a `bindings` array stays empty. **A shared, parameterised control template does not work in an inserted subtree.** Each control needs its own definition with literal binding names, which is what the compiler emits — compiled layouts bake literals into expressions rather than parameterise them.
- This is why the form protocol's variables work where an inserted binding does not: they live on a control the pack owns outright, not one grafted into a vanilla tree.
- A **derived or replaced** vanilla definition is a normal control tree: cross-namespace `@` bases resolve inside it, and variables are legal in its bindings.
- A vanilla definition must be re-declared in the file vanilla itself owns. JSON UI resolves a definition from the file that owns it, so a `small_chest_screen` declared in any other file — same namespace or not — is silently ignored and the vanilla chest renders.
- **`modifications` are resolved per file path, not per namespace.** A `modifications` entry in a file at another path — even in the same pack, even in a namespace the pack itself defines — is read as a definition of its own: the engine reported *Type not specified (or @-base not found)* and *Unknown property [modifications]* for a `chest_root` modification placed in a second file of the `core_ui_router` namespace, and it displaced the real definition. Only a modification in a copy of a file at the same path as the one being modified applies, and those stack across packs in pack order. That is why every edit to the chest lives in a copy of vanilla's own `chest_screen.json` — every pack's copy stacks on vanilla's — and why nothing else in the container pipeline uses `modifications`.
- **A `modifications` insert into an array the target does not declare itself creates that array — and it shadows the inherited one.** `chest.small_chest_screen` declares no `controls`; it inherits them, two levels up, from `common.base_screen`, whose single child carries the background, the safe-zone matrix and the `$screen_content` mount. A `controls` insert on `small_chest_screen` left the screen with only the inserted control: compiled screens, inserted at that level, rendered, while a plain chest — and vanilla's content under a compiled one — opened to nothing at all, no screen and nothing in the debug UI. The same happens on any derived definition. The library inserts only into definitions that declare the array, and switches the screen's content by re-declaring the screen, the way vanilla's own `shulker_box_screen` and `barrel_screen` do.
- **`variables` is not an array `modifications` reach.** Only `controls` and `bindings` are; an entry naming `variables` is ignored.
- **A `$variable` as a child's `@`-base, set from the reference site, mounts nothing.** A one-child host declaring `$gate|default` and a child `gate@$gate`, referenced twice with a different `$gate` each, rendered neither — no error, an empty screen on both paths. Vanilla only does this with variables the screen itself sets (`root_screen_panel@$screen_content`). The chest root spells every host out by name.
- **A `remove` of an inherited child drops the whole file, silently.** `pocket_containers.small_chest_panel@panel` has no children of its own; removing `panel`'s children through it produced no log line and none of the file's edits — the inserts included — applied. `insert_back` on the same derived definition works. Nothing in the container pipeline removes a vanilla control any more: vanilla's panel is referenced under a gate, and its label and grid hide themselves by a binding, the way the form hook hides `long_form` and `custom_form`.
- Variables substitute in ordinary properties only when the variable is the entire value: `"text": "$container_title"` works, `"text": "t: $container_title"` prints the dollar sign.

## Binding types and text

Per-slot binding types, measured:

| Binding | Type | Concatenates into text? |
| --- | --- | --- |
| `#collection_total_items` | int | yes |
| `#item_id_aux` | int | yes — `-1` for an empty slot |
| `#item_lock_in_slot` | bool | prints `true` / `false` |
| stack count | string in expressions (see below) | as a key, yes |
| durability, current and total | float | no |
| storage | float | no |

- Floats are a display limit only: the same float bindings work in arithmetic, comparisons and `#clip_ratio`.
- A label cannot render a raw numeric binding. Concatenate it with a string first — `"source_property_name": "('n=' + #raw)"` — and bind that to `text`.
- **string + float produces nothing.** Only ints concatenate. Rendering a float as text needs a comparison chain, `(0 + (#f > 0) + (#f > 1) + ...)`, which covers 1–10 and drops precision. For text, bucket a float with a comparison chain or carry the number on an int channel.
- Stack count cannot be displayed at all, even bound straight to `text` the way vanilla does it. `#inventory_stack_count` also reports nothing for a stack of one, which is why a live text cell's blank is the lowest code, keyed by the bare prefix.
- **`#inventory_stack_count` is a string inside a binding expression.** On a stack of 19, `(#count = '19')` held and nothing else did: `(#count = 19)`, `(#count = 19.0)`, `(#count > 2)`, `((#count * 1) = 19)`, `((#count * 1) > 2)` and `((#count - 19) = 0)` were all false. Arithmetic does not coerce it. The router's sentinel gates compare the stack size as a quoted literal, and a live text cell concatenates it into a key, which is the one thing a string does.
- string → number is any arithmetic except addition: `(#str * 1)`.
- Booleans are numbers in arithmetic: `true` is 1, `false` is 0.
- `#item_durability_total_amount` reads 2031 on a netherite pickaxe — a durability channel has that much resolution.
- **A vanilla item's `#item_id_aux` is only stable below 256.** Custom items registered by any addon take numeric ids from 256 upward and shift every vanilla item above them (wiki.bedrock.dev, *Numerical Item IDs*; the netherite pickaxe measured 622 in one environment and is listed as 641 in another). Every damageable item lives above 256, so no durability-carrying item can be a protocol marker in a world with other addons. The protocol rides three legacy-range blocks instead — command block, repeating and chain command block, ids 137/188/189, operator-only — and the layout key rides two stack sizes (2..64 each — a stack of one publishes no count — 3969 keys) in the first two container slots, read by two nested gates.
- Labels localize by default: literal text is looked up as a translation key first, so a literal label needs `"localize": false`. The container backend turns this around — a live text cell is a `localize: true` label whose key is built from a slot's stack size, and the `.lang` table turns the key into a glyph. A key with no entry prints itself.
- A `.lang` value of one space defines nothing, because the parser trims trailing whitespace. A blank glyph has to be wrapped in inert formatting codes (`§r §r`) to survive the file format.
- `('%.Ns' * X)` takes a prefix only when `X` is a binding, not a string literal.
- A container slot publishes no text: `#hover_text` is a single hover-driven screen value that any press steals, and `#group_item_group_name` is empty for a container. What a slot publishes is numbers.

## Server forms

- **A control the pack places itself can own a `form_buttons` entry — but only if the CONTROL carries the collection binding.** A `stack_panel` declaring `collection_name: "form_buttons"` with a child carrying a baked `collection_index` is enough to *read* that entry, and enough for a `button` in that subtree to be pressed. It is **not** enough for the press to be attributed: the button must itself carry `{ "binding_type": "collection_details", "binding_collection_name": "form_buttons" }`. Measured 2026-08-27 with four rows in one form — three carrying the binding returned `response.selection` 0, 1 and 2 respectively; a fourth, identical but for the binding, returned `canceled`.
- **A form button with no collection binding fails silently and misleadingly.** The click still routes and the form still closes; script sees `canceled`, which is exactly what Esc and the X produce. There is no log line and no visual difference, so a missing binding looks like a player dismissing the form.
- This is what `$cell_details_binding_type` is for in `core_ui_common.control`, which sets it to `collection_details` for buttons and leaves it `none` for panels: the per-cell collection index is what routes `button.form_button_click` to the right form button.
- **A form's content can be replaced without touching a vanilla file.** `server_form.main_screen_content` sizes the library's own container to the screen only when the title carries the protocol header, and `core_ui_common.action_container` — a definition the pack owns, which declares its own `controls` — accepts placed subtrees by ordinary reference. Nothing needs `modifications`, and nothing vanilla is re-declared, so the plain form path is untouched by construction.

## Script API

- **No lock mode makes a container slot read-only.** `ItemLockMode.slot` binds the item to a *player* slot, not the container slot: the player moves it out of the container freely and then cannot move it back — it is stuck wherever it landed in their inventory until script clears it. The lock does not stop the take and makes every escape worse. Poll-and-restore is the only mechanism, and items the runtime places carry `ItemLockMode.none`.
- **Restoring a taken slot while the player still holds the original duplicates the item.** Refilling the slot produced two: the copy reappeared in inventory slot 12 a tick later, and the sweep on close reclaimed 4 escaped items. A handler must reclaim the taken instance, not just refill the slot.
- **The cursor is readable.** `PlayerCursorInventoryComponent.item` is the stack in flight between slots and `clear()` removes it, so a reclaim completes in the same tick — container, then inventory, then cursor — confirmed end to end. It is not populated under touch controls, so a sweep on close remains the backstop.
- **`ItemStack.setDynamicProperty` throws on stackable items** (`UnsupportedFunctionalityError: Cannot set dynamic properties on stackable items`). Only max-stack-1 items can carry one; lore works on everything and is the portable fallback. The runtime marks the items it places with a dynamic property where the item can hold one and a lore line where it cannot.
- Non-stackable items in slots the runtime owns stop quick-move from merging into them, and are the only ones that can carry a dynamic property. A live text cell is the exception on purpose: its character *is* the stack size, so it rides a stackable item.

## Official schema sources

What a compiled layout can be validated against, and where each part comes from. Checked against `@minecraft/bedrock-schemas` `1.26.20-beta.21` and `1.26.40-beta.26`.

| Artifact | Contains | Verdict |
| --- | --- | --- |
| `schemas/rp/ui/index.schema.json` | `namespace: string`, nothing else | Not usable: a UI file validates against it whatever is in it |
| `types/rp/ui/UiElement.d.ts` | 90 documented properties, doc comments, enum *declarations* | Usable as the emit type — but every enum is declared with no members |
| `forms/ui/ui_element.form.json` | The same fields plus the real **enum values** | The only official source of valid values. 30 KB |

`schemas/rp/ui/global_variables.schema.json` documents three example colour variables and is otherwise a stub. A schema download that drops `forms/` as editor snippets loses the only authoritative enum values with it.

### Enum values, from `forms/ui/ui_element.form.json`

```txt
type                 panel, stack_panel, image, label, button, toggle, slider,
                     slider_box, edit_box, grid, scroll_view, scrollbar_box,
                     dropdown, input_panel, screen, custom
anchor_from,         top_left, top_middle, top_right, left_middle, center,
anchor_to            right_middle, bottom_left, bottom_middle, bottom_right
orientation          horizontal, vertical
text_alignment       left, center, right
font_type            default, smooth, rune, unicode, MinecraftTen
font_size            small, normal, large, extra_large
binding_type         global, collection, collection_details, view, none
binding_condition    always, visible, once, always_when_visible, visibility_changed
mapping_type         pressed, double_pressed, global, focused
input_mode_condition not_gaze, gamepad_and_not_gaze
grid_rescaling_type  none, horizontal, vertical
```

Against community-maintained lists: the official one has `slider_box`, which they tend to lack, and lacks `tab`, `carousel_label`, `grid_item` and `selection_wheel`, which they have. Neither is a superset of the other.

### Used by vanilla, absent from every official artifact

| Property | Why a compiled layout needs it |
| --- | --- |
| `collection_index` | Addressing a specific slot — the whole container backend. Only valid at an instantiation site, never on a definition |
| `localize` | Labels localize by default; literal text needs it off |
| `clip_ratio`, `clip_direction`, `clip_pixelperfect` | Every bar and gauge |
| `property_bag` | Seeding computed properties before bindings run |
| `modifications` | Patching vanilla screens at all |
| `variables` / `$vars` | Vanilla's own control parameterisation |
| `nineslice_size` | The official types have `nine_slice_left/right/top/buttom` — note the typo — but not the array form vanilla files use |

### Validation, in three layers

1. **Official types** as the emit type: `UiElement` from `types/rp/ui`, extended with the delta above in one clearly marked declaration. Anything in the extension is a property Mojang has not documented, which is exactly the set to re-check on each schema bump.
2. **Official enums** from `forms/ui/ui_element.form.json`.
3. **Vanilla sample packs as ground truth** for anything the first two miss. `ok = true` from a validator is not sufficient on its own.
