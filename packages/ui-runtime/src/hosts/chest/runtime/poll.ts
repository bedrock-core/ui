import type { Player } from '@minecraft/server';
import type { ScreenHost } from '../../../core/events';
import type { NamedContainer } from '../../../entity';
import type { SlotEntry } from '../allocate';
import { cellFor } from './cells';
import { firePending } from './cells/button';
import type { ItemContainer, ProtocolItems } from './items';
import { cursorOf, type Ledger, remember } from './players';
import { fingerprint, type Watch } from './watch';

/**
 * Watching the drawn range, and letting each cell answer for its slot.
 *
 * An item moving is the only signal a container gives back: no click event, no
 * lock that makes a slot read-only, no way to veto a move. So the runtime
 * remembers what every drawn slot held, notices what changed, and hands the
 * change to the slot's cell — a press when a transport was dropped, a refusal when a
 * role said no, an insert or a removal otherwise. Nothing is prevented; a
 * forbidden move is put back a tick later.
 */

export { createWatch, fingerprint, resync, type Watch } from './watch';
export {
  actorOf, createLedger, give, type Ledger, remember, retrieve, sweep,
} from './players';

/** What one poll runs against: a session, seen from the drawn range. */
export interface PollHost {
  readonly container: ItemContainer;
  /** The entity or block that owns the screen, handed to slot handlers as their host. */
  readonly host: ScreenHost;
  /** Everyone with the screen open. Never empty while a poll runs. */
  readonly viewers: readonly Player[];
  readonly watch: Watch;
  /** What every viewer carried at the last poll, so a move can be traced to its mover. */
  readonly ledger: Ledger;
  /** The screen's protocol items: what it places, and how it recognises them. */
  readonly items: ProtocolItems;
  /**
   * Viewers whose transport drop was heard since the last poll, oldest first.
   * A press takes the first; what no press took is forgotten once the poll is done.
   */
  readonly drops: Player[];
  /** Presses with no dropper on record yet, by button slot, reported by the next poll. */
  readonly waiting: Map<number, number>;
  /**
   * The drawn cells of the latest render. Read again after every handler,
   * because a handler re-renders and the entries it left behind are stale.
   */
  readonly slots: readonly SlotEntry[];
  /**
   * The screen's own cells, as the handlers reach them: the drawn `<Slot>`s
   * in document order, with the sentinel, the buttons and the bank invisible.
   * Read per event rather than kept, so it follows the latest render.
   */
  readonly cells: NamedContainer<string>;
  /**
   * Runs a handler, then settles the container: buttons come and go with the
   * state the handler changed, channels take their new values, the button
   * slots are re-read, and the state is written to the host.
   */
  handle(run: () => void): void;
  /** Says what just happened and where everything ended up, when debugging. */
  trace(label: string): void;
}

/**
 * One tick over the drawn range.
 *
 * Only the drawn range. Scanning the whole container costs in proportion to
 * its size — 3.3 ms at 200 slots against 0.3 ms at 54 — and nothing outside
 * the drawn range has a cell the player could reach.
 *
 * A role is undone, never prevented: nothing in the container API can veto a
 * move, so the only enforcement available is to put things back a tick later.
 * `input` refuses removals, `output` refuses insertions. A locked slot never
 * changes, because the engine refuses every route into its inert cell.
 *
 * With several viewers, what each carries is read again once the cells have
 * answered, so the next tick's moves are traced against this one's state.
 * One viewer is never traced: there is no one else it could have been.
 */
export const poll = (host: PollHost): void => {
  const { container, watch, viewers } = host;
  const count = host.slots.length;

  if (viewers.length === 0) {
    return;
  }

  // Last tick's presses first: the drop events that name their players have
  // arrived since.
  firePending(host);

  // By index rather than over the entries: a handler re-renders, and the
  // drawn cells of the render it produced carry the handlers that apply from
  // then on. The shape is frozen, so the nth cell is the nth cell throughout.
  for (let index = 0; index < count; index += 1) {
    const entry = host.slots[index];
    const { slot, role } = entry;

    if (fingerprint(container, slot) === watch.expected[slot]) {
      continue;
    }

    cellFor(role).changed(host, entry, watch.held[slot], container.getItem(slot));
  }

  // Nothing of ours belongs on a cursor: a press drops its item, and an output
  // guard sits in a slot no cell can take from. After the cells have answered
  // — an output reverses a late swap by the guard it finds there — one still
  // on a cursor leaves the player holding something invisible, with no
  // tooltip and a click that places nothing, so it is taken off, and said.
  for (const viewer of viewers) {
    const cursor = cursorOf(viewer);

    if (cursor?.item !== undefined && host.items.isOwned(cursor.item)) {
      console.warn(`[core.ui] took a ${host.items.roleOf(cursor.item) ?? 'protocol item'} off ${viewer.name}'s cursor`);
      cursor.clear();
    }
  }

  host.drops.length = 0;

  if (viewers.length > 1) {
    remember(host.ledger, viewers);
  }
};
