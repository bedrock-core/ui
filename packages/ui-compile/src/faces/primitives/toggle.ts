import { entry, placed, styled, surface } from '../utils/place';
import type { Box, Face } from '../utils/types';

export interface ToggleFace extends Box {
  /** Drawn while off. */
  off: string;
  /** Drawn while on. */
  on: string;
  /** Which side the build rendered with, and so which the face draws. */
  checked: boolean;
}

/**
 * A two-state switch.
 *
 * One primitive for every boolean: a switch and a checkbox differ only in the
 * two textures they are handed, which is why there is no checkbox face. What
 * flips it belongs to the screen — the engine's own toggle field on a modal, a
 * press that carries a bool anywhere else — and stands in this face's place.
 */
export const toggleFace: Face<ToggleFace> = data => entry(data.name, {
  type: 'panel',
  ...placed(data),
  controls: surface(styled(data.checked ? data.on : data.off), { layer: 1, anchored: true }),
});
