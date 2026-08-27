import { type Analysis, type CellRole, claim } from '../../core/ir';
import type { JSX } from '../../jsx';

/**
 * How a form lays a screen's needs out in its own entries.
 *
 * The walk that reads those needs is shared and host-agnostic (`core/ir`);
 * what belongs here is the form's arithmetic, which is almost nothing — an
 * entry is cheap and uncapped, so unlike the chest there is no packing to do
 * and no budget to spend. Where the chest counts container slots and pays a
 * slot per character, a form pays one entry per element that needs one.
 *
 * ## Why every entry is a button
 *
 * `ActionFormData` numbers its entries in two different ways: a JSON UI
 * control reads `form_buttons` by COLLECTION index, which counts every entry,
 * while `response.selection` counts only the pressable ones. Interleave a
 * label and the two numberings drift apart, and every control would have to
 * carry both.
 *
 * So a compiled screen emits every entry through `button()` and lets the
 * COMPILED CONTROL decide whether it can be pressed — a cell with no press
 * simply has no button mappings and no `collection_details` binding, which is
 * what makes it inert (measured: without that binding a press is not
 * attributed at all). The two numberings then coincide by construction, and
 * nothing downstream has to know there were ever two.
 */

/** A cell that needs an entry of its own: it reports a press, or carries a value, or both. */
export interface EntryEntry {
  readonly element: JSX.Element;
  /** Index in `form_buttons`, and the `response.selection` a press comes back as. */
  readonly entry: number;
  /** What the cell is, when it takes a press. Absent for an entry that only carries a value. */
  readonly role?: CellRole;
  /** Characters reserved when the entry carries live text. */
  readonly length?: number;
}

/**
 * How a screen carves up a form.
 *
 * Cells come first in document order, then channels, so a screen reads the way
 * it was written and a press index is stable for as long as the shape is.
 */
export interface Placement {
  readonly entries: readonly EntryEntry[];
  /** How many `button()` calls the runtime makes. */
  readonly size: number;
}

/**
 * Numbers a built tree's cells and channels into form entries.
 *
 * The build bakes the numbers into JSON UI; the runtime runs this again on
 * every present and reads handlers and values off the same entries. Because it
 * is the same function over the same shape, the third button is the third
 * button on both sides by construction.
 */
export const allocate = (tree: JSX.Element, analysis?: Analysis): Placement => {
  const { cells, channels } = claim(tree, analysis);
  const entries: EntryEntry[] = [
    ...cells.map(({ element, role }, index) => ({ element, entry: index, role })),
    ...channels.map(({ element, length }, index) => ({
      element,
      entry: cells.length + index,
      length,
    })),
  ];

  return { entries, size: entries.length };
};
