import type { JSX } from '../../jsx';
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
 * button on both sides by construction: nothing is named, and nothing has to
 * be kept in step.
 */
export const allocate = (tree: JSX.Element, analysis?: Analysis): Allocation => {
  const { cells, channels } = claim(tree, analysis);
  const slots: SlotEntry[] = cells.map(({ element, role }, index) => ({
    element,
    slot: SENTINEL_SLOTS.length + index,
    role,
  }));

  // Channels start past the drawn range. A text run takes a slot per
  // character, so the next channel starts past the whole run.
  let next = SENTINEL_SLOTS.length + slots.length;

  const bank: ChannelEntry[] = channels.map(({ element, carrier, length }) => {
    const entry: ChannelEntry = { element, slot: next, carrier, length };

    next += length;

    return entry;
  });

  return { sentinels: SENTINEL_SLOTS, slots, channels: bank, size: next };
};
