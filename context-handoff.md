# Context Handoff: WAILA Inventory Rendering Investigation

## Goal
Display the full player inventory (all 36 slots) as 3D item icons inside a custom JSON UI screen (`third_party_server_screen`) from the `@bedrock-core` project.

---

## Project Structure
Two separate projects are involved:

- **`c:\Users\av\Desktop\Minecraft\Proyectos\WAILA`** — the WAILA addon (source of the rendering pattern we're replicating)
- **`c:\Users\av\Desktop\Minecraft\Proyectos\@bedrock-core`** — the target project where the inventory UI is being built

The file being edited is:
`c:\Users\av\Desktop\Minecraft\Proyectos\@bedrock-core\ui\packages\resource-pack\packs\RP\ui\server_form.json`

---

## How WAILA Renders Items (the pattern we're replicating)

### For blocks
`block.getItemStack(1, true)` converts a block to an `ItemStack`, which is physically placed into the player's inventory at **slot 17** via `InventoryMirror`. The UI binds `inventory_item_renderer` to `hotbar_items[17]` — Minecraft computes `#item_id_aux` automatically from the real item in that slot.

Key files in WAILA:
- `packs/data/gametests/src/waila/core/InventoryMirror.ts` — places items into player inventory slots
- `packs/RP/ui/r4isen1920/waila/tile.r4ui` — `item_aux_inv_renderer` component (the UI slot renderer)

### For entities
`entity.id` is transformed via `EntityHandler.transformEntityId()` into a normalized padded string (e.g. `"000001234567"`) and passed to `live_horse_renderer` via `#entity_id`.

### The `item_aux_inv_renderer` binding chain (WAILA's tile.r4ui)
The binding works via a `stack_panel` that owns the collection, a child that reads the item, and view bindings that propagate `#item_id_aux` upward to the renderer:

```json
"item_aux_inv_renderer@common.empty_panel": {
    "$collection_index": 17,
    "controls": [{
        "inv": {
            "type": "custom",
            "renderer": "inventory_item_renderer",
            "controls": [{
                "stack": {
                    "type": "stack_panel",
                    "size": [0, 0],
                    "collection_name": "hotbar_items",
                    "controls": [{
                        "slot@common.empty_panel": {
                            "collection_index": "$collection_index",
                            "bindings": [{
                                "binding_type": "collection",
                                "binding_name": "#item_id_aux",
                                "binding_collection_name": "hotbar_items",
                                "binding_condition": "visibility_changed"
                            }]
                        }
                    }],
                    "bindings": [{ /* propagate #item_id_aux up from slot → stack */ }]
                }
            }],
            "bindings": [{ /* propagate #item_id_aux from stack → inv renderer */ }]
        }
    }]
}
```

**Critical rule**: `collection_index` is only valid on a control whose **direct parent** has `collection_name` set. Without that parent context, Bedrock rejects it as an unknown property.

---

## What Was Attempted and Current State

### What works
- `hotbar_items` collection covers all 36 player inventory slots (indices 0–8 hotbar, 9–35 main inventory). No mirroring needed for the player's own items.
- `inventory_item_renderer` is the built-in renderer that draws 3D item models.
- `collection_index` on a panel inside a `collection_name`-owning `stack_panel` is the correct pattern.

### What was ruled out
- **Server forms** (`ActionFormData` etc.) — only support 2D `iconPath` images, not 3D item rendering.
- **`common.stack_panel`** — does not exist; use `"type": "stack_panel"` inline instead.
- **`@bedrock-core`'s own `item_cell` component** (`core-ui/components/item_renderer.json`) — uses `form_buttons` collection with aux encoded as `floor(#form_button_texture / 65536)`. This was confirmed broken/not working, which is why we're pursuing the WAILA approach instead.
- **Opening a hidden container** via script to get `container_items` — `player.openContainer(block)` does not exist in `@minecraft/server`.

### Current state of server_form.json
A self-contained `inv_slot` control was added to `server_form.json` that replicates the WAILA binding chain. All 36 slots in `player_inventory` now use it. The last set of errors showed `Unknown property [collection_index]` because `collection_index` was on a `@common.empty_panel` without a `collection_name` parent — this was just fixed by wrapping in a `stack_panel` with `collection_name: "hotbar_items"`.

Current `inv_slot` definition (as of last edit):

```json
"inv_slot@common.empty_panel": {
    "$ci|default": 0,
    "size": [18, 18],
    "controls": [
        {
            "stack": {
                "type": "stack_panel",
                "size": [0, 0],
                "collection_name": "hotbar_items",
                "controls": [{
                    "binder@common.empty_panel": {
                        "collection_index": "$ci",
                        "bindings": [{
                            "binding_type": "collection",
                            "binding_name": "#item_id_aux",
                            "binding_collection_name": "hotbar_items",
                            "binding_condition": "always"
                        }]
                    }
                }],
                "bindings": [{
                    "binding_type": "view",
                    "source_control_name": "binder",
                    "resolve_sibling_scope": true,
                    "source_property_name": "#item_id_aux",
                    "target_property_name": "#item_id_aux"
                }]
            }
        },
        {
            "renderer": {
                "type": "custom",
                "renderer": "inventory_item_renderer",
                "size": ["100%", "100%"],
                "layer": 2,
                "bindings": [{
                    "binding_type": "view",
                    "source_control_name": "stack",
                    "resolve_sibling_scope": true,
                    "source_property_name": "#item_id_aux",
                    "target_property_name": "#item_id_aux"
                }]
            }
        }
    ]
}
```

The `player_inventory` panel lays out all 36 slots:
- `main` (`stack_panel` vertical): 3 rows × 9 slots for indices 9–35
- `hotbar` (`stack_panel` horizontal): 9 slots for indices 0–8

Each slot is instantiated as e.g. `"s9@inv_slot": { "$ci": 9, "size": [18, 18] }`.

---

## Open Questions / Next Steps
1. **Does `hotbar_items` actually populate in `third_party_server_screen`?** — The last fix removed the `collection_index` error but items were not rendering before (tested before this fix was applied). This needs to be verified after the latest change.
2. If items still don't render, the question becomes whether `hotbar_items` is accessible in this screen context at all. It *should* be since the screen is shown during active gameplay, but this is unconfirmed.
3. If `hotbar_items` is not available, a fallback would need to be designed — possibly rendering the inventory display as a HUD overlay instead of inside the form screen.
