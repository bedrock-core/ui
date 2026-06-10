# Item Aux POC

A static JSON UI harness that isolated **why items didn't render inside scroll
in the `@bedrock-core` factory**. It bypasses `ui-runtime` entirely (pure JSON +
a 3-button vanilla form from the BP), so every variable could be flipped
independently of the factory's serialization pipeline.

```bash
# From repository root
yarn install          # Install all workspace dependencies
yarn build            # Build all packages (including this addon)
yarn watch            # Watches changes and rebuilds and deploys addon to com.mojang
```

The overlay on `third_party_server_screen` shows four columns: two baseline
columns (items render in every layout context) and one column per finding.
Authoritative constraint write-up: [`../../ITEM_AUX.md`](../../ITEM_AUX.md).

---

## Finding A — `#item_id_aux` has two representations

`#item_id_aux` is 16.16 fixed-point (high 16 bits = item id, low 16 = data /
enchant). **The delivery path determines the representation you must feed:**

| Path | Representation | Example (stone, raw 1) |
|---|---|---|
| `property_bag` JSON literal | **PACKED** aux int (`raw_id << 16`, `+32768` glint) | `65536` |
| view/collection **binding** | **UNPACKED** raw_id (engine re-packs ×65536) | `1` |

- Vanilla uses the packed form in `property_bag` (beacon netherite
  `48627712 = 742 << 16`; inventory crafting table `3801088 = 58 << 16`).
- Chest-UI (and the factory) use the binding form: the script encodes the
  button icon as `(raw_id [+ customShift]) * 65536 + enchant` and the UI binds
  `((#form_button_texture - (#form_button_texture % 65536)) / 65536)` →
  `#item_id_aux`, handing the renderer the small raw_id.
- **Never mix the paths**: packed-through-binding gets re-packed into garbage
  (blank); raw_id-in-property_bag is `id 0, data raw_id` ≈ air (blank). Both
  directions were observed in-game.
- **The enchant glint survives the divide chain** (verified: an enchanted sword
  shows the glint in the factory's ScrollDemo), even though
  `(x - x%65536)/65536` symbolically looks like it strips the `+32768` bit —
  JSON UI expression evaluation is not plain integer math.
- `beacon.item_renderer` is **not** a different renderer — vanilla defines it as
  `type: custom, renderer: inventory_item_renderer`. (Also: the `beacon`
  namespace is a *screen-file* namespace and is not loaded in server-form
  overlays — `@`-references only resolve against loaded library namespaces like
  `common.*` or same-pack controls.)

**Demo (column 3):** packed `65536` renders stone; packed `1` is blank; the
collection row (icons `'65536' | '16842752' | '16842752'`) renders
stone | spear | spear through the divide.

## Finding B — elevated cumulative layer kills item sprites in scroll

**Inside `common.scrolling_panel`, a high cumulative `layer` makes 2D ITEM
sprites vanish while 3D BLOCK meshes survive.** Minimal pairs (column 4):

| Row | Layer | Stone (block) | Spear (item) |
|---|---|---|---|
| identical row | none | ✅ | ✅ |
| identical row | cells at 90 | ✅ | ❌ |
| identical row | scroll box itself at 999, cells at 0 | ✅ | ❌ |

The third row proves the rule is about the **cumulative** layer of the scroll
subtree, not the cell's own value. Plain buttons (2D images, layer 50) are
unaffected — the quirk is item-sprite-specific.

**This was the factory bug.** The scroll screen root carried `layer: 999`, so
everything inside the scrolling panel sat at cumulative ~1090 and every item
icon died in scroll while blocks rendered — the fixed screen root has no layer,
which is why fixed always worked. **Fix: removing `layer: 999` from the scroll
root** (`core-ui/screens/scroll_screen.json`); scroll/fixed are
`#visible`-toggled siblings, so nothing needed out-layering.

`item_cell` keeps its original `layer: 90` — verified fine in scroll once the
root layer was gone. The threshold is context-dependent: cumulative ~1090 kills,
~90 works in the factory screens, while this POC's layer-90 row (~100 with the
overlay's layer 10) fails. Rule of thumb: keep scroll-screen roots un-layered;
moderate cell layers are tolerable.

Verified in-game 2026-06-10: the factory `ScrollDemo` renders all items
(including the enchant glint on enchantable items).

## Finding C — blocks mask item-rendering bugs

Blocks draw as 3D meshes outside the 2D sprite pass: they survive layer/clip
conditions that kill item sprites (and famously ignore clipping). Every
block-only probe in this investigation passed while the same cell with an item
failed. **When testing item rendering, always probe with an item
(`raw_id ≥ 256`, e.g. spear `16842752`), never just a block.**

## Process notes (what cost time)

- A property_bag result was compared against the binding path early on,
  producing a false "the divide is the bug" diagnosis — the two representations
  (Finding A) are not comparable.
- Anchored-offset probes all inherited `layer: 90` from the factory cell, so
  every one of them was blank for the *layer* reason — `use_anchored_offset`,
  `collection_panel`, and the collection aux path were each eventually
  exonerated.
- A separate runtime regression (the half-committed item-aux schema migration
  blanking ALL items) overlapped the investigation; it was recovered from git
  (`3dc9751`) and the new-schema filter edits are parked in a stash in the
  `regolith-filters` repo.
