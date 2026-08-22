# Spike — container screens

**Status: complete. All five questions answered.** Kept for the findings below;
delete every file listed at the bottom before release, but move the findings into
the compiler's documentation first.

Answers five questions about driving a real chest screen from a custom entity.

## Run it

1. `yarn watch` in `packages/resource-pack` (or `regolith run`).
2. Join the dev world, creative, **desktop** — the pocket/touch chest screen
   routes to `pocket_containers.*`, which this spike does not patch.
3. Place and press a **crimson button**.
4. An armor-stand-shaped entity named `BCUI:01` spawns two blocks ahead. Press
   use on it.

The chest screen opens with a read-out overlay in the top-left corner and a
battery bar to its right. **Everything the script observes goes to the content
log**, not chat -- chat only tells you where to stand.

```
%APPDATA%\Minecraft Bedrock\logs\ContentLog<newest>.txt
```

```bash
grep "bcui-spike" "$(ls -t "$APPDATA/Minecraft Bedrock/logs/"ContentLog*.txt | head -1)"
```

## What each probe answers

| # | Question | Where the answer shows |
| - | -------- | ---------------------- |
| Q1 | Which chest variant does `inventory_size: 54` route to? | `collection total` row. **27** = small screen, **54** = large. |
| Q2 | Is `$container_title` a usable channel? | **No, settled.** It is the entity *type* name key, ignores `nameTag`, and cannot be used in a binding expression. Routing goes through the sentinel slot. |
| Q3 | Can the player reach a slot the layout never draws? | Chat. Any `BANK BREACH` line means yes. |
| Q4 | Does `ItemLockMode.slot` refuse a move inside a chest? | Try to take slot 1 (locked diamond) and slot 2 (unlocked emerald). |
| Q5 | What does a 1-tick poll over 54 slots cost? | Chat, on close: `avg N ms/tick`. |

The battery bar is the sixth answer, unnumbered: it is driven by the durability
of the item in **slot 40**, which has no cell anywhere on screen. The script
sweeps it through a sine wave while you watch.

## What to do while it is open

1. **Take slot 1** (`§bLocked display`). It should refuse. If it moves, `Q4` is
   red and read-only display slots need poll-and-restore instead.
2. **Take slot 2** (`§aButton — take me`). It should snap back within a tick and
   chat should log `slot 2 emptied` then `slot 2 filled`. That round trip is the
   click channel.
3. **Put something in slot 3.** It is a genuine empty input slot.
4. **Shift-click a stack from your inventory** into the container, then
   **double-click** an item to collect, then **drag-distribute** across the grid.
   Do all three. Any `BANK BREACH` line means the engine addressed a slot with no
   cell, and the private-bank design needs a stronger guard than "keep it full".
5. **Watch the battery bar.** If it animates without the screen reopening, live
   state through the bank is proven.
6. Repeat on **gamepad and touch** if you can — quick-move paths differ.

Close the screen to get the poll cost and the escape sweep.

## Findings already banked

Collection addressing, from the first content-log run. These are the rules the
compiler will have to encode, so they are worth keeping even after the spike is
deleted:

- `collection_name` is legal on **`stack_panel`** and **`grid`** only. On `panel`
  and `image` the engine rejects it: *Unknown property [collection_name]*.
- `collection_index` is only accepted **at an instantiation site** -- an entry in a
  parent's `controls`, inline or `@`-referenced. On a top-level definition the
  engine rejects it: *Unknown property [collection_index]*. It is rejected on an
  `image` in any position, and on a `label` it is accepted silently and does
  nothing.
- The index **inherits down the subtree** from wherever it is applied, so the
  control that owns the binding sits *under* the one carrying the index.
- Consequence for the compiler: emit one small definition per control shape and
  apply the index, and the solved offset, at each reference. That is also why a
  slot grid costs one def plus N references rather than N defs.
- Bindings always name the collection themselves through
  `binding_collection_name`; the control tree only supplies the index.
- **A `$variable` cannot be used inside a binding's `source_property_name` in a
  subtree inserted through `modifications`.** Six in-game attempts, six identical
  *Must define a source property name in the binding!* failures, across every
  variation: quoted and bare, engine-injected `$container_title` and pack-defined
  `$bcui_expect`, declared on the parent and on the binding owner, with and
  without a `#property` in the expression. The identical binding with no variable
  in it parses every time.
  This is why the shipped `server_form` protocol works where this does not:
  `$protocol_header` lives on a control the pack owns outright, not one grafted
  into a vanilla tree. **Compiled container layouts must bake literals into
  expressions rather than parameterise them.**
- The blank probe rows were the same constraint, seen from the other side: the
  captions rendered because `$caption` sits in `text` (an ordinary property,
  substituted fine) while every value stayed empty because `$bind` sat inside a
  `bindings` array. **A shared, parameterised control template does not work in
  an inserted subtree** -- each probe now has its own def with literal binding
  names, which is exactly what the compiler will have to emit.
- **Per-slot binding types, measured.** `#collection_total_items` and
  `#item_id_aux` are **ints** and concatenate into text fine. `#item_lock_in_slot`
  is a **bool** and prints `true`/`false`. Stack count, durability current/total
  and storage all came back **blank**, which is what string + float does — so
  those four are **floats**.
  This is a display limit only: the battery bar proves the same float bindings
  work in arithmetic, comparisons and `#clip_ratio`. For text, bucket them with a
  comparison chain, or carry the number on an int channel.
- An empty slot reads `#item_id_aux` as **-1**.
- **`inventory_size: 200` works.** The container opens, `#collection_total_items`
  reports the full 200, every index binds, and populating all 200 slots costs
  14 ms once at spawn. No ceiling found yet, so `<SlotGrid>` is not bounded by
  anything discovered so far.
- **Cursor reclaim confirmed end to end.** Taking the button logged
  `reclaimed=cursor` — the copy in flight was found and cleared in the same
  tick, so the click left no duplicate behind.
- **Stack count cannot be displayed at all**, even bound straight to `text` the
  way vanilla does it. It is a float, and floats reach a label only through a
  comparison chain.
- **Restoring a taken slot duplicates the item.** Refilling slot 2 while the
  player still held the original produced two: the copy reappeared in slot 12 a
  tick later, and the close sweep had to reclaim 4 escaped items. A click handler
  must reclaim the taken instance, not just refill the slot.
- **The cursor is readable — `PlayerCursorInventoryComponent`.** `item` gives the
  stack in flight between slots and `clear()` removes it, so the reclaim can be
  complete in the same tick: container, then inventory, then cursor. Not
  populated under touch controls, so the close sweep stays as a backstop.
  This overturns "the cursor-held item is invisible to script" in the plan's
  hard-limits table.
- **`ItemLockMode.slot` is harmful on container items, not protective.** The lock
  binds the item to a *player* slot, not the container slot. In game: the player
  moves it out of the container freely, and then **cannot move it back** — it is
  stuck wherever it landed in their inventory until script clears it. So the
  lock does not stop the take and makes every escape worse.
  **No lock mode makes a container slot read-only. Poll-and-restore is the only
  mechanism**, and display items should carry `ItemLockMode.none`.
- **`$container_title` is the live `nameTag` after all.** The earlier
  `entity.unknown.name` came from a stale entity that never got named — that is
  the fallback when no nameTag is set. With one set, inserted controls render it.
  Useful as a per-open display string; still unusable in binding expressions.
- **`#item_durability_total_amount` reads 2031 on a netherite pickaxe**, confirming
  the high-resolution scalar channel end to end.
- **`ItemStack.setDynamicProperty` throws on stackable items**
  (`UnsupportedFunctionalityError: Cannot set dynamic properties on stackable
  items`). Only max-stack-1 items can carry one, so the plan's "tag every display
  item with an identifying dynamic property" only works for non-stackables. Lore
  works on everything and is the portable fallback.
  This is a second, independent reason the design already wanted **non-stackable
  custom items** for bank and display slots: it stops quick-move merging into
  them, and it is the only way they can hold dynamic properties.
- **A label cannot render a raw numeric binding.** The number has to be
  concatenated with a string first: `"source_property_name": "('n=' + #raw)"`,
  then bind that to `text`. Documented at
  <https://wiki.bedrock.dev/json-ui/type-conversion>. Related quirks from the same
  page, all of which the compiler will hit:
  - **string + float produces nothing.** Only ints concatenate. Rendering a float
    needs a comparison chain (`(0 + (#f > 0) + (#f > 1) + ...)`), which only covers
    1-10 and drops precision.
  - string to number is any arithmetic except addition: `(#str * 1)`.
  - booleans are numbers in arithmetic: `true` is 1, `false` is 0.
- **`$container_title` is the entity's *type* name key, not its `nameTag`.** With
  `localize: false` it renders literally as `entity.unknown.name` for an entity
  with no lang entry -- setting `nameTag` at runtime does not change it. So the
  title is a static, per-entity-type localized string, and there is no runtime
  title channel of any kind. Q2 is closed twice over.
- **Labels localize by default.** Literal text is looked up as a translation key
  first, so every label needs `"localize": false` or it renders as `Unknown`.
- Variables still substitute in ordinary properties, and only when the variable is
  the entire value: `"text": "$container_title"` works, `"text": "t: $container_title"`
  prints the dollar sign.
- `('%.Ns' * X)` takes a prefix only when **X is a binding**, not a string literal.
- **`inventory_size: 54` routes to `small_chest_screen`**, not the large one, and
  its grid draws 9x3 = 27 cells while `#collection_total_items` reports the full
  54. The private bank therefore exists in vanilla for free -- no grid patch, no
  collateral damage to real double chests.
- **The bank is readable and live.** The battery bar, driven only by the
  durability of the item in undrawn slot 40, animates while the screen stays
  open. That is the core of the design, confirmed in game.

Also: `minecraft:inventory` needs `"private": false`, or players cannot open the
container at all.

## Record the results

| Q | Result | Note |
| - | ------ | ---- |
| Q1 | **54 slots, small screen** | `inventory_size: 54` routes to `small_chest_screen`, whose grid draws 27. `#collection_total_items` reports 54. **27 free bank slots, no patch needed.** |
| Q2 | **display yes, logic no** | `$container_title` **is** the live `nameTag` and renders in inserted controls. It cannot be used in a binding expression, so routing still goes through the sentinel slot. |
| Q3 | **no breach** | ~20,000 ticks, 11 sessions, real shift-clicking. Every item landed in a drawn slot (12, 14, 20); nothing ever reached 27–53. Caveat: the bank was full throughout, so "keep it full" and "the UI never draws it" have not been separated yet. |
| Q4 | **lock is harmful; click channel works** | `ItemLockMode.slot` binds to a *player* slot: the take succeeds and the copy then cannot be returned. Locks removed everywhere; every managed slot is now poll-restored with cursor reclaim. The button round trip fired correctly. |
| Q5 | **0.3 ms at 54 slots, 3.3 ms at 200** | The cost tracks container size, so a full scan does not scale: ten players on a 200-slot screen would eat two thirds of the tick. **Poll the drawn range only** — the bank has no cell, so nobody can touch it between sweeps. Back to ~0.3 ms with a once-a-second integrity sweep of the bank. |

## Files

```
packs/BP/entities/spike_container.json                       entity, 54 slots
packs/BP/scripts/spike/container.ts                          session, poll, probes
packs/BP/scripts/main.ts                                     crimson button branch
packs/RP/entity/spike_container.entity.json                  vanilla art only
packs/RP/render_controllers/spike_container.render_controllers.json
packs/RP/ui/chest_screen.json                                the overlay + grid cut
packs/RP/ui/_ui_defs.json                                    one added line
```
