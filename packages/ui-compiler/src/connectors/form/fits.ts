import { FULL, topLeft } from '../../faces';
import { entryValueBinding } from './entry';
import { countAmong } from './list';
import type { Connector, ControlEntry } from '../types';

/** A two-width region's payload: the list's count entry, and where the widths part. */
export interface Fits {
  /** The entry holding how many rows the list shows. */
  address: number;
  /** How many the build rendered, so the gates are seeded rather than flashing. */
  initial: number;
  /** How many rows were compiled: the largest count a gate has to enumerate. */
  max: number;
  /** How many rows the viewport holds at the full width: at most this many, nothing scrolls. */
  fit: number;
}

/**
 * Which of a region's two widths shows, decided by the list's own count.
 *
 * The face drew both — the scrolling region with its narrow rows first, the
 * full-width rows second — and this stands each behind a gate on the ONE
 * entry the list already carries: the wide rows while the count is any of
 * 0..fit, the region while it is any of fit+1..max, as string equalities the
 * way every row gate compares. The wrapper becomes a stack, which is what
 * lets a control declare the collection the gates index, and which gives an
 * invisible child no room — so whichever variant is shown sits at the top,
 * where the layout put the region.
 */
export const fits: Connector<Fits> = (data, face, ctx) => {
  const [key, control] = Object.entries(face)[0] ?? ['', {}];
  const [scrolling, fitting] = control.controls ?? [];

  if (scrolling === undefined || fitting === undefined) {
    throw new Error(`"${key}" asked which width to show, but holds no two variants to choose between.`);
  }

  const gate = (name: string, variant: ControlEntry, shows: string, seed: boolean): ControlEntry => {
    const [inner, look] = Object.entries(variant)[0] ?? ['', {}];
    // The face's own copy of the seed is cleared as it goes inside: from here
    // the entry decides.
    const { visible: _visible, ...rest } = look;

    return {
      [name]: {
        type: 'panel',
        size: control.size ?? FULL,
        ...topLeft,
        collection_index: data.address,
        visible: '#visible',
        property_bag: { '#visible': seed },
        bindings: [
          entryValueBinding('#row_count', ctx.collection),
          { binding_type: 'view', source_property_name: shows, target_property_name: '#visible' },
        ],
        controls: [{ [inner]: rest }],
      },
    };
  };

  return {
    [key]: {
      ...control,
      type: 'stack_panel',
      orientation: 'vertical',
      collection_name: ctx.collection,
      controls: [
        gate('scrolls', scrolling, countAmong(data.fit + 1, data.max), data.initial > data.fit),
        gate('fits', fitting, countAmong(0, data.fit), data.initial <= data.fit),
      ],
    },
  };
};
