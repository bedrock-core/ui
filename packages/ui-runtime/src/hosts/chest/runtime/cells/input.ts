import type { ItemStack } from '@minecraft/server';
import {
  actorOf, give, retrieve, startingWith,
} from '../players';
import type { PollHost } from '../poll';
import { resync } from '../watch';
import { keepPlayerItem, move } from './storage';
import type { CellBehavior } from './types';

/**
 * An item left an input slot. Off the player BEFORE it goes back in the slot:
 * the item is theirs and carries no mark, so writing the slot first and
 * hunting the copy afterwards — which is what `reclaim` does — finds nothing
 * and leaves them holding a duplicate.
 */
const refuseTake = (host: PollHost, slot: number, before: ItemStack): void => {
  const actor = actorOf(host.ledger, host.viewers, before, undefined);
  const undone = retrieve(startingWith(actor, host.viewers), before) !== undefined;

  if (undone) {
    host.container.setItem(slot, before);
  }

  resync(host.container, host.watch, [slot]);
  host.trace(`input slot ${slot} — take ${undone ? 'refused' : 'refused, NOT undone'}`);
};

/**
 * A different item was swapped over an input slot's contents: the original was
 * taken onto the cursor while the player's item took its place. An input slot
 * keeps what it was given, so the player's item goes back to them, the original
 * is pulled off the cursor, and the slot is restored — or cleared, if the
 * original could not be found, rather than duplicated.
 */
const refuseSwap = (host: PollHost, slot: number, before: ItemStack, after: ItemStack): void => {
  const actor = actorOf(host.ledger, host.viewers, before, after);

  give(actor, after);

  const undone = retrieve(startingWith(actor, host.viewers), before) !== undefined;

  host.container.setItem(slot, undone ? before : undefined);
  resync(host.container, host.watch, [slot]);
  host.trace(`input slot ${slot} — swap ${undone ? 'refused' : 'refused, original lost'}`);
};

/**
 * An input slot: items go in and do not come back out.
 *
 * Enforced by undoing, never by preventing: nothing in the container API can
 * veto a move, so a take is put back a tick later, and a swap is reversed.
 * Everything else is ordinary storage.
 */
export const inputCell: CellBehavior = {
  role: 'input',
  settle: keepPlayerItem,

  changed(host, entry, before, after) {
    if (before !== undefined && after === undefined) {
      refuseTake(host, entry.slot, before);
    } else if (before !== undefined && after !== undefined && after.typeId !== before.typeId) {
      refuseSwap(host, entry.slot, before, after);
    } else {
      move(host, entry, before, after);
    }
  },
};
