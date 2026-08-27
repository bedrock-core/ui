import { buttonCell } from '../../components/Button';
import { slotCell, type SlotRole } from '../../components/Slot';
import type { JSX } from '../../jsx';
import { childElements } from '../guards';
import { analyze, type Analysis } from './analyze';

/**
 * What a built tree asks its host for, in document order.
 *
 * This is the seam between components and hosts. A component says what it
 * NEEDS — a cell it can be interacted through, a channel a value can travel on
 * — and knows nothing about how the need is met; a host decides what a need
 * costs and where it lands. Nothing here mentions a container slot, a form
 * entry or a collection, which is what lets the same walk serve every host.
 *
 * The order is the whole contract. Nothing is named and nothing is registered:
 * the build walks a tree once to decide the shape, the runtime walks the same
 * tree again per render, and the third button is the third button on both
 * sides because both walks visit the same elements in the same order.
 */

/** What a drawn cell is: a real slot with its role, or a button riding one. */
export type CellRole = SlotRole | 'button';

/** An element that needs a cell the player can reach. */
export interface CellClaim {
  readonly element: JSX.Element;
  readonly role: CellRole;
}

/** An element that needs a channel for a value that changes at runtime. */
export interface ChannelClaim {
  readonly element: JSX.Element;
  readonly carrier: 'text';
  /** How much of the carrier it reserves — for text, characters. */
  readonly length: number;
}

export interface Claims {
  readonly cells: readonly CellClaim[];
  readonly channels: readonly ChannelClaim[];
}

/**
 * How a component claims a cell: each answers with the role its element takes,
 * or nothing when the element needs no cell — a close button is the client's,
 * a foreign slot reads another collection. A list rather than a chain of
 * conditionals, so a component kind is added by adding an entry.
 */
const CLAIMS: readonly ((element: JSX.Element) => CellRole | undefined)[] = [buttonCell, slotCell];

const roleOf = (element: JSX.Element): CellRole | undefined => {
  for (const claims of CLAIMS) {
    const role = claims(element);

    if (role !== undefined) {
      return role;
    }
  }

  return undefined;
};

/**
 * Reads a built tree's needs, in document order.
 *
 * @param tree - A built tree, as `buildTree` leaves it.
 * @param analysis - What in it is live. Computed from the tree when omitted.
 */
export const claim = (tree: JSX.Element, analysis: Analysis = analyze(tree)): Claims => {
  const cells: CellClaim[] = [];
  const channels: ChannelClaim[] = [];

  const visit = (element: JSX.Element): void => {
    const role = roleOf(element);

    if (role !== undefined) {
      cells.push({ element, role });
    }

    const length = analysis.texts.get(element);

    if (length !== undefined) {
      channels.push({ element, carrier: 'text', length });
    }

    for (const child of childElements(element.props.children)) {
      visit(child);
    }
  };

  visit(tree);

  return { cells, channels };
};
