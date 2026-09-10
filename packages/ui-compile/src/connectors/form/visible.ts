import { FORM_FLAG_OFF } from '@bedrock-core/ui-runtime/compile';
import { FULL, topLeft } from '../../faces';
import { entryValueBinding, placed } from './entry';
import type { Connector, ControlEntry } from '../types';

/** A gate's payload: what it is called, and which entry it reads. */
export interface Gate {
  name: string;
  address: number;
}

/**
 * The gate a carried `visible` draws through.
 *
 * The wrapper takes the face's whole placement — rect, layer, the index host
 * the entry needs — and the face sits inside it at (0,0) with its own
 * visibility cleared, so nothing else about it changes. The gate only READS
 * its entry, so the ancestor's `collection_index` is enough; the rule that a
 * control must own its entry is about presses. It is seeded with the value the
 * build rendered with, so a frame-late binding shows the compiled state rather
 * than a flash.
 */
export const visible: Connector<Gate> = (data, face, ctx) => {
  const [key, control] = Object.entries(face)[0] ?? ['', {}];
  // What the build rendered with, read off the face rather than passed
  // alongside it: the face already draws it, and one bit with two homes is one
  // bit too many.
  const initial = control.visible !== false;
  // The face's own copy is cleared as it goes inside. From here the entry
  // decides, and a face still saying `visible: false` would stay hidden when
  // the gate opened.
  const { layer: _layer, visible: _visible, ...inner } = control;

  return {
    [`${data.name}_vis`]: {
      type: 'stack_panel',
      orientation: 'vertical',
      ...placed({ [key]: { ...control, visible: undefined } }),
      collection_name: ctx.collection,
      controls: [{
        gate: {
          type: 'panel',
          size: FULL,
          ...topLeft,
          collection_index: data.address,
          visible: '#visible',
          property_bag: { '#visible': initial },
          bindings: [
            entryValueBinding('#vis_value', ctx.collection),
            {
              binding_type: 'view',
              source_property_name: `(not (#vis_value = '${FORM_FLAG_OFF}'))`,
              target_property_name: '#visible',
            },
          ],
          controls: [{ [key]: { ...inner, offset: [0, 0] } }],
        },
      }],
    } satisfies ControlEntry[string],
  };
};
