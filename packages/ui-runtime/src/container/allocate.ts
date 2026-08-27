import { buttonCell } from '../components/Button';
import { slotCell, type SlotRole } from '../components/Slot';
import { childElements } from '../core/guards';
import type { JSX } from '../jsx';
import { analyze, type Analysis } from './analyze';
import { SENTINEL_SLOTS } from './contract';

/** What a drawn cell is: a real slot with its role, or a button riding one. */
export type CellRole = SlotRole | 'button';

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
 * How a component claims a drawn cell: each answers with the role its element
 * takes, or nothing when the element takes no cell of the screen's container —
 * a close button is the client's, a foreign slot reads another collection.
 */
const CLAIMS: readonly ((element: JSX.Element) => CellRole | undefined)[] = [buttonCell, slotCell];

const claimOf = (element: JSX.Element): CellRole | undefined => {
  for (const claim of CLAIMS) {
    const role = claim(element);

    if (role !== undefined) {
      return role;
    }
  }

  return undefined;
};

/**
 * The one walk both sides of a container screen share.
 *
 * The build numbers cells and channels with it and bakes the numbers into JSON
 * UI; the runtime runs it again on every render and reads handlers and values
 * off the same entries. Because it is the same function over the same shape,
 * the third button is the third button on both sides by construction: nothing
 * is named, and nothing has to be kept in step.
 */
export const allocate = (tree: JSX.Element, analysis: Analysis = analyze(tree)): Allocation => {
  const slots: SlotEntry[] = [];
  const live: { element: JSX.Element; carrier: ChannelEntry['carrier']; length: number }[] = [];

  const visit = (element: JSX.Element): void => {
    const role = claimOf(element);

    if (role !== undefined) {
      slots.push({ element, slot: SENTINEL_SLOTS.length + slots.length, role });
    }

    const length = analysis.texts.get(element);

    if (length !== undefined) {
      live.push({ element, carrier: 'text', length });
    }

    for (const child of childElements(element.props.children)) {
      visit(child);
    }
  };

  visit(tree);

  // Channels start past the drawn range. A text run takes a slot per
  // character, so the next channel starts past the whole run.
  let next = SENTINEL_SLOTS.length + slots.length;

  const channels: ChannelEntry[] = live.map(({ element, carrier, length }) => {
    const entry: ChannelEntry = { element, slot: next, carrier, length };

    next += length;

    return entry;
  });

  return { sentinels: SENTINEL_SLOTS, slots, channels, size: next };
};
