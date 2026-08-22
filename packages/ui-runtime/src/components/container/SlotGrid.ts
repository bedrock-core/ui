import type { FunctionComponent, JSX } from '../../jsx';
import { type ControlProps, withControl } from '../control';
import { SLOT_SIZE } from './constants';
import { Slot } from './Slot';

export interface SlotGridProps extends ControlProps {
  /** Prefix for the generated slot names: `bay` yields `bay_0`, `bay_1`, … */
  name: string;
  rows: number;
  cols: number;
}

/**
 * A rectangle of slots, named by position.
 *
 * This is the shape nobody should hand-write, and the reason a 200-slot screen
 * is one line. It is a plain component — it expands to `rows * cols` `<Slot>`s
 * during the build, so the compiler sees the slots individually and allocates
 * each an index, exactly as if they had been written out.
 *
 * Names are positional and stable: `bay_0` is always the top-left cell. A script
 * addresses one directly, or matches the prefix to treat the grid as a unit.
 */
export const SlotGrid: FunctionComponent<SlotGridProps> = (
  { name, rows, cols, ...rest }: SlotGridProps,
): JSX.Element => {
  if (!Number.isInteger(rows) || !Number.isInteger(cols) || rows < 1 || cols < 1) {
    throw new RangeError(
      `<SlotGrid name="${name}"> needs whole positive rows and cols, got ${rows} x ${cols}.`,
    );
  }

  const cells: JSX.Element[] = Array.from(
    { length: rows * cols },
    (_, index) => Slot({ name: `${name}_${index}` }),
  );

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
