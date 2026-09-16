import type { JSX } from '../../jsx';
import { slotName } from '../../components/Slot';
import { type Analysis, type CellRole, claim } from '../../core/ir';
import { SENTINEL_SLOTS } from './contract';

/**
 * How the chest host lays a screen's needs out in one container.
 *
 * The walk that reads those needs is shared and host-agnostic (`core/ir`);
 * what belongs here is the chest's own arithmetic — where the routing keys
 * sit, that a drawn cell is one container slot, that a text channel is one
 * slot per character, and how big the entity's inventory has to be.
 */

export type { CellRole } from '../../core/ir';

/** A drawn cell and the container index it was given. */
export interface SlotEntry {
  readonly element: JSX.Element;
  readonly slot: number;
  readonly role: CellRole;
  /**
   * What the author called this cell, on an own `<Slot name>`. Buttons carry
   * none — a press is reported to its handler, so there is nothing to look up
   * — and a cell the author left unnamed is reached by iterating instead.
   */
  readonly name?: string;
}

/**
 * A run of bank slots carrying one live value. A text run takes a slot per
 * character.
 */
export interface ChannelEntry {
  readonly element: JSX.Element;
  readonly slot: number;
  readonly carrier: 'text';
  readonly length: number;
}

/**
 * How a screen carves up its container.
 *
 * The first slots are the sentinel carrying the routing keys. Drawn cells
 * follow in document order, so a screen reads left to right, top to bottom,
 * the way it was written. Channels come last, in the bank, past anything a
 * cell can reach.
 */
export interface Allocation {
  /** Container indices carrying the routing keys, never drawn. */
  readonly sentinels: readonly number[];
  readonly slots: readonly SlotEntry[];
  readonly channels: readonly ChannelEntry[];
  /** `minecraft:inventory` size the entity needs to host the screen. */
  readonly size: number;
}

/**
 * Numbers a built tree's cells and channels into container indices.
 *
 * The build bakes the numbers into JSON UI; the runtime runs this again on
 * every render and reads handlers and values off the same entries. Because it
 * is the same function over the same shape, the third button is the third
 * button on both sides by construction: the match is positional, and nothing
 * has to be kept in step. An own slot's `name` rides along as a label addon
 * logic looks a cell up by; no pass here matches on it.
 */
export const allocate = (tree: JSX.Element, analysis?: Analysis): Allocation => {
  const { cells, channels } = claim(tree, analysis);
  const slots: SlotEntry[] = cells.map(({ element, role }, index) => ({
    element,
    slot: SENTINEL_SLOTS.length + index,
    role,
    name: slotName(element),
  }));

  // Channels start past the drawn range. A text run takes a slot per
  // character, so the next channel starts past the whole run.
  let next = SENTINEL_SLOTS.length + slots.length;

  const bank: ChannelEntry[] = channels.map(({ element, carrier, length }) => {
    // Needs vs offers, at the seam it bites: the chest carries text — a slot
    // per character — and nothing else yet. A bool claim can only appear here
    // if a caller marked a carried visible on a chest tree, which the build
    // refuses long before this; the throw keeps the runtime as honest.
    if (carrier !== 'text') {
      throw new Error(`A chest screen has no carrier for a live ${carrier}; only text travels over slots.`);
    }

    const entry: ChannelEntry = { element, slot: next, carrier, length };

    next += length;

    return entry;
  });

  return { sentinels: SENTINEL_SLOTS, slots, channels: bank, size: next };
};
