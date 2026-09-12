import { entry, placed } from '../utils/place';
import type { Box, Control, Face, Rect } from '../utils/types';

/** The empty-cell texture vanilla draws under every item cell. */
export const CELL_TEXTURE = 'textures/ui/cell_image';

/** The pitch of an item cell, which is what a grid draws its template at. */
export const CELL_PITCH = 18;

export type SlotFace = Box;

/**
 * An item cell, empty.
 *
 * A cell is only ever a frame here: the item in it belongs to a container, and
 * a container is a mechanism no face has. The screen serving this stands a
 * real cell over its own collection in this face's place.
 */
export const slotFace: Face<SlotFace> = data => entry(data.name, {
  ...cell(data.rect),
  ...placed(data),
});

/** The frame alone, at a rect, for the faces that draw several. */
export const cell = (rect: Rect): Control => ({
  type: 'image',
  texture: CELL_TEXTURE,
  size: [rect.width, rect.height],
  offset: [rect.x, rect.y],
  anchor_from: 'top_left',
  anchor_to: 'top_left',
  keep_ratio: false,
});
