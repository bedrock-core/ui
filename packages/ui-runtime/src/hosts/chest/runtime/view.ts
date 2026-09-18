import type { Container } from '@minecraft/server';
import type { ScreenHost } from '../../../core/events';
import {
  type ContainerSource, namedContainer, type NamedContainer, nameTable,
} from '../../../entity/container';
import type { SlotEntry } from '../allocate';
import type { ProtocolItems } from './items';
import { containerOf } from './target';
import { resync, type Watch } from './watch';

/**
 * The screen's own cells, as the vanilla container the AUTHOR wrote.
 *
 * The host's container is not the screen: its first slots carry the routing
 * key, buttons ride slots of their own, and the bank behind the drawn range
 * carries every live value. Through this view, index `i` is the `i`-th own
 * `<Slot>` in document order, `size` is how many of them there are, and a cell
 * carries the name its `<Slot>` declared. Sentinels, buttons and the bank are
 * not addressable at all — there is no index that reaches one.
 *
 * Nothing the runtime placed is visible either, so an output cell holding the
 * guard reads empty. Emptying an output cell puts the guard back in the same
 * call: the engine only auto-places into an empty or matching slot, and a
 * result the player has not taken must not be shift-clicked over. For the same
 * reason a bulk `addItem` skips output cells — an output cell is what the
 * machine published, not storage.
 */

export { containerOf };

/** The drawn cells that are the screen's own `<Slot>`s, in document order. */
const ownCells = (slots: readonly SlotEntry[]): readonly SlotEntry[] =>
  slots.filter(entry => entry.role !== 'button');

/** Each named cell's view index. */
const namesOf = <N extends string>(cells: readonly SlotEntry[]): Readonly<Record<N, number>> => {
  const names = nameTable<N>();
  const table: Record<string, number> = names;

  cells.forEach((entry, index) => {
    if (entry.name !== undefined) {
      table[entry.name] = index;
    }
  });

  return names;
};

/**
 * A container over the screen's own cells.
 *
 * `N` is the set of `<Slot name>` values the screen declares, when the caller
 * states it; left off, a name is an ordinary string and a misspelling is a
 * slot that is not there rather than a compile error.
 *
 * @param host - The entity or block the screen belongs to. Re-read on every
 *   access, so a host that goes away while the view is held reads as an absent
 *   container.
 * @param slots - The drawn cells of any render. The shape of a compiled screen
 *   is frozen, so every render numbers the same cells the same way.
 * @param items - The screen's protocol items, which the view hides.
 * @param watch - The live session's, when there is one. A write through the
 *   view is the SCREEN moving an item, and the poll would otherwise read it on
 *   the next tick as a player move and run the cell's handler for it.
 */
export const screenContainer = <N extends string = string>(
  host: ScreenHost,
  slots: readonly SlotEntry[],
  items: ProtocolItems,
  watch?: Watch,
): NamedContainer<N> => {
  const cells = ownCells(slots);
  const source: ContainerSource<N> = {
    names: namesOf<N>(cells),
    open: () => containerOf(host),
    size: () => cells.length,
    map: (_container: Container, index: number): number => cells[index]?.slot ?? -1,
    hidden: items.isOwned,
    vacated: (index: number) => (cells[index]?.role === 'output' ? items.guard() : undefined),
    fillable: (index: number): boolean => cells[index]?.role !== 'output',

    wrote: (container: Container, slot: number): void => {
      if (watch !== undefined) {
        resync(container, watch, [slot]);
      }
    },
  };

  return namedContainer(source);
};
