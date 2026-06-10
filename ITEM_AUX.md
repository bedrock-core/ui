# Item Aux ID — Reference & Constraints

## Encoding

Bedrock JSON UI identifies items via an **aux value** derived from the item's raw numeric ID:

```
aux = raw_id × 65536
item_id = ⌊aux / 65536⌋
```
### Enchantment offset

To render the enchantment glint overlay, add `32768` to the base aux:

```
aux_enchanted = (raw_id × 65536) + 32768
```

---

## Raw ID Ranges

| Range | Category | Example |
|---|---|---|
| `< 0` | Vanilla new-blocks | `verdant_froglight` = −470 |
| `0 – 255` | Vanilla legacy-blocks | `stone` = 1 |
| `≥ 256` | Vanilla items | `copper_spear` = 257 |
| `≥ customStart` | Custom items/blocks |

---

## Known Constraints

### 1 — `#item_id_aux` has TWO representations: packed (property_bag) vs unpacked (binding)

`#item_id_aux` is a 16.16 fixed-point value (high 16 bits = item id, low 16 bits
= data/enchant). The **delivery path determines which representation you feed**:

- **`property_bag` JSON literal → the PACKED 32-bit aux int** (`raw_id << 16`,
  `+32768` for glint). Vanilla `beacon_screen.json`: netherite
  `#item_id_aux: 48627712 = 742 << 16`; vanilla `inventory_screen.json`:
  crafting table `3801088 = 58 << 16`. POC: `65536` renders stone; `1` (= packed
  id 0 + data 1 ≈ air) is blank.
- **View/collection binding → the UNPACKED value** (`raw_id` in the integer
  part; low bits as the fraction). The engine effectively multiplies the bound
  float by 65536 (re-packs it). This is why **Chest-UI** — the canonical
  server-form item renderer — encodes the button icon as
  `((ID [+ customShift]) * 65536) + enchant` script-side and then binds
  `((#form_button_texture - (#form_button_texture % 65536)) / 65536)` →
  `#item_id_aux`, i.e. hands the renderer the **small raw_id**, and it renders.
  Verified in our factory (2026-06-10): the divide version renders items on
  fixed; binding the packed aux straight through (`#item_id_aux =
  #form_button_texture`, no divide) renders **nothing** — the engine re-packs
  the already-packed value into garbage.

**Practical rules:**
- Static cells (`property_bag`): write the packed aux (`raw_id << 16` + glint).
- Server-form `#form_button_texture` chains (factory `item_cell`): keep the
  Chest-UI divide. **The enchant glint survives this chain** — verified in
  ScrollDemo (an enchanted sword shows the glint), even though on paper
  `(x - x%65536)/65536` looks like it strips the `+32768` bit. JSON UI
  expression evaluation here is evidently not plain integer math; trust the
  in-game result over symbolic reasoning.
- Never compare results across the two paths — a value that renders via
  `property_bag` will not render via binding and vice versa. (This produced a
  false "the divide is the bug" diagnosis on 2026-06-09, since corrected.)

### 2 — Elevated cumulative `layer` kills item sprites in scroll (RESOLVED 2026-06-10)

**Inside `common.scrolling_panel`, a high cumulative `layer` makes 2D ITEM
sprites vanish while 3D BLOCK meshes survive.** Confirmed with minimal pairs in
the POC (`packages/POC`, Finding B column):

| Identical collection-aux row | Stone (block) | Spear (item) |
|---|---|---|
| no layer | ✅ | ✅ |
| cells at `layer: 90` | ✅ | ❌ |
| scroll box itself at `layer: 999`, cells at 0 | ✅ | ❌ |

The third pair proves the rule is **cumulative** (the subtree's total, not the
cell's own value). Plain buttons (2D images, layer 50) are unaffected — the
quirk is item-sprite-specific. Threshold not precisely characterized; keep item
renderer subtrees at low layers.

**This was the factory's items-in-scroll bug** (blocks rendered, items didn't;
fixed screens fine). **The fix is one change**, verified in-game via
`ScrollDemo`: removed `layer: 999` from the scroll root in
`core-ui/screens/scroll_screen.json`. The sibling fixed root has no layer
(which is why fixed always worked); scroll/fixed are `#visible`-toggled and
never coexist, so the 999 served nothing.

`item_cell` keeps its original `layer: 90` — with the root 999 gone, items
render fine in scroll at cell-level 90 (verified). So the threshold is
context-dependent: cumulative ~1090 (root 999) killed sprites, ~90 is fine in
the factory screens, while the POC's K6 row at ~100 (overlay layer 10 + cell
90) still failed. Actionable rule: avoid large layers on scroll-screen roots;
moderate cell-level layers are tolerable.

Exonerated along the way: the aux path (collection binding + divide works in
scroll), `use_anchored_offset`, and `collection_panel` — every earlier blank
probe traced back to `layer: 90` copied from the factory cell.

### 3 — Blocks mask item-rendering bugs

Blocks draw as 3D meshes outside the 2D sprite pass and survive layer/clip
conditions that kill item sprites (they also famously ignore clipping). Every
block-only test in this investigation passed while the same cell with an item
failed. **Always probe item rendering with an item (`raw_id ≥ 256`, e.g. spear
`16842752`), never just a block.**

> Historical note: a runtime guard (`ScreenDescriptor.allowsItems`, throw in
> `ItemRenderer`) used to block items on `Screen.Scroll` — it dated from when
> this layer quirk was misattributed to "scroll can't render items". With the
> layer fix in place the field and the guard were **removed entirely**; items
> render on scroll and fixed alike. No `grid` is required on either.

### 4 — Shift threshold calibration
> At runtime, `ItemTypes.getAll()` may return extra `minecraft:` items that are absent from the public `vanillaRawIds` map (for example due to version mismatch as it needs to be "precompiled"). The number of such extras determines an offset applied to all items with `raw_id >= shiftThreshold`, keeping custom IDs stable across dev and release builds.

### 5 — Custom item ID determinism
> Custom items are assigned sequential IDs in **alphabetical order** of their identifiers, sourced from `RP/textures/item_texture.json`. Renaming or reordering entries changes all subsequent IDs, breaking any cached or serialized aux values.
