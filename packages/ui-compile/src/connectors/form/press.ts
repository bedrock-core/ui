import { FORM_DETAILS_BINDING } from '@bedrock-core/ui-runtime/compile';
import { FULL, topLeft } from '../../faces';
import { ENTRY_PROPERTY, entryHost, whenEnabled } from './entry';
import type { Addressed, Connector, Definitions, Emit } from '../types';

/** One button look, as the face pass shared it: every state, qualified. */
export interface PressLook {
  /** The screen-local definition name this look is emitted under, e.g. `press_1`. */
  definition: string;
  /** The button's box. The definition is sized to it, so one look serves one size. */
  size: [number, number];
  rest: string;
  hover: string;
  pressed: string;
  /** The look while it cannot be pressed. Falls back to the resting one. */
  disabled: string;
}

/**
 * A press on a form: the entry the engine hands back when the button is
 * clicked.
 *
 * The index host names the entry; the definition under it is the button
 * proper. Nothing about the LOOK is here — the face pass drew and shared every
 * state already, and this only points at them.
 */
export const press: Connector<Addressed> = (data, face, ctx) =>
  entryHost(data.name, data.address, `${ctx.ns}.${data.definition}`, face);

/**
 * The definitions one button look needs.
 *
 * The press surface exists only while the entry says the button is enabled,
 * and a disabled button is its face alone — no button, so no press to refuse.
 * That is the chest's shape, arrived at for the chest's reason: `enabled` on a
 * button does not actually stop the engine handing the press to script.
 *
 * The button itself carries the `collection_details` binding S1 measured, and
 * sits under the index host that names its entry. Every state is one of the
 * shared faces: a button draws the child its `*_control` names and nothing
 * else of its own, so the caption lives inside each face.
 */
export const pressDefs = (look: PressLook, ctx: Emit): Definitions => {
  const { definition } = look;

  return {
    [`${definition}_states`]: {
      type: 'button',
      size: FULL,
      ...topLeft,
      default_control: 'default',
      hover_control: 'hover',
      pressed_control: 'pressed',
      sound_name: 'random.click',
      sound_volume: 1,
      sound_pitch: 1,
      button_mappings: [
        { from_button_id: 'button.menu_select', to_button_id: 'button.form_button_click', mapping_type: 'pressed' },
        { from_button_id: 'button.menu_ok', to_button_id: 'button.form_button_click', mapping_type: 'focused' },
      ],
      // S1: without this ON THE BUTTON the press is not attributed to the entry
      // and reaches script as a dismissal.
      bindings: [{ ...FORM_DETAILS_BINDING }],
      controls: [
        { [`default@${look.rest}`]: {} },
        { [`hover@${look.hover}`]: {} },
        { [`pressed@${look.pressed}`]: {} },
      ],
    },

    [definition]: {
      type: 'panel',
      size: look.size,
      ...topLeft,
      controls: [
        {
          enabled: {
            type: 'panel',
            size: FULL,
            ...topLeft,
            // Seeded visible: if the binding ever fails to resolve, a button
            // that still works beats one that silently cannot be pressed.
            property_bag: { '#visible': true },
            visible: '#visible',
            bindings: whenEnabled(true),
            controls: [{ [`press@${ctx.ns}.${definition}_states`]: {} }],
          },
        },
        {
          disabled: {
            type: 'panel',
            size: FULL,
            ...topLeft,
            property_bag: { '#visible': false },
            visible: '#visible',
            bindings: whenEnabled(false),
            controls: [{ [`face@${look.disabled}`]: {} }],
          },
        },
      ],
    },
  };
};

export { ENTRY_PROPERTY };
