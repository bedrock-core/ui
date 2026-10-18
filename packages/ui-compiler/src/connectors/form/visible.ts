import { FORM_FLAG_OFF, FORM_FLAG_ON } from '@bedrock-core/ui-runtime/compile';
import { FULL, HUG, topLeft } from '../../faces';
import { ENTRY_PROPERTY, entrySource, placed } from './entry';
import type { Connector, ControlEntry } from '../types';

/** A gate's payload: what it is called, and which entry it reads. */
export interface Gate {
  name: string;
  address: number;
  /** An overlay already owns its space and must not measure percentage children. */
  fixedSize?: ControlEntry[string]['size'];
}

/**
 * The gate a carried `visible` draws through.
 *
 * A root entry source supplies the flag. The wrapper keeps the face's solved
 * placement, and the face sits inside the gate at (0,0) with its visibility
 * cleared. Native controls retain their collection scope while the gate reads
 * the source's value. The compiled visibility seeds the first frame.
 *
 * The SIZE is the gate's, not the wrapper's: the wrapper is a stack sized to
 * what it holds, and a closed gate is not held. That is what lets a stack
 * above fold the row away — a wrapper as large as the face would keep the
 * face's room whether or not anything was drawn in it. An overlay keeps its
 * enclosing size so percentage inputs have an independent measurement.
 */
export const visible: Connector<Gate> = (data, face, ctx) => {
  const [key, control] = Object.entries(face)[0] ?? ['', {}];
  const { size: _size, ...placement } = placed({ [key]: { ...control, visible: undefined } });
  // What the build rendered with, read off the face rather than passed
  // alongside it: the face already draws it, and one bit with two homes is one
  // bit too many.
  const initial = control.visible !== false;
  const source = entrySource(`visible_${data.name}`, data.address, initial ? FORM_FLAG_ON : FORM_FLAG_OFF, ctx);
  // The face's own copy is cleared as it goes inside. From here the entry
  // decides, and a face still saying `visible: false` would stay hidden when
  // the gate opened.
  const { layer: _layer, visible: _visible, ...inner } = control;

  return {
    [`${data.name}_vis`]: {
      type: 'stack_panel',
      orientation: 'vertical',
      ...placement,
      size: data.fixedSize ?? HUG,
      controls: [{
        gate: {
          type: 'panel',
          size: control.size ?? FULL,
          ...topLeft,
          visible: '#visible',
          property_bag: { '#visible': initial },
          bindings: [
            {
              binding_type: 'view',
              source_control_name: source,
              source_property_name: `(not (${ENTRY_PROPERTY} = '${FORM_FLAG_OFF}'))`,
              target_property_name: '#visible',
            },
          ],
          controls: [{ [key]: { ...inner, offset: [0, 0] } }],
        },
      }],
    } satisfies ControlEntry[string],
  };
};
