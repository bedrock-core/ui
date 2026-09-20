import { ItemComponentTypes, type ItemStack } from '@minecraft/server';
import type { ItemContainer } from './items';

/**
 * Remembering what the drawn range held, so a change can be noticed and read.
 *
 * An item moving is the only signal a container gives back: no click event, no
 * lock that makes a slot read-only, no way to veto a move. So the runtime
 * remembers what every drawn slot held, notices what changed, and lets the
 * slot's cell decide what the change meant.
 */

const safe = <T>(read: () => T): T | undefined => {
  try {
    return read();
  } catch {
    return undefined;
  }
};

/**
 * State Minecraft does not expose through one canonical comparison for an unstackable item.
 *
 * Stackable items use `isStackableWith`, which compares their complete custom data natively.
 * Minecraft deliberately returns false from that method for every unstackable item, so those
 * need their mutable script-visible state compared explicitly instead.
 */
const unstackableState = (item: ItemStack): string => JSON.stringify({
  nameTag: item.nameTag,
  lore: safe(() => item.getRawLore()) ?? safe(() => item.getLore()),
  canDestroy: safe(() => item.getCanDestroy()),
  canPlaceOn: safe(() => item.getCanPlaceOn()),
  keepOnDeath: item.keepOnDeath,
  lockMode: item.lockMode,
  dynamicProperties: safe(() => item.getDynamicPropertyIds().sort().map(id => [id, item.getDynamicProperty(id)])),
  book: safe(() => {
    const book = item.getComponent(ItemComponentTypes.Book);

    return book && {
      author: book.author,
      isSigned: book.isSigned,
      rawContents: book.rawContents,
      title: book.title,
    };
  }),
  durability: safe(() => {
    const durability = item.getComponent(ItemComponentTypes.Durability);

    return durability && { damage: durability.damage, unbreakable: durability.unbreakable };
  }),
  dye: safe(() => item.getComponent(ItemComponentTypes.Dyeable)?.color),
  enchantments: safe(() => item.getComponent(ItemComponentTypes.Enchantable)?.getEnchantments()
    .map(({ level, type }) => [type.id, level] as const)
    .sort(([a], [b]) => a.localeCompare(b))),
});

/** Whether two readings describe the same stack, including custom data and item components. */
export const sameStack = (before: ItemStack | undefined, after: ItemStack | undefined): boolean => {
  if (before === undefined || after === undefined) {
    return before === after;
  }

  if (before.typeId !== after.typeId || before.amount !== after.amount) {
    return false;
  }

  if (before.isStackable && after.isStackable) {
    return before.isStackableWith(after);
  }

  return unstackableState(before) === unstackableState(after);
};

/**
 * What each drawn slot held last time it was looked at, by container index.
 *
 * The saved stack says both whether a slot changed and which way it changed —
 * an input slot cares about items leaving, an output slot about items arriving.
 */
export interface Watch {
  held: (ItemStack | undefined)[];
}

export const createWatch = (): Watch => ({ held: [] });

/**
 * Re-reads drawn slots after the runtime, or a player, changed them.
 *
 * Anything the runtime writes would otherwise look like a player move on the
 * next tick, and the slot would fight itself.
 */
export const resync = (container: ItemContainer, watch: Watch, slots: readonly number[]): void => {
  for (const slot of slots) {
    watch.held[slot] = container.getItem(slot);
  }
};
