import { ItemComponentTypes, ItemLockMode, type ItemStack } from '@minecraft/server';

/**
 * Items the container runtime owns, and how they are told apart from a player's.
 *
 * Three constraints shaped this, all measured in game:
 *
 *  - `setDynamicProperty` throws on any STACKABLE item, so a marker made from a
 *    normal vanilla stack cannot carry one. Lore works everywhere and is the
 *    portable half.
 *  - No `ItemLockMode` makes a container slot read-only. `slot` binds the item
 *    to a PLAYER slot instead: the take still succeeds, and the copy can then
 *    never be put back. Everything here is deliberately unlocked.
 *  - A float reaches JSON UI intact, so a ratio rides an item's damage value.
 *    Netherite tier gives 2031 steps, finer than any bar is wide.
 */

/** Marks every item the runtime placed, so an escaped one is identifiable. */
export const OWNED_LORE = '§8bcui';

/** Dynamic property carrying the same mark, where the item can hold one. */
export const OWNED_PROPERTY = 'bcui:owned';

/**
 * Claims an item for the runtime. Never locks it: a lock does not protect a
 * container slot and makes an escape unrecoverable for the player.
 */
export const claim = (stack: ItemStack): ItemStack => {
  stack.setLore([...stack.getLore(), OWNED_LORE]);

  if (stack.maxAmount === 1) {
    stack.setDynamicProperty(OWNED_PROPERTY, true);
  }

  stack.lockMode = ItemLockMode.none;

  return stack;
};

/** True for anything the runtime placed, however it escaped. */
export const isOwned = (stack: ItemStack): boolean =>
  stack.getLore().includes(OWNED_LORE) || stack.getDynamicProperty(OWNED_PROPERTY) === true;

/**
 * Writes a 0..1 value into an item's damage, so JSON UI can read it back as
 * `#item_durability_current_amount / #item_durability_total_amount`.
 *
 * @returns the same stack, for chaining.
 */
export const setRatio = (stack: ItemStack, ratio: number): ItemStack => {
  const durability = stack.getComponent(ItemComponentTypes.Durability);

  if (durability) {
    const clamped = Math.max(0, Math.min(1, Number.isFinite(ratio) ? ratio : 0));

    durability.damage = Math.round(durability.maxDurability * (1 - clamped));
  }

  return stack;
};

/**
 * Writes a small whole number into an item's damage, counting down from full.
 *
 * Used for the layout key: the router compares `#item_durability_current_amount`
 * against a literal, so storing `max - id` makes the binding read `id` straight
 * back with no arithmetic on the JSON UI side — which matters, because a
 * `$variable` there is silently dropped.
 */
export const setOrdinal = (stack: ItemStack, ordinal: number): ItemStack => {
  const durability = stack.getComponent(ItemComponentTypes.Durability);

  if (durability) {
    durability.damage = durability.maxDurability - ordinal;
  }

  return stack;
};
