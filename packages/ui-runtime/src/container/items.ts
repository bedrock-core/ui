import { ItemComponentTypes, ItemLockMode, ItemStack } from '@minecraft/server';
import { MAX_CODE } from './charset';
import {
  COUNT_ITEM, GUARD_ORDINAL, OWNED_LORE, OWNED_PROPERTY, PROTOCOL_ITEM, TRANSPORT_ORDINAL,
} from './contract';

/**
 * The items the runtime places, and how they are told apart from a player's.
 *
 * Two constraints shaped this, both measured in game:
 *
 *  - `setDynamicProperty` throws on any STACKABLE item, so a marker made from a
 *    normal vanilla stack cannot carry one. Lore works everywhere and is the
 *    portable half.
 *  - No `ItemLockMode` makes a container slot read-only. `slot` binds the item
 *    to a PLAYER slot instead: the take still succeeds, and the copy can then
 *    never be put back. Everything here is deliberately unlocked.
 */

/**
 * The face of a `Container` the runtime reads and writes. An entity's
 * inventory and a player's are both one, which is what lets the same search
 * run over either.
 */
export interface ItemContainer {
  readonly size: number;
  getItem(slot: number): ItemStack | undefined;
  setItem(slot: number, stack?: ItemStack): void;
  getSlot(slot: number): { amount: number };
}

/**
 * Claims an item for the runtime. Never locks it: a lock does not protect a
 * container slot and makes an escape unrecoverable for the player.
 */
export const claim = (stack: ItemStack): ItemStack => {
  // The property where it fits, lore only where it does not. Lore is visible:
  // it is part of the item's tooltip, so an unstackable item carries the
  // property and keeps its hover text clean.
  if (stack.maxAmount === 1) {
    stack.setDynamicProperty(OWNED_PROPERTY, true);
  } else {
    stack.setLore([...stack.getLore(), OWNED_LORE]);
  }

  stack.lockMode = ItemLockMode.none;

  return stack;
};

/** True for anything the runtime placed, however it escaped. */
export const isOwned = (stack: ItemStack): boolean =>
  stack.getLore().includes(OWNED_LORE) || stack.getDynamicProperty(OWNED_PROPERTY) === true;

/** The ordinal an item's damage encodes, the inverse of {@link setOrdinal}. Undefined without durability. */
const ordinalOf = (stack: ItemStack): number | undefined => {
  const durability = stack.getComponent(ItemComponentTypes.Durability);

  return durability ? durability.maxDurability - durability.damage : undefined;
};

/**
 * True for the item behind a button: the protocol item at the transport
 * ordinal. The ordinal matters — the guard is the same item one ordinal up,
 * and reading it as a transport would fire presses off output slots.
 */
export const isTransport = (stack: ItemStack): boolean =>
  stack.typeId === PROTOCOL_ITEM && ordinalOf(stack) === TRANSPORT_ORDINAL && isOwned(stack);

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

/** A claimed protocol item with a blank name, so nothing about it shows on hover. */
const protocolItem = (ordinal: number): ItemStack => {
  const stack = new ItemStack(PROTOCOL_ITEM, 1);

  setOrdinal(stack, ordinal);
  stack.nameTag = ' ';

  return claim(stack);
};

/** The sentinel: its item id is the protocol key, its durability the layout key. */
export const sentinel = (layout: number): ItemStack => protocolItem(layout);

/**
 * The transport item behind a button.
 *
 * Nothing draws it — the compiler replaces a button's item renderer with an
 * empty control and turns off the count and the bars — so it exists purely so
 * that taking it produces a transaction the script can see.
 *
 * Its durability is pinned to {@link TRANSPORT_ORDINAL}, which is what the
 * screen's own inventory and hotbar grids key on to draw a mid-flight copy as
 * nothing. The blank name covers the last visible surface: without it, the
 * tooltip on hover names the protocol item out loud.
 */
export const transport = (): ItemStack => protocolItem(TRANSPORT_ORDINAL);

/**
 * An output slot's placeholder: the protocol item at {@link GUARD_ORDINAL}. It
 * keeps the slot from ever being empty, so a shift-click cannot auto-place a
 * stack into it — the engine only auto-places into an empty or matching slot.
 *
 * It is never seen and never touched, because the compiled output cell reads
 * its aux and ordinal and swaps the WHOLE cell for an empty fake while it sits
 * there: nothing rendered, nothing hoverable, no button to take it with. That
 * check needs a compile-time aux, which is why the guard is the vanilla marker
 * rather than a custom item — a custom item's aux is assigned at load.
 */
export const guard = (): ItemStack => protocolItem(GUARD_ORDINAL);

/** True for an output slot's placeholder: the protocol item at the guard ordinal. */
export const isGuard = (stack: ItemStack): boolean =>
  stack.typeId === PROTOCOL_ITEM && ordinalOf(stack) === GUARD_ORDINAL;

/**
 * Writes one character cell.
 *
 * The cheap path, and the reason a string costs so little to update: the code
 * rides the stack size, which is a settable property, so it lands with ONE
 * native call and nothing allocated.
 */
export const writeCell = (container: ItemContainer, slot: number, code: number): void => {
  const amount = Math.max(1, Math.min(MAX_CODE, Math.round(code)));

  if (container.getItem(slot)?.typeId === COUNT_ITEM) {
    container.getSlot(slot).amount = amount;

    return;
  }

  container.setItem(slot, claim(new ItemStack(COUNT_ITEM, amount)));
};
