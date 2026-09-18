import { collectionKey } from '../../nodes/utils/shared';
import { CELL, placed } from './cell';
import { containerItemVars } from './slot';
import type { Connector, Emit } from '../types';

/** A block of cells over a collection the screen does not own. */
export interface Grid {
  name: string;
  collection: string;
  columns: number;
  rows: number;
  interactive: boolean;
}

/**
 * A grid over a foreign collection.
 *
 * The grid itself declares the collection, so each cell gets its index for
 * free and no per-cell host is needed — the one place on this screen where the
 * index host rule does not apply.
 */
export const grid: Connector<Grid> = (data, face, ctx) => ({
  [data.name]: {
    type: 'grid',
    ...placed(face),
    grid_dimensions: [data.columns, data.rows],
    collection_name: data.collection,
    grid_item_template: ensureGridCell(ctx, data),
  },
});

/**
 * A grid's cell template, registered once per collection and interactivity.
 * The item cell is used directly as the template, exactly as the router's own
 * redrawn grids do.
 */
const ensureGridCell = (ctx: Emit, data: Grid): string => {
  const name = [
    'grid_cell',
    collectionKey(data.collection),
    data.interactive ? 'take' : 'display',
  ].join('__');

  ctx.defs[`${name}@${CELL.item}`] ??= containerItemVars(data.collection, data.interactive);

  return `${ctx.ns}.${name}`;
};
