import { buttonCell, BUTTON_TYPE } from '../../components/Button';
import { listCapacity } from '../../components/List';
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
  readonly carrier: 'text' | 'bool' | 'int';
  /** How much it reserves — characters for text, 1 for a bool, digits for an int. */
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

    // The gate before the content: an element that is both live-visible and a
    // live label claims its bool ahead of its text, so the order is a fact of
    // the walk rather than of the maps.
    if (analysis.visibles.has(element)) {
      channels.push({ element, carrier: 'bool', length: 1 });
    }

    // A list's count, declared by `max` the way `maxLength` declares text.
    const digits = listCapacity(element);

    if (digits !== undefined) {
      channels.push({ element, carrier: 'int', length: digits });
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

// ---------------------------------------------------------------------------
// The visible walk: one enumeration, three readers
// ---------------------------------------------------------------------------

/**
 * Every element whose `visible` could be carried, in document order.
 *
 * One walk with one exclusion, shared by the probe that detects a live
 * visible, the build that compiles its gate, and the runtime that recovers the
 * same elements from the snapshot's ordinals. A button's CHILDREN are its
 * face — baked by definition, the same exclusion the probe's baked-text scan
 * makes — so the button itself is a candidate and nothing under it is.
 *
 * The ordinal into this list is what the compiled snapshot records: positions
 * survive because a compiled screen's shape is frozen, which the probe
 * enforces at build and `debug` polices at runtime.
 */
export const visibleCandidates = (tree: JSX.Element): JSX.Element[] => visibleWalk(tree).elements;

/**
 * The same walk with each element's parent ordinal alongside (-1 for the
 * root). The probe needs the ancestry: the inherit pass stamps `visible:
 * false` down a hidden subtree, so every descendant of a flipped element
 * flips with it — and the carrier belongs to the subtree ROOT alone, because
 * one gate hides the whole subtree.
 */
export const visibleWalk = (tree: JSX.Element): { elements: JSX.Element[]; parents: number[] } => {
  const elements: JSX.Element[] = [];
  const parents: number[] = [];

  const visit = (element: JSX.Element, parent: number): void => {
    const ordinal = elements.length;

    elements.push(element);
    parents.push(parent);

    if (element.type === BUTTON_TYPE) {
      return;
    }

    for (const child of childElements(element.props.children)) {
      visit(child, ordinal);
    }
  };

  visit(tree, -1);

  return { elements, parents };
};

/** The elements a snapshot's visible ordinals name, on this render's tree. */
export const visiblesAt = (tree: JSX.Element, ordinals: readonly number[]): ReadonlySet<JSX.Element> => {
  const candidates = visibleCandidates(tree);
  const found = new Set<JSX.Element>();

  for (const ordinal of ordinals) {
    const element = candidates[ordinal];

    if (element !== undefined) {
      found.add(element);
    }
  }

  return found;
};
