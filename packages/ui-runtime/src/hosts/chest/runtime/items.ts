import { ItemLockMode, ItemStack } from '@minecraft/server';
import { MAX_CODE } from '../charset';
import {
  COUNT_ITEM, GUARD_ITEM, OWNED_LORE, OWNED_PROPERTY, PROTOCOL_ITEM, splitKey, TRANSPORT_ITEM,
} from '../contract';

/**
 * The items the runtime places, and how they are told apart from a player's.
 *
 * Two constraints shaped this, both measured in game:
 *
 *  - `setDynamicProperty` throws on any STACKABLE item, so a marker made from a
 *    normal vanilla stack cannot carry one. Lore works everywhere and is the
 *    portable half — and a stack carrying lore never merges with a player's
 *    plain stack of the same block, which is what keeps a marker a marker.
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

/** A claimed marker with a blank name, so nothing about it shows on hover. */
const marker = (typeId: string, amount: number): ItemStack => {
  const stack = new ItemStack(typeId, amount);

  stack.nameTag = ' ';

  return claim(stack);
};

/**
 * The sentinel: two stacks of the protocol item whose sizes spell the layout
 * key, high half first. Their item id is the protocol key.
 */
export const sentinel = (layout: number): readonly [ItemStack, ItemStack] => {
  const { high, low } = splitKey(layout);

  return [marker(PROTOCOL_ITEM, high), marker(PROTOCOL_ITEM, low)];
};

/**
 * The transport item behind a button.
 *
 * Nothing draws it — the compiler replaces a button's item renderer with an
 * empty control and turns off the count and the bars — so it exists purely so
 * that taking it produces a transaction the script can see. Its item id is
 * what the screen's own inventory and hotbar grids key on to draw a mid-flight
 * copy as nothing. The blank name covers the last visible surface: without
 * it, the tooltip on hover names the block out loud.
 */
export const transport = (): ItemStack => marker(TRANSPORT_ITEM, 1);

/** True for the item behind a button: the transport block, placed by the runtime. */
export const isTransport = (stack: ItemStack): boolean =>
  stack.typeId === TRANSPORT_ITEM && isOwned(stack);

/**
 * An output slot's placeholder. It keeps the slot from ever being empty, so a
 * shift-click cannot auto-place a stack into it — the engine only auto-places
 * into an empty or matching slot, and a lore-marked stack matches nothing.
 *
 * It is never seen and never touched, because the compiled output cell reads
 * its aux and swaps the WHOLE cell for an empty fake while it sits there:
 * nothing rendered, nothing hoverable, no button to take it with.
 */
export const guard = (): ItemStack => marker(GUARD_ITEM, 1);

/** True for an output slot's placeholder. */
export const isGuard = (stack: ItemStack): boolean =>
  stack.typeId === GUARD_ITEM && isOwned(stack);

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
