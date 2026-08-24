import type { ItemStack, Player } from '@minecraft/server';
import type { FunctionComponent, JSX } from '../../jsx';
import { type ControlProps, withControl } from '../control';
import { SLOT_SIZE } from './constants';
import { Slot, type SlotRole } from './Slot';

export interface SlotGridProps extends ControlProps {
  rows: number;
  cols: number;
  /** Applied to every cell. Defaults to `both`. */
  role?: SlotRole;
  /** Ran after an item arrives, with the cell's index in the grid. */
  onInsert?: (player: Player, stack: ItemStack, cell: number) => void;
  /** Ran after a cell empties. */
  onRemove?: (player: Player, cell: number) => void;
}

/**
 * A rectangle of slots.
 *
 * This is the shape nobody should hand-write, and the reason a 200-slot screen
 * is one line. It is a plain component — it expands to `rows * cols` `<Slot>`s
 * during the build, so the compiler sees them individually and allocates each an
 * index, exactly as if they had been written out.
 *
 * Handlers are shared and told which cell they are for, since a grid is usually
 * one thing rather than `rows * cols` things.
 */
export const SlotGrid: FunctionComponent<SlotGridProps> = ({
  rows,
  cols,
  role,
  onInsert,
  onRemove,
  ...rest
}: SlotGridProps): JSX.Element => {
  if (!Number.isInteger(rows) || !Number.isInteger(cols) || rows < 1 || cols < 1) {
    throw new RangeError(
      `<SlotGrid> needs whole positive rows and cols, got ${rows} x ${cols}.`,
    );
  }

  const cells: JSX.Element[] = Array.from({ length: rows * cols }, (_unused, cell) => Slot({
    role,
    ...onInsert ? { onInsert: (player, stack) => onInsert(player, stack, cell) } : {},
    ...onRemove ? { onRemove: player => onRemove(player, cell) } : {},
  }));

  return {
    type: 'panel',
    props: {
      ...withControl({
        width: cols * SLOT_SIZE,
        height: rows * SLOT_SIZE,
        flexDirection: 'row',
        flexWrap: 'wrap',
        ...rest,
      }),
      children: cells,
    },
  };
};
