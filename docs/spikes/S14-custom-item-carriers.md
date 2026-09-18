# S14 — custom items as chest carriers, and presses as drops

**Status: answered 2026-09-18. A custom item's max durability is a stable identity JSON UI can
gate on, so the protocol no longer needs vanilla blocks for their item ids. A press routed to
`button.drop_one` fires on every desktop input, never touches the cursor, and names the player.**

## Why it was asked

Every item the runtime places is a legacy-range vanilla block, because JSON UI tells them apart
by `#item_id_aux` and only ids below 256 are the same in every world. A custom item's aux is
assigned at load. The question was whether another per-slot value can carry an identity that is
fixed by the item's own definition, and how much a single slot can carry besides.

Presses took the transport onto the cursor, where the engine draws it for a tick ([S13](./S13-chest-look-carrier.md)),
and the pressing player had to be inferred. The second question was whether a drop does better.

## The probe

A standalone pack pair: an entity with a 27-slot container claimed by the protocol sentinel,
custom items with different `max_durability`, `max_stack_size` and `minecraft:dyeable`, and an
overlay reading each slot through `collection_details` + `collection` bindings. Each row is a
gate drawn twice — `YES` on the expression, `no` on its negation — so a failed expression shows
both. Three cells route every input to `button.drop_one`; a script logs the slot changes, the
cursor, `entityItemDrop`, `entitySpawn` and `entityItemPickup`.

## Measured

### Durability as an identity and a value

- **Total and current read and gate exactly** on a custom item: `(#t = 1000)`, `(#c = 963)`
  after 37 damage, `(#c - 900) = 63`, `(#c * 2) = 1926`, `962 < #c < 964`.
- **Damage 0 still publishes current** (`#item_durability_visible` is `false` then, `true` once
  damaged). Damage equal to the maximum keeps the item, reading current 0.
- **`max_durability` is a signed 16-bit field.** 32767 reads back from script and gates in JSON
  UI; 65535 becomes -1, 16777216 becomes 0 and 16777217 becomes 1, and script refuses to set any
  damage on the non-positive ones.
- **Durability and stacking coexist.** An item with both `minecraft:durability` and
  `max_stack_size: 64` holds a stack of 10 that reads `'10'` and total 500 together.
- **An empty slot or a non-durable item fails every durability gate**, `(#t = 1000)` and
  `(#t > 0)` alike. Unlike stack count, an absent durability does not compare true.
- **A custom item's aux is not stable**: it measured 55967744 (id 854) here.

### Colour

- **`#item_custom_color` of a dyeable custom item is a signed ARGB int.** RGB `0x123456` set from
  script reads `-15584170` (`0xFF123456`); `(#col = -15584170)` holds and `('c=' + #col)`
  prints it. The RGB value alone, `(#col = 1193046)`, does not match.

### Operators

- **`/` works on a float.** `(#c / 3) = 321`, `(#t / 1000) = 1` and `0.9 < (#c / 1000) < 1` all
  hold with no assertion. The division that crashed the client in
  [jsonui-container-facts](./jsonui-container-facts.md) was on the stack count, a string.
- **Multiplying by a fraction is inexact**: `(#t * 0.001) = 1` is false on a total of 1000.
- **`%` is not an operator.** `((#c % 10) = 3)` alone asserts `Invalid expression` each time the
  screen opens. It is absent from the documented list (`+ - * / = > < and or not`).
- There is no floor or truncation, so a number packed from several fields cannot be split back
  apart; a value is compared whole or by range.
- `((#c + #t + (#c * #t)) = 964963)` showed both `YES` and `no`: an expression that deep fails.

### Presses as drops

- **Every desktop input drops exactly one**: click, right click, shift-click, Q, Ctrl+Q and
  double-click, each mapped to `button.drop_one`. 18 presses gave 18 drops.
- **The cursor never changes.** The item leaves the slot straight for the world.
- **In one tick**: the slot loses one, `entitySpawn` fires with the item entity, then
  `entityItemDrop` fires naming the player. A stack of one empties the slot.
- **A blank-icon item entity is invisible.** Removed in its `entitySpawn` tick, it is never
  picked up; left on the ground, it can be.
- **`entitySpawn` fires before `entityItemDrop`**, so an entity removed at spawn is invalid by the
  time the drop event reads it. The stack is read at spawn, the player from the drop event.

## What follows

A slot can carry an identity (max durability, 1..32767, fixed by the item definition), a value
(current durability, 0..32767), a count (2..64) and a colour (24 bits, an int that concatenates
into a key) at once, on items the addon registers itself. Presses become drops; a tap on touch
and a press on a controller drop the same way.
