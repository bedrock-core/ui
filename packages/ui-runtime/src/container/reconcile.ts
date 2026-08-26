import type { JSX } from '../jsx';
import type { Allocation, SlotEntry } from './allocate';
import { writeChannels, type Written } from './channels';
import {
  guard, isGuard, isOwned, isTransport, type ItemContainer, sentinel, transport,
} from './items';

/**
 * Making a container agree with a render.
 *
 * Nothing here clears the whole container: the drawn slots hold the players'
 * own items between opens, and the bank holds the channels of the last
 * session, which the next one overwrites cell by cell. Only what the runtime
 * placed is ever removed, and the runtime knows its own items by their mark.
 */

/** Whether a button takes presses: the transport item is the enabled state. */
export const isEnabled = (element: JSX.Element): boolean => element.props.enabled !== false;

/** Container indices of every button, the slots a render writes in the drawn range. */
export const buttonSlots = (slots: readonly SlotEntry[]): number[] =>
  slots.filter(entry => entry.role === 'button').map(entry => entry.slot);

/**
 * Makes every button's slot agree with its element.
 *
 * The transport item IS the enabled state: a slot with one presses, and the
 * face reads the same fact to draw itself. A disabled button holds the
 * invisible placeholder instead of nothing, so its slot is never empty — a
 * shift-click cannot auto-place into it, and the face, gated on the transport,
 * still reads disabled. So `enabled={ready}` works the way it reads. An
 * unchanged button costs one read.
 *
 * The caller re-reads the button slots afterwards: they are in the drawn
 * range, and a write here would otherwise look like a press on the next poll.
 */
export const writeButtons = (container: ItemContainer, slots: readonly SlotEntry[]): void => {
  for (const { element, slot, role } of slots) {
    if (role !== 'button') {
      continue;
    }

    const item = container.getItem(slot);

    if (isEnabled(element)) {
      if (!(item && isTransport(item))) {
        container.setItem(slot, transport());
      }
    } else if (!(item && isGuard(item))) {
      container.setItem(slot, guard());
    }
  }
};

/**
 * Brings a container up to a render at open.
 *
 * The sentinel gets the layout key, every button its transport or nothing,
 * every channel its value. A drawn slot that is not a button loses only what
 * the runtime owns — a transport left by a layout that had a button there —
 * and keeps the player's item. Everything past the allocation is left alone.
 */
export const reconcile = (
  container: ItemContainer,
  allocation: Allocation,
  layout: number,
  written: Written,
): void => {
  written.clear();
  container.setItem(allocation.sentinel, sentinel(layout));

  for (const { slot, role } of allocation.slots) {
    if (role === 'button') {
      continue;
    }

    const item = container.getItem(slot);

    if (role === 'output') {
      // Never empty: a placeholder holds the slot so a shift-click cannot
      // auto-place into it. A real result the screen left is kept.
      if (item === undefined || isOwned(item)) {
        container.setItem(slot, guard());
      }
    } else if (item && isOwned(item)) {
      container.setItem(slot, undefined);
    }
  }

  writeButtons(container, allocation.slots);
  writeChannels(container, allocation.channels, written);
};
