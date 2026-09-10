import { collectionKey } from '../../nodes/utils/shared';
import { CELL, placed } from './cell';
import { containerItemVars, hidesTransport } from './slot';
import type { Connector, Emit } from '../types';

/** A block of cells over a collection the screen does not own. */
export interface Grid {
  name: string;
  collection: string;
  columns: number;
  rows: number;
  interactive: boolean;
  /** Ask for the transport gate over a collection that is not the player's own. */
  hideOwned: boolean;
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
 * A grid's cell template, registered once per collection, interactivity and
 * owned-hiding. The item cell is used directly as the template, exactly as the
 * router's own redrawn grids do.
 */
const ensureGridCell = (ctx: Emit, data: Grid): string => {
  // One answer, used for both the name and the renderer: a definition keyed
  // 'plain' that carried the gated renderer would be shared by cells that must
  // not have it.
  const gated = hidesTransport(data.collection, data.hideOwned);
  const name = [
    'grid_cell',
    collectionKey(data.collection),
    data.interactive ? 'take' : 'display',
    gated ? 'owned' : 'plain',
  ].join('__');

  ctx.defs[`${name}@${CELL.item}`] ??= containerItemVars(
    data.collection,
    data.interactive,
    gated ? ctx.ownedRenderer : undefined,
  );

  return `${ctx.ns}.${name}`;
};
