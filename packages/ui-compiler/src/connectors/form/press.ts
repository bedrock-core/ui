import { FORM_DETAILS_BINDING, FORM_LOOK_PREFIX } from '@bedrock-core/ui-runtime/compile';
import { FULL, topLeft } from '../../faces';
import { ENTRY_PROPERTY, entryHost, entryValueBinding, whenEnabled } from './entry';
import type { Addressed, Connector, ControlEntry, Definitions, Emit } from '../types';

/** One button look, as the face pass shared it: every state, qualified. */
export interface PressLook {
  /** The screen-local definition name this look is emitted under, e.g. `press_1`. */
  definition: string;
  /**
   * The button's box. The definition is sized to it, so one look serves one size — or all of
   * the box its host stands in, for a hugging button, whose host is sized to its text.
   */
  size: [number, number] | ['100%', '100%'];
  rest: string;
  hover: string;
  pressed: string;
  /** The look while it cannot be pressed. Falls back to the resting one. */
  disabled: string;
  /**
   * Every look this button takes, when its look follows state, and the entry
   * that names which one it is wearing.
   *
   * The button itself is emitted once: only what it DRAWS is drawn per look,
   * inside the state controls, so nothing about the press is duplicated — one
   * control owns the entry, as the engine requires.
   */
  looks?: { address: number; states: readonly Omit<PressLook, 'definition' | 'size' | 'looks'>[] };
}

/** The property a gate reads the worn look from. */
const LOOK_PROPERTY = '#look';

/** One look's face, drawn while the entry names it. */
const lookGate = (index: number, address: number, face: string, collection: string): ControlEntry => ({
  [`look_${String(index)}`]: {
    type: 'panel',
    size: FULL,
    ...topLeft,
    collection_index: address,
    // Seeded with what the build drew, so a frame-late binding shows the
    // compiled look rather than nothing.
    property_bag: { '#visible': index === 0 },
    visible: '#visible',
    bindings: [
      entryValueBinding(LOOK_PROPERTY, collection),
      {
        binding_type: 'view',
        source_property_name: `(${LOOK_PROPERTY} = '${FORM_LOOK_PREFIX}${String(index)}')`,
        target_property_name: '#visible',
      },
    ],
    controls: [{ [`face@${face}`]: {} }],
  },
});

/**
 * What one state of a button draws: its face, or a gate per look.
 *
 * The gates hang under a stack that declares the collection, because
 * `collection_index` is legal only on a direct child of one. A closed gate
 * draws nothing and takes no space, so the open one fills the button.
 */
const stateControl = (
  name: string,
  look: PressLook,
  pick: (state: Omit<PressLook, 'definition' | 'size' | 'looks'>) => string,
  fallback: string,
  collection: string,
): ControlEntry => (look.looks === undefined
  ? { [`${name}@${fallback}`]: {} }
  : {
      [name]: {
        type: 'stack_panel',
        orientation: 'vertical',
        size: FULL,
        ...topLeft,
        collection_name: collection,
        controls: look.looks.states.map((state, index) => lookGate(index, look.looks?.address ?? 0, pick(state), collection)),
      },
    });

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
        stateControl('default', look, state => state.rest, look.rest, ctx.collection),
        stateControl('hover', look, state => state.hover, look.hover, ctx.collection),
        stateControl('pressed', look, state => state.pressed, look.pressed, ctx.collection),
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
            controls: [stateControl('face', look, state => state.disabled, look.disabled, ctx.collection)],
          },
        },
      ],
    },
  };
};

export { ENTRY_PROPERTY };
