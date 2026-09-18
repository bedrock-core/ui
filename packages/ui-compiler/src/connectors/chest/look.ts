import { FULL, topLeft } from '../../faces';
import { placed, TEXT_DEF } from './cell';
import type { Connector, ControlEntry } from '../types';

/** One version of a carried look: what it is called, the slot naming the look worn, and which look this is. */
export interface LookVersion {
  name: string;
  address: number;
  index: number;
}

/** Where a look gate reads its slot's current durability. */
const LOOK_PROPERTY = '#core_look';

/**
 * One version of an element whose look follows state, shown while the item
 * in its slot carries that look's index as its current durability.
 *
 * The slot is a bank slot, so the version stands in the same index host a text
 * channel's characters do: `collection_index` is legal only under a control
 * declaring the collection. The version sits inside the gate at (0,0) with its
 * own visibility cleared, because from here the slot decides. Seeded with
 * whether the build drew this look, so a frame-late binding shows the compiled
 * look rather than none or two.
 */
export const look: Connector<LookVersion> = (data, face, ctx) => {
  const [key, control] = Object.entries(face)[0] ?? ['', {}];
  const placement = placed({ [key]: { ...control, visible: undefined } });
  const { layer: _layer, visible: _visible, ...inner } = control;

  return {
    [`${data.name}_look@${TEXT_DEF.textHost}`]: {
      ...placement,
      controls: [{
        gate: {
          type: 'panel',
          size: control.size ?? FULL,
          ...topLeft,
          collection_index: data.address,
          visible: '#visible',
          property_bag: { '#visible': data.index === 0 },
          bindings: [
            { binding_type: 'collection_details', binding_collection_name: ctx.collection },
            {
              binding_type: 'collection',
              binding_collection_name: ctx.collection,
              binding_name: '#item_durability_current_amount',
              binding_name_override: LOOK_PROPERTY,
            },
            {
              binding_type: 'view',
              source_property_name: `(${LOOK_PROPERTY} = ${String(data.index)})`,
              target_property_name: '#visible',
            },
          ],
          controls: [{ [key]: { ...inner, offset: [0, 0] } }],
        },
      }],
    } satisfies ControlEntry[string],
  };
};
