import type { Control, ControlEntry } from './types';
import { topLeft } from './place';

/** Expand only the native input control; its parent remains the authored paint box. */
export const hitArea = (slop = 0): Partial<Control> => slop === 0
  ? {}
  : {
      size: [`100% + ${String(slop * 2)}px`, `100% + ${String(slop * 2)}px`],
      offset: [-slop, -slop],
      ...topLeft,
    };

/** Restore an expanded input control's state to the authored background and content box. */
export const paintArea = (slop = 0): Partial<Control> => slop === 0
  ? {}
  : {
      size: [`100% - ${String(slop * 2)}px`, `100% - ${String(slop * 2)}px`],
      offset: [slop, slop],
      ...topLeft,
    };

/** A native button owns its state controls; their paint stays inside the original box. */
export const paintState = (entry: ControlEntry, slop = 0): ControlEntry => slop === 0
  ? entry
  : Object.fromEntries(Object.entries(entry).map(([name, control]) => [name, { ...control, ...paintArea(slop) }]));
