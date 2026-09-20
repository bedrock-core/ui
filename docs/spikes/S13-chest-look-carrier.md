# S13 — carrying a button's look on a chest screen

**Status: round 1 answered 2026-09-18. A chest button's own slot can carry which look it wears: the
transport's stack size reads inside the button's cell and a quoted comparison on it gates a
control. Round 2: routing a press to the cursor fires it, but the engine draws the held transport
itself, icon and stack size, and no JSON UI control hides it.**

## Why it was asked

A form carries a look as an enum entry (`k<i>`) and draws one face per look. A chest screen has no
entries; everything it knows at runtime is an item in a slot. A button's slot already says whether
it is enabled, by which item it holds (transport or guard), so the question was whether the SIZE of
that stack is a second channel on the same slot — no bank slot, no new collection context.

## The probe

Every button on the showcase's `host_entity` and `host_block` screens held a stack of 3 transports.
Beside the cell, inside the panel `whenEnabled` gates, two labels read the slot through the same
`collection_details` + `collection` pair the enabled test uses: one showing
`#inventory_stack_count` raw, one visible on `(#probe_count = '3')`.

## Measured

- **The stack size reads.** Every enabled button showed `3`, including with the cell's own count
  label turned off (`$stack_count_required: false` hides the label, not the value).
- **A quoted comparison gates on it.** `(#probe_count = '3')` drew its label on every button — the
  string form the router's key gates already use.
- **A press moves the whole stack.** Auto-place carries all 3 transports to the player's inventory;
  the runtime reclaims them and the button fires as before.
- **The moved stack's count shows in the inventory** for the tick before it is reclaimed: the
  router's grids draw a transport as nothing, but not its count label.
- **A full inventory swallows the press.** Auto-place has nowhere to put the stack, so nothing
  moves and nothing fires — true at a stack of 1 as well.

## Round 2: the press on the cursor

Every item-moving route of a button went to `button.container_take_all_place_all` instead of
auto-place, so the stack lands on the cursor rather than in the inventory.

- **The press fires**, from the cursor as from the inventory.
- **The held stack is drawn under the pointer**: the command block and its size (`3`), for the
  tick before the script takes it back.
- **No JSON UI control draws it.** Hiding the pack's own cursor preview (already gated on the
  transport) and vanilla's (`common.inventory_selected_icon` and
  `common.inventory_selected_stack_size_text`, gated on `#inventory_selected_item` by
  modification) changed nothing, with no errors logged. The held item is the engine's.

## What follows

Look `i` rides as a stack of `i + 2` (a stack of one publishes no count), up to 63 looks per button,
with one face per look gated on the size in each state, and presses take the stack onto the cursor.
