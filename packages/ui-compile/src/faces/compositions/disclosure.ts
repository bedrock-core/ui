import { entry, offsetOf, placed, topLeft } from '../utils/place';
import { shownWhileOn, swap } from '../utils/swap';
import type { Box, Control, ControlEntry, Face } from '../utils/types';

export interface DisclosureFace extends Box {
  /** The header while the section is shut, already drawn. */
  header: Control;
  /** The header while it is open. */
  headerOpen: Control;
  headerHeight: number;
  /** Whether the build rendered it open. */
  open: boolean;
  /**
   * The swap's group, and the control name the rows look it up by.
   *
   * Both carry the screen's namespace on purpose. A sibling lookup is BY NAME,
   * and every gated compiled screen is constructed on every form open, so a
   * second screen's `disclosure_1_head` — another addon's guide index — was
   * the one the rows read: measured, the rows followed a toggle on a hidden
   * screen and never folded.
   */
  group: string;
  swapName: string;
  /** What folds away, already drawn, each row in its own stack row. */
  rows: readonly ControlEntry[];
}

/**
 * A section that opens and closes on the client, IN FLOW.
 *
 * The counterpart to an overlay: a fold's content takes room, so opening one
 * moves everything below it down, where a dropdown's list is drawn over the
 * screen and moves nothing.
 *
 * A stack, not a box: the rows have to reflow what is under them when they
 * fold, and a stack is the one thing that gives a hidden child no space. That
 * also forces the rows to be a SIBLING of the header rather than nested in its
 * open look, which is the one place a composition reads a swap back instead of
 * nesting inside it.
 *
 * Both header looks arrive drawn, so what a section looks like open and shut
 * is the author's and only the folding is the engine's.
 */
export const disclosureFace: Face<DisclosureFace> = (data) => {
  const head = data.swapName;
  const width = data.rect.width;

  const header: ControlEntry = {
    [head]: swap(
      { group: data.group, on: data.open },
      { on: data.headerOpen, off: data.header },
      { size: [width, data.headerHeight], ...topLeft, layer: 1 },
    ),
  };

  const rows: ControlEntry = {
    [`${data.name}_rows`]: shownWhileOn(head, data.open, {
      type: 'stack_panel',
      orientation: 'vertical',
      size: [width, '100%c'],
      ...topLeft,
      controls: [...data.rows],
    } satisfies Control),
  };

  return entry(data.name, {
    type: 'stack_panel',
    orientation: 'vertical',
    ...placed(data),
    size: [width, '100%c'],
    offset: offsetOf(data.rect),
    controls: [header, rows],
  });
};
