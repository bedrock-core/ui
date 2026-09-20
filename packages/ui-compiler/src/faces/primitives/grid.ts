import { entry, placed } from '../utils/place';
import { CELL_PITCH, cell } from './slot';
import type { Box, ControlEntry, Face } from '../utils/types';

export interface GridFace extends Box {
  columns: number;
  rows: number;
}

/**
 * A block of item cells, empty.
 *
 * Laid out at the engine's own pitch rather than the layout's, because the
 * grid the screen stands here draws its template at that pitch and the face
 * has to agree with it cell for cell.
 */
export const gridFace: Face<GridFace> = data => entry(data.name, {
  type: 'panel',
  ...placed(data),
  controls: Array.from({ length: data.columns * data.rows }, (_, index): ControlEntry => ({
    [`cell_${String(index)}`]: cell({
      x: (index % data.columns) * CELL_PITCH,
      y: Math.floor(index / data.columns) * CELL_PITCH,
      width: CELL_PITCH,
      height: CELL_PITCH,
    }),
  })),
});
