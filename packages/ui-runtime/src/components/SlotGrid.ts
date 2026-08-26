import type { FunctionComponent, JSX } from '../jsx';
import { type ControlProps, withControl } from './control';
import { SLOT_CELL } from './Slot';

/** The host `type` emitted by {@link SlotGrid}. Only meaningful inside a `<Container>`. */
export const SLOT_GRID_TYPE = 'slot-grid';

export interface SlotGridProps extends ControlProps {
  /** JSON UI collection the grid reads, e.g. `inventory_items` or a custom one. */
  collection: string;
  /** Columns of cells. At least one. */
  columns: number;
  /** Rows of cells. At least one. */
  rows: number;
  /** The player can move items through it unless this is false. Default `true`. */
  interactive?: boolean;
  /**
   * Draw the cell that hides the runtime's transport item. For the player's own
   * inventory and hotbar, where a button's transport is auto-placed for a tick.
   * Default `false`.
   */
  hideOwned?: boolean;
}

/** What a built {@link SlotGrid} declares, read back by the compiler. */
export interface SlotGridConfig {
  collection: string;
  columns: number;
  rows: number;
  interactive: boolean;
  hideOwned: boolean;
}

/**
 * A grid of cells over a JSON UI collection the screen does not own.
 *
 * Unlike a `<Slot>`, it reads a whole collection at once — the player's own
 * inventory, another container's items, any collection — so the screen never
 * allocates or polls it: the engine's take/place drives an interactive grid,
 * and nothing drives a display-only one. Its size is fixed by the cell, at
 * `columns × rows` 18-texel cells, and the layout places it like any node.
 */
export const SlotGrid: FunctionComponent<SlotGridProps> = ({
  collection,
  columns,
  rows,
  interactive = true,
  hideOwned = false,
  ...rest
}: SlotGridProps): JSX.Element => {
  if (typeof collection !== 'string' || collection === '') {
    throw new RangeError('<SlotGrid> needs a `collection`: the JSON UI collection its cells read.');
  }

  if (!Number.isInteger(columns) || columns < 1) {
    throw new RangeError(`<SlotGrid> \`columns\` must be an integer >= 1. Got ${String(columns)}.`);
  }

  if (!Number.isInteger(rows) || rows < 1) {
    throw new RangeError(`<SlotGrid> \`rows\` must be an integer >= 1. Got ${String(rows)}.`);
  }

  return {
    type: SLOT_GRID_TYPE,
    props: {
      ...withControl({ width: columns * SLOT_CELL, height: rows * SLOT_CELL, ...rest }),
      collection,
      columns,
      rows,
      interactive,
      hideOwned,
    },
  };
};

/** The configuration a built `<SlotGrid>` carries, mirroring `slotInteractive`. */
export function slotGridConfig(element: JSX.Element): SlotGridConfig {
  const { collection, columns, rows, interactive, hideOwned } = element.props;

  return {
    collection: typeof collection === 'string' ? collection : '',
    columns: typeof columns === 'number' ? columns : 0,
    rows: typeof rows === 'number' ? rows : 0,
    interactive: interactive !== false,
    hideOwned: hideOwned === true,
  };
}
