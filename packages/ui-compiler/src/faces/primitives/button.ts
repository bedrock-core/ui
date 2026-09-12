import { FULL, styled, topLeft } from '../utils/place';
import type { Control, ControlEntry } from '../utils/types';

/** The layer a button's baked children are drawn at, clear of every state's texture. */
const CONTENT_LAYER = 12;

/**
 * One of a button's looks: the texture, and the children over it.
 *
 * A button is the one primitive drawn four times over, once per state, because
 * the engine swaps between them without asking anyone — so a look is what this
 * layer draws, and the placing is the caller's. Every look is a SHARED
 * definition: two buttons that look the same are one of these, referenced
 * twice.
 *
 * The children go INSIDE each state rather than beside them. A button shows
 * the child its `*_control` names and hides the others, so a sibling of the
 * state controls is not what gets drawn. And they are layered above the
 * texture rather than merely written after it: draw order among siblings at
 * one layer is not what decides this, and a caption at the default vanishes
 * under the face.
 */
export const stateFace = (texture: string, content: readonly ControlEntry[]): Control => ({
  type: 'panel',
  size: FULL,
  ...topLeft,
  controls: [
    { bg: { type: 'image', texture: styled(texture), size: FULL, keep_ratio: false, layer: 1 } },
    ...content.map(child => raised(child, CONTENT_LAYER)),
  ],
});

/** One entry, lifted to a layer. */
const raised = (child: ControlEntry, layer: number): ControlEntry =>
  Object.fromEntries(Object.entries(child).map(([name, control]) => [name, { ...control, layer }]));
