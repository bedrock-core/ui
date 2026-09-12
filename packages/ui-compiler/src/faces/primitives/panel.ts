import { entry, over, placed, surface } from '../utils/place';
import type { Box, ControlEntry, Face } from '../utils/types';

export interface PanelFace extends Box {
  /** Nineslice texture drawn over the whole rect, under the children. */
  background?: string;
  /** Already drawn, positioned relative to this panel. */
  children: readonly ControlEntry[];
}

/**
 * A box holding other things.
 *
 * The layout solved every child a place of its own, so a panel does no
 * arranging: it draws a background if it has one and holds what it was given.
 */
export const panelFace: Face<PanelFace> = data => entry(data.name, {
  type: 'panel',
  ...placed(data),
  controls: over(surface(data.background), data.children),
});
