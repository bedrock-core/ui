import { entry, placed, styled, surface } from '../utils/place';
import { caption } from './text';
import type { Box, ControlEntry, Face, TextStyle } from '../utils/types';

export interface DropdownFace extends Box {
  /** The closed box's own surface. */
  background?: string;
  /** The chosen option's caption, as the build rendered it. */
  text: string;
  style: TextStyle;
  /**
   * Drawn over the closed box, already positioned: the arrow, a divider,
   * whatever the theme puts there. The parts are the author's, so a dropdown
   * is customisable without a second primitive.
   */
  parts?: readonly ControlEntry[];
}

/**
 * A dropdown, closed.
 *
 * The closed box is the whole of the face, because the list is not part of the
 * control: it is an overlay, drawn over the screen and hosted at its root, so
 * that opening one moves nothing. That is what separates a dropdown from a
 * fold, which reveals its content in flow.
 *
 * A primitive rather than a composition, because on a modal the engine owns
 * the whole thing — the box, the popup it hosts, the picking between them —
 * and instantiates the list's rows itself from the options it was sent. The
 * only parts that are ours there are this box and the overlay's own surface.
 */
export const dropdownFace: Face<DropdownFace> = data => entry(data.name, {
  type: 'panel',
  ...placed(data),
  controls: [
    ...surface(styled(data.background), { layer: 1, anchored: true }),
    // Nothing to draw when nothing is chosen yet: an empty label still takes a
    // control, and the engine's own box replaces this the moment it mounts.
    ...data.text === '' ? [] : [{ caption: caption({ ...data.style, text: data.text, localize: false }) }],
    ...data.parts ?? [],
  ],
});
