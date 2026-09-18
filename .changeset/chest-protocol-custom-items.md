---
'@bedrock-core/ui-runtime': minor
'@bedrock-core/ui-compiler': minor
---

**Breaking.** A container screen's protocol rides custom items, and a press is a drop.

Every item the runtime places — the sentinel, a button's transport, a guard, a bank cell — is a custom item the addon registers under the namespace of the entity or block its screen opens from, named `<namespace>:core_<hash>`. A compiled screen identifies each by its max durability instead of `#item_id_aux`, so nothing depends on vanilla item ids. The sentinel takes one slot and carries the layout key as its current durability; a button's look rides its item's current durability rather than its stack size. The ui-compiler filter writes the items; the render pack ships the blank icon they draw.

Every input a button routes drops its item: nothing of the runtime's reaches a cursor or an inventory, and the press goes to the player the drop event names. Rebuild every addon with the new filter and update the render pack with the library.

Removed: `SlotGrid`'s `hideOwned` prop, which only hid a transport that no longer reaches the player, and the `PROTOCOL_ITEM`, `TRANSPORT_ITEM`, `GUARD_ITEM`, `COUNT_ITEM`, their `_AUX` values, `splitKey`, `joinKey`, `lookStack`, `OWNED_LORE` and `OWNED_PROPERTY` exports. Added: `IDENTITY`, `PROTOCOL_ROLES`, `protocolItemId`, `protocolItemDefinitions`, `namespaceOf` and `BLANK_ICON`.
