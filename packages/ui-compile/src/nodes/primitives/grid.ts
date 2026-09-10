import { SLOT_GRID_TYPE, slotGridConfig } from '@bedrock-core/ui-runtime/compile';
import { CELL_PITCH, gridFace } from '../../faces';
import { boxOf } from '../utils/shared';
import type { NodeBase, NodeDefinition } from '../utils/types';

export { CELL_PITCH };

/**
 * A grid of cells over a collection the screen does not own — the player's
 * inventory or hotbar, or any JSON UI collection. Placed at its solved rect;
 * the runtime never allocates or polls it.
 */
export interface GridNode extends NodeBase {
  kind: 'grid';
  /** The collection every cell reads, e.g. `inventory_items`. */
  collection: string;
  columns: number;
  rows: number;
  /** Whether the player can move items through the cells. */
  interactive: boolean;
  /** Draw the cell that hides the runtime's transport item (inventory/hotbar). */
  hideOwned: boolean;
}

declare module '../utils/types' {
  interface IrNodeMap {
    grid: GridNode;
  }
}

export const gridDefinition: NodeDefinition<GridNode> = {
  kind: 'grid',
  types: [SLOT_GRID_TYPE],

  lower(element, _type, ctx): GridNode {
    const config = slotGridConfig(element);

    return {
      kind: 'grid',
      name: ctx.name('grid'),
      rect: ctx.rect,
      ...ctx.decoration,
      collection: config.collection,
      columns: config.columns,
      rows: config.rows,
      interactive: config.interactive,
      hideOwned: config.hideOwned,
    };
  },

  socket: () => 'grid',

  // At rest: the empty cells, one frame per cell at the engine's pitch. The
  // host stands a grid over its collection here.
  face(node) {
    return gridFace({ ...boxOf(node), columns: node.columns, rows: node.rows });
  },
};
