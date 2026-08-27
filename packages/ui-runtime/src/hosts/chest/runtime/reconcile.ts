import type { Allocation, SlotEntry } from '../allocate';
import { cellFor } from './cells';
import { writeChannels, type Written } from './channels';
import { type ItemContainer, sentinel } from './items';

/**
 * Making a container agree with a render.
 *
 * Nothing here clears the whole container: the drawn slots hold the players'
 * own items between opens, and the bank holds the channels of the last
 * session, which the next one overwrites cell by cell. Only what the runtime
 * placed is ever removed, and the runtime knows its own items by their mark.
 * What each cell writes to its own slot is that cell's business.
 */

export { isEnabled } from './cells';

/** Container indices of every button, the slots a render writes in the drawn range. */
export const buttonSlots = (slots: readonly SlotEntry[]): number[] =>
  slots.filter(entry => entry.role === 'button').map(entry => entry.slot);

/**
 * Makes every button's slot agree with its element, after a render changed
 * which buttons are enabled.
 *
 * The caller re-reads the button slots afterwards: they are in the drawn
 * range, and a write here would otherwise look like a press on the next poll.
 */
export const writeButtons = (container: ItemContainer, slots: readonly SlotEntry[]): void => {
  for (const entry of slots) {
    if (entry.role === 'button') {
      cellFor(entry.role).settle?.(container, entry);
    }
  }
};

/**
 * Brings a container up to a render at open.
 *
 * The sentinel gets the layout key, every drawn cell is settled by its role —
 * a button its transport or its guard, an output its guard, a storage slot
 * keeps the player's item and loses only what the runtime owns — and every
 * channel takes its value. Everything past the allocation is left alone.
 */
export const reconcile = (
  container: ItemContainer,
  allocation: Allocation,
  layout: number,
  written: Written,
): void => {
  written.clear();

  for (const [index, stack] of sentinel(layout).entries()) {
    container.setItem(allocation.sentinels[index] ?? index, stack);
  }

  for (const entry of allocation.slots) {
    cellFor(entry.role).settle?.(container, entry);
  }

  writeChannels(container, allocation.channels, written);
};
