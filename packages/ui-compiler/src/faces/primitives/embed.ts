import { entry } from '../utils/place';
import type { Box, Face } from '../utils/types';

export type EmbedFace = Box;

/**
 * Room kept for a screen another pack draws.
 *
 * It draws nothing on purpose: the pack holding the embedded screen bakes the
 * control that fills this. It exists in the tree only so the screen's own
 * numbering counts it, which is what keeps the embedded screen's entries where
 * its build put them.
 */
export const embedFace: Face<EmbedFace> = data => entry(data.name, {
  type: 'panel',
  size: [0, 0],
  visible: false,
});
