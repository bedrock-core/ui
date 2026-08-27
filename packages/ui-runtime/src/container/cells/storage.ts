import type { ItemStack } from '@minecraft/server';
import type { SlotEntry } from '../allocate';
import { isOwned, type ItemContainer } from '../items';
import { actorOf } from '../players';
import type { PollHost } from '../poll';
import { resync } from '../watch';
import {
  type CellBehavior, type InsertHandler, isHandler, type RemoveHandler, validHost, validPlayer, validStack,
} from './types';

/** A move a role allows: the component hears about it, then the slot is re-read. */
export const move = (host: PollHost, entry: SlotEntry, before: ItemStack | undefined, after: ItemStack | undefined): void => {
  const { slot, element } = entry;
  const { onInsert, onRemove } = element.props;
  const actor = actorOf(host.ledger, host.viewers, before, after);

  host.handle(() => {
    if (!validPlayer(actor) || !validHost(host.entity)) {
      return;
    }

    if (after) {
      if (isHandler<InsertHandler>(onInsert) && validStack(after)) {
        onInsert({ player: actor, stack: after, host: host.entity });
      }
    } else if (isHandler<RemoveHandler>(onRemove) && validStack(before)) {
      onRemove({ player: actor, stack: before, host: host.entity });
    }
  });

  // After the handler, which may have taken the item: what it left is what
  // the slot is expected to hold.
  resync(host.container, host.watch, [slot]);
  host.trace(`${after ? 'insert' : 'remove'} slot ${slot}`);
};

/**
 * A slot that keeps the player's own item between opens loses only what the
 * runtime owns — a transport left by a layout that had a button there.
 */
export const keepPlayerItem = (container: ItemContainer, { slot }: SlotEntry): void => {
  const item = container.getItem(slot);

  if (item && isOwned(item)) {
    container.setItem(slot, undefined);
  }
};

/** Ordinary storage: anything in, anything out, and the screen hears about both. */
export const storageCell: CellBehavior = {
  role: 'both',
  settle: keepPlayerItem,
  changed: move,
};
