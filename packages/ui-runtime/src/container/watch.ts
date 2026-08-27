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

/** `typeId|amount|damage` — enough to notice any move, cheap enough per tick. */
export const fingerprint = (container: ItemContainer, slot: number): string => {
  const item = container.getItem(slot);

  if (!item) {
    return '';
  }

  return `${item.typeId}|${item.amount}|${item.getComponent(ItemComponentTypes.Durability)?.damage ?? 0}`;
};

/**
 * What each drawn slot held last time it was looked at, by container index.
 *
 * A fingerprint says THAT a slot changed; enforcing a role needs to know WHICH
 * WAY — an input slot cares about items leaving, an output slot about items
 * arriving — and that is only answerable against the previous contents.
 */
export interface Watch {
  expected: string[];
  held: (ItemStack | undefined)[];
}

export const createWatch = (): Watch => ({ expected: [], held: [] });

/**
 * Re-reads drawn slots after the runtime, or a player, changed them.
 *
 * Anything the runtime writes would otherwise look like a player move on the
 * next tick, and the slot would fight itself.
 */
export const resync = (container: ItemContainer, watch: Watch, slots: readonly number[]): void => {
  for (const slot of slots) {
    watch.expected[slot] = fingerprint(container, slot);
    watch.held[slot] = container.getItem(slot);
  }
};
