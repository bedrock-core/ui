import { FORM_FLAG_OFF } from '@bedrock-core/ui-runtime/compile';
import { FULL, HUG, topLeft } from '../../faces';
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
 * The wrapper takes the face's placement — offset, layer, the index host the
 * entry needs — and the face sits inside the gate at (0,0) with its own
 * visibility cleared, so nothing else about it changes. The gate only READS
 * its entry, so the ancestor's `collection_index` is enough; the rule that a
 * control must own its entry is about presses. It is seeded with the value the
 * build rendered with, so a frame-late binding shows the compiled state rather
 * than a flash.
 *
 * The SIZE is the gate's, not the wrapper's: the wrapper is a stack sized to
 * what it holds, and a closed gate is not held. That is what lets a stack
 * above fold the row away — a wrapper as large as the face would keep the
 * face's room whether or not anything was drawn in it.
 */
export const visible: Connector<Gate> = (data, face, ctx) => {
  const [key, control] = Object.entries(face)[0] ?? ['', {}];
  const { size: _size, ...placement } = placed({ [key]: { ...control, visible: undefined } });
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
      ...placement,
      size: HUG,
      collection_name: ctx.collection,
      controls: [{
        gate: {
          type: 'panel',
          size: control.size ?? FULL,
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
