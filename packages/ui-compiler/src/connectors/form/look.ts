import { FORM_LOOK_PREFIX } from '@bedrock-core/ui-runtime/compile';
import { FULL, topLeft } from '../../faces';
import { entryValueBinding, placed } from './entry';
import type { Connector, ControlEntry } from '../types';

/** One version of a carried look: what it is called, the entry naming the look worn, and which look this is. */
export interface LookVersion {
  name: string;
  address: number;
  index: number;
}

/**
 * One version of an element whose look follows state, shown while its entry
 * names that look.
 *
 * The same gate a carried `visible` draws through, reading a different value:
 * the index host takes the version's placement, and the version sits inside
 * the gate at (0,0) with its own visibility cleared, because from here the
 * entry decides. Seeded with whether the build drew this look, so a frame-late
 * binding shows the compiled look rather than none or two.
 */
export const look: Connector<LookVersion> = (data, face, ctx) => {
  const [key, control] = Object.entries(face)[0] ?? ['', {}];
  const { size: _size, ...placement } = placed({ [key]: { ...control, visible: undefined } });
  const { layer: _layer, visible: _visible, ...inner } = control;

  return {
    [`${data.name}_look`]: {
      type: 'stack_panel',
      orientation: 'vertical',
      ...placement,
      size: control.size ?? FULL,
      collection_name: ctx.collection,
      controls: [{
        gate: {
          type: 'panel',
          size: control.size ?? FULL,
          ...topLeft,
          collection_index: data.address,
          visible: '#visible',
          property_bag: { '#visible': data.index === 0 },
          bindings: [
            entryValueBinding('#look_value', ctx.collection),
            {
              binding_type: 'view',
              source_property_name: `(#look_value = '${FORM_LOOK_PREFIX}${String(data.index)}')`,
              target_property_name: '#visible',
            },
          ],
          controls: [{ [key]: { ...inner, offset: [0, 0] } }],
        },
      }],
    } satisfies ControlEntry[string],
  };
};
