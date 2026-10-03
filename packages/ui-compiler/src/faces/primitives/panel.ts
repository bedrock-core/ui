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
 * A panel draws its background and holds its children. Responsive panels retain
 * native percentages and edge anchors so Bedrock sizes them against their parent.
 */
export const panelFace: Face<PanelFace> = data => entry(data.name, {
  type: 'panel',
  ...placed(data),
  controls: over(surface(data.background), data.children),
});
