import { SLOT_GRID_TYPE, slotGridConfig } from '@bedrock-core/ui-runtime/compile';
import { collectionKey, layerOf, offsetOf, sizeOf, topLeft, visibilityOf } from './shared';
import { CELL, containerItemVars } from './slot';
import type { Emit, NodeBase, NodeDefinition } from './types';

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

/**
 * A grid's cell template, registered once per collection, interactivity and
 * owned-hiding. `container_item` is used directly as the template, exactly as
 * the router's own redrawn grids do.
 */
const ensureGridCell = (emit: Emit, node: GridNode): string => {
  const name = [
    'grid_cell',
    collectionKey(node.collection),
    node.interactive ? 'take' : 'display',
    node.hideOwned ? 'owned' : 'plain',
  ].join('__');
  const key = `${name}@${CELL.item}`;

  if (emit.defs[key] === undefined) {
    const renderer = node.hideOwned ? emit.ownedRenderer : undefined;

    emit.defs[key] = containerItemVars(node.collection, node.interactive, renderer);
  }

  return `${emit.ns}.${name}`;
};

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

  emit(node, ctx) {
    // A grid over a foreign collection: the grid declares the collection, so
    // each cell gets its index for free — no per-cell host is needed.
    return {
      [node.name]: {
        type: 'grid',
        size: sizeOf(node.rect),
        offset: offsetOf(node.rect),
        ...topLeft,
        ...layerOf(node),
        ...visibilityOf(node),
        grid_dimensions: [node.columns, node.rows],
        collection_name: node.collection,
        grid_item_template: ensureGridCell(ctx, node),
      },
    };
  },
};
