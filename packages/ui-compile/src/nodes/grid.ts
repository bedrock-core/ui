import { SLOT_GRID_TYPE, slotGridConfig } from '@bedrock-core/ui-runtime/compile';
import type { ControlEntry } from '../jsonui';
import { cellFrame, layerOf, offsetOf, sizeOf, topLeft, visibilityOf } from './shared';
import type { NodeBase, NodeDefinition } from './types';

/** The pitch of an item cell, which is what a `grid` draws its template at. */
export const CELL_PITCH = 18;

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

declare module './types' {
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
    const cells = Array.from({ length: node.columns * node.rows }, (_unused, index): ControlEntry => ({
      [`cell_${index}`]: cellFrame({
        x: (index % node.columns) * CELL_PITCH,
        y: Math.floor(index / node.columns) * CELL_PITCH,
        width: CELL_PITCH,
        height: CELL_PITCH,
      }),
    }));

    return {
      [node.name]: {
        type: 'panel',
        size: sizeOf(node.rect),
        offset: offsetOf(node.rect),
        ...topLeft,
        ...layerOf(node),
        ...visibilityOf(node),
        controls: cells,
      },
    };
  },
};
