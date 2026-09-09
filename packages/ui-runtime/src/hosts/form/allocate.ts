import {
  MODAL_DROPDOWN_SLOT_TYPE, MODAL_INLINE_SELECT_SLOT_TYPE, MODAL_INPUT_SLOT_TYPE,
  MODAL_SLIDER_SLOT_TYPE, MODAL_TOGGLE_SLOT_TYPE,
} from '../../components/Form';
import { entryBaseOf } from '../../components/Embed';
import { liveTexture } from '../../components/Image';
import { listCapacity } from '../../components/List';
import { liveTextLength } from '../../components/Text';
import { type Analysis, type CellRole, claim } from '../../core/ir';
import { childElements } from '../../core/guards';
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
  /** What the entry carries, when it carries one: a live string, a visible bool, a list count, or a texture path. */
  readonly carrier?: 'text' | 'bool' | 'int' | 'texture';
  /** Characters reserved when the entry carries live text, digits for a count. */
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
  // An embedded screen's entries start after the host's marker slot.
  const base = entryBaseOf(tree);
  const entries: EntryEntry[] = [
    ...cells.map(({ element, role }, index) => ({ element, entry: base + index, role })),
    ...channels.map(({ element, carrier, length }, index) => ({
      element,
      entry: base + cells.length + index,
      carrier,
      // A bool needs no width; text and a count's digits reserve one.
      ...carrier === 'bool' ? {} : { length },
    })),
  ];

  return { entries, size: base + entries.length };
};

// ---------------------------------------------------------------------------
// The modal's rows
// ---------------------------------------------------------------------------

/**
 * What a `custom_form` row is, and which element owns it.
 *
 * A modal numbers differently from an action form and the two must not be
 * confused. An action form's entries are the CLAIMS a screen makes — a cell per
 * press, a channel per live string — because a compiled screen draws every one
 * of them itself. A modal's rows are the NATIVE CONTROLS, because the engine
 * draws those and nothing else can, plus a row per live string for the same
 * reason an action form needs one.
 *
 * `formValues` is positional over exactly this list, and MEASURED (S3): a
 * control the pack places owns its row by carrying a literal `collection_index`
 * plus its own `collection_details` binding on `custom_form`. So the number a
 * field is given here is the number the compiled control is baked with AND the
 * slot the response comes back in — one index space, three uses.
 *
 * Which is why this lives in one function. The build numbers a tree with it,
 * the runtime writes rows with it, and the emitted JSON UI is baked against it;
 * three walks that must agree, over one definition that cannot disagree.
 */
export interface ModalRow {
  readonly element: JSX.Element;
  /** Index in `custom_form`, and the `formValues` slot the answer arrives in. */
  readonly row: number;
  /** A native control the engine draws, or a value riding a label row: a live string, a visible bool, a list count, or a texture path. */
  readonly kind: 'field' | 'text' | 'bool' | 'int' | 'texture';
  /** Characters reserved when the row carries live text. */
  readonly length?: number;
}

/** The host types the ENGINE draws. Nothing else can, which is why they take rows. */
const NATIVE_FIELDS: ReadonlySet<string> = new Set([
  MODAL_TOGGLE_SLOT_TYPE,
  MODAL_SLIDER_SLOT_TYPE,
  MODAL_DROPDOWN_SLOT_TYPE,
  MODAL_INPUT_SLOT_TYPE,
  MODAL_INLINE_SELECT_SLOT_TYPE,
]);

/**
 * Every row a modal tree needs, in document order.
 *
 * Document order is the whole contract: nothing is named and nothing is
 * registered, so the nth row is the nth row on every side because every side
 * walks the same tree the same way.
 */
export const allocateModal = (tree: JSX.Element, visibles: ReadonlySet<JSX.Element> = new Set()): readonly ModalRow[] => {
  const rows: ModalRow[] = [];

  const visit = (node: JSX.Element): void => {
    const { type } = node;

    // The gate before the content, the same order the action form's claims
    // walk fixes: an element that is both live-visible and a live label takes
    // its bool row first.
    if (visibles.has(node)) {
      rows.push({ element: node, row: rows.length, kind: 'bool' });
    }

    if (typeof type === 'string') {
      if (NATIVE_FIELDS.has(type)) {
        rows.push({ element: node, row: rows.length, kind: 'field' });
      } else if (listCapacity(node) !== undefined) {
        rows.push({ element: node, row: rows.length, kind: 'int' });
      } else if (liveTexture(node)) {
        rows.push({ element: node, row: rows.length, kind: 'texture' });
      } else {
        const length = liveTextLength(node);

        if (length !== undefined) {
          rows.push({ element: node, row: rows.length, kind: 'text', length });
        }
      }
    }

    for (const child of childElements(node.props.children)) {
      visit(child);
    }
  };

  visit(tree);

  return rows;
};
