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

### 1 — Items don't render on scroll screens
> `ItemRenderer` only works on `Screen.Fixed` (`allowsItems: true`). Attempting to use it on `Screen.Scroll` throws an `ItemAuxError` at runtime. Additionally, placing `beacon.item_renderer` inside a scroll container silently produces no icon for items, even on a fixed screen.
>
> Items render correctly outside a `grid` as long as the screen is fixed.

### 2 — Shift threshold calibration
> At runtime, `ItemTypes.getAll()` may return extra `minecraft:` items that are absent from the public `vanillaRawIds` map (for example due to version mismatch as it needs to be "precompiled"). The number of such extras determines an offset applied to all items with `raw_id >= shiftThreshold`, keeping custom IDs stable across dev and release builds.

### 3 — Custom item ID determinism
> Custom items are assigned sequential IDs in **alphabetical order** of their identifiers, sourced from `RP/textures/item_texture.json`. Renaming or reordering entries changes all subsequent IDs, breaking any cached or serialized aux values.
