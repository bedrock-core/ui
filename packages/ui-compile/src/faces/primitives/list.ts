import { entry, offsetOf, placed, topLeft } from '../utils/place';
import type { Box, ControlEntry, Face } from '../utils/types';

/** One row of a list: what it looks like, and how much room it takes before the next. */
export interface Row {
  /** A name of its own, so a screen filling the rows finds each where every control is found. */
  name: string;
  /** Already drawn, at the row's own origin. */
  control: ControlEntry;
  /**
   * The room the row takes in the stack: its own height plus the gap after it,
   * which is the distance to the next row. The last row takes its height alone.
   */
  span: number;
}

export interface ListFace extends Box {
  rows: readonly Row[];
  /** How many rows the build rendered. The rest are drawn hidden. */
  shown: number;
}

/**
 * A variable count on a frozen screen: every row compiled, the surplus hidden.
 *
 * A stack rather than a box, because a stack gives an invisible child no space
 * — measured, static and bound alike — so the rows that show pack from the top
 * and a scroll over the list reaches exactly that far. That is the one native
 * reflow a compiled screen has.
 *
 * Which rows show is the screen's to say: it turns each row into a gate on a
 * carried count. The face seeds them at the build's count so nothing flashes
 * before the first binding resolves.
 */
export const listFace: Face<ListFace> = data => entry(data.name, {
  type: 'stack_panel',
  orientation: 'vertical',
  ...placed(data),
  // A stack sizes itself to what it holds; only its width is the layout's.
  size: [data.rect.width, '100%c'],
  offset: offsetOf(data.rect),
  controls: data.rows.map((row, index): ControlEntry => ({
    [`${row.name}_row`]: {
      type: 'panel',
      size: [data.rect.width, row.span],
      ...topLeft,
      ...index < data.shown ? {} : { visible: false },
      controls: [row.control],
    },
  })),
});
