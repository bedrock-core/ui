import type { ItemStack } from '@minecraft/server';
import type { SlotEntry } from '../../allocate';
import { guard, isGuard, isOwned } from '../items';
import {
  actorOf, give, reclaimGuard, retrieve, startingWith, writeCursor,
} from '../players';
import type { PollHost } from '../poll';
import { resync } from '../watch';
import {
  type CellBehavior, isHandler, type RemoveHandler, validHost, validPlayer, validStack,
} from './types';

/**
 * What changed in an output slot, which always holds the guard when it has no
 * result. A shift-click can never land here — the slot is never empty — and a
 * guarded slot has no cell to click either, so what reaches this is one of:
 * the screen's own machinery writing a result over the guard, a take of a
 * result, or a swap over a result that tries to place. A placed item goes
 * back to the player; a taken result is theirs and is reported; the guard is
 * reclaimed if it left, and restored whenever no result stands.
 */
const handleOutput = (
  host: PollHost,
  entry: SlotEntry,
  before: ItemStack | undefined,
  after: ItemStack | undefined,
): void => {
  const { slot, element } = entry;
  const { onRemove } = element.props;

  // A result written over the guard is the machine's: no player can reach a
  // guarded slot — its cell has no button while the guard sits there — so the
  // write stands, and the screen that made it needs no event about it.
  //
  // Unless the guard is now on a player. The client draws the cell for the
  // result it last saw, and a click landing after the server has restored the
  // guard swaps the player's item in and the guard out: the one way a guard
  // leaves by a player's hand while something else arrives. A machine write
  // never moves the guard onto anyone, so finding it there is the tell, and
  // the swap is reversed.
  if ((before === undefined || isGuard(before)) && after !== undefined && !isGuard(after)) {
    const swapper = reclaimGuard(host.viewers);

    if (swapper !== undefined) {
      give(swapper, after);
      host.container.setItem(slot, guard());
      resync(host.container, host.watch, [slot]);
      host.trace(`output slot ${slot} — swap over the guard reversed`);

      return;
    }

    resync(host.container, host.watch, [slot]);
    host.trace(`output slot ${slot} — result written`);

    return;
  }

  // A real result the player took (the guard is not one). A swap takes it
  // onto the cursor while placing the player's item; a plain take empties the slot.
  const taken = before !== undefined && !isGuard(before) ? before : undefined;
  const actor = actorOf(host.ledger, host.viewers, taken, after);

  // A swap over a result is REVERSED, not accepted as a take: the result comes
  // back off the cursor and stands in the slot again, and the player's placed
  // item returns to them — onto the cursor when the engine lets the probe
  // write it, into their inventory otherwise. Only a result that could not be
  // found on any viewer stays taken, rather than being restored into a
  // duplicate.
  if (taken !== undefined && after !== undefined && !isGuard(after)) {
    const holder = retrieve(startingWith(actor, host.viewers), taken);

    if (holder !== undefined) {
      if (!writeCursor(holder, after)) {
        give(holder, after);
      }

      host.container.setItem(slot, taken);
      resync(host.container, host.watch, [slot]);
      host.trace(`output slot ${slot} — swap reversed`);

      return;
    }

    give(actor, after);
  }

  // Whatever left the guard onto a player is pulled back, so no one walks
  // off holding the invisible marker.
  reclaimGuard(host.viewers);

  host.container.setItem(slot, guard());
  resync(host.container, host.watch, [slot]);

  if (taken !== undefined) {
    host.handle(() => {
      if (isHandler<RemoveHandler>(onRemove) && validPlayer(actor) && validStack(taken) && validHost(host.host)) {
        onRemove({ player: actor, stack: taken, host: host.host, container: host.cells });
      }
    });
  }

  host.trace(`output slot ${slot} — ${taken ? 'take' : 'insert refused'}`);
};

/**
 * An output slot: items may be taken and nothing put in.
 *
 * Never empty: a placeholder holds the slot so a shift-click cannot auto-place
 * into it. A real result the screen left is kept.
 */
export const outputCell: CellBehavior = {
  role: 'output',

  settle(container, { slot }) {
    const item = container.getItem(slot);

    if (item === undefined || isOwned(item)) {
      container.setItem(slot, guard());
    }
  },

  changed: handleOutput,
};
