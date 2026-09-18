import { FULL } from '../../faces';
import { BUTTON_MAPPINGS, CELL, CELL_VAR, placed, SLOT_VAR, whenDisabled, whenEnabled } from './cell';
import type { Addressed, Connector, Control, ControlEntry, Definitions, Emit } from '../types';

/** The shared faces of one look, in each state a button draws. */
export interface PressFaces {
  rest: string;
  hover: string;
  pressed: string;
  /** The look while it cannot be pressed. Falls back to the resting one. */
  disabled: string;
}

/** One button on a chest: the shared faces, and the box the cell is sized to. */
export interface PressLook extends PressFaces {
  /** The screen-local definition name this button is emitted under, e.g. `press_1`. */
  definition: string;
  size: [number, number];
  /**
   * Every look the button wears when its face follows state, the build's own
   * first. Each state draws all of them, and the current durability of the
   * item in the button's slot shows one.
   */
  looks?: readonly PressFaces[];
}

/** Where a look gate reads its button's current durability. */
const LOOK_PROPERTY = '#core_look';

/**
 * A press on a chest: an item dropped from the slot and put straight back.
 *
 * The slot host names the container index; the definition under it is the cell
 * proper. Nothing about the LOOK is here — the face pass drew and shared every
 * state already.
 */
export const press: Connector<Addressed> = (data, face, ctx) => ({
  [`${data.name}@${CELL.host}`]: {
    ...placed(face),
    [SLOT_VAR]: data.address,
    [CELL_VAR]: `${ctx.ns}.${data.definition}`,
  },
});

/**
 * The definitions one button look needs on a chest.
 *
 * A press reaches script only as an item move, so a button IS a container slot
 * — but the cell takes its face, its icon and its button as variables, so none
 * of it has to look like an item. The icon becomes nothing, the overlays are
 * turned off, and the face becomes a real button with rest, hover and pressed
 * states. The item underneath is pure transport.
 *
 * The button EXTENDS vanilla's rather than replacing it, because the
 * transaction is the whole point: lose it and the button stops reporting.
 *
 * The resting face is the button's `default` state, not the cell's background:
 * the engine draws exactly one of rest, hover and pressed, so a pressed face
 * never shows the resting one behind it.
 *
 * The button is always there, enabled or not. Hiding it would hide the control
 * the chest screen may have focused — a button that disables itself on press
 * does exactly that — and a dangling focus stops the screen taking input. So a
 * disabled button keeps its surface: each state's face is gated off while the
 * slot holds the guard, the disabled face shows beside it instead, and a press
 * on it drops a guard that the runtime puts straight back without firing.
 *
 * Each state's face is gated on a panel INSIDE the state control. The button
 * toggles its state controls' visibility itself as the pointer comes and
 * goes, and a binding writing `#visible` on the SAME control fights it —
 * re-enabling a button set both faces visible at once until the next hover
 * made the engine recompute, measured. So the engine owns the outer panel, the
 * gate owns the panel inside, and a state is drawn only when both agree.
 *
 * The cell and the item are sized to the button's solved rect, because the
 * cell and its item default to the 18 by 18 item cell and a face only ever
 * fills that.
 */
export const pressDefs = (look: PressLook, ctx: Emit): Definitions => {
  const { ns, collection } = ctx;
  const { definition, size } = look;

  return {
    [`${definition}_states@${CELL.slotButton}`]: {
      default_control: 'default',
      hover_control: 'hover',
      pressed_control: 'pressed',
      button_mappings: BUTTON_MAPPINGS,
      // A slot is silent, the way vanilla's are; a button clicks, the way
      // vanilla's do.
      sound_name: 'random.click',
      sound_volume: 1,
      sound_pitch: 1,
      controls: [
        { default: gatedState(facesIn(look, 'rest', collection), collection) },
        { hover: gatedState(facesIn(look, 'hover', collection), collection) },
        { pressed: gatedState(facesIn(look, 'pressed', collection), collection) },
      ],
    },

    [definition]: {
      type: 'panel',
      size,
      controls: [
        {
          // The disabled look when the author gave one, the resting look
          // otherwise, under the button whose own faces are gated off.
          disabled: {
            type: 'panel',
            size: FULL,
            bindings: whenDisabled(collection),
            controls: facesIn(look, 'disabled', collection),
          },
        },
        {
          [`item@${CELL.item}`]: {
            size,
            $cell_image_size: size,
            $item_collection_name: collection,
            $background_images: CELL.empty,
            $item_renderer: CELL.empty,
            $button_ref: `${ns}.${definition}_states`,
            // Nothing about the transport item may show: not its count, not
            // its durability — which the look rides — and not its storage.
            $stack_count_required: false,
            $durability_bar_required: false,
            $storage_bar_required: false,
          },
        },
      ],
    },
  };
};

/** One state's panel: the engine toggles it, the gate inside draws the face only while enabled. */
const gatedState = (faces: ControlEntry[], collection: string): Control => ({
  type: 'panel',
  size: FULL,
  controls: [{
    gate: {
      type: 'panel',
      size: FULL,
      bindings: whenEnabled(collection),
      controls: faces,
    },
  }],
});

/**
 * What one state draws: its face, or every look's face, each shown while the
 * button's item carries that look.
 */
const facesIn = (look: PressLook, state: keyof PressFaces, collection: string): ControlEntry[] =>
  (look.looks === undefined
    ? [{ [`face@${look[state]}`]: {} }]
    : look.looks.map((faces, index) => lookGate(index, faces[state], collection)));

/**
 * One look of a button, drawn while the item in its slot carries that look's
 * index as its current durability.
 *
 * The slot is the button's own, already named by the host above, so the gate
 * reads it the way the enabled test does. Durability is a number in a binding
 * expression, so the index is compared unquoted, and an empty slot fails every
 * gate rather than passing one.
 */
const lookGate = (index: number, face: string, collection: string): ControlEntry => ({
  [`look_${String(index)}`]: {
    type: 'panel',
    size: FULL,
    // Seeded with what the build drew, so a frame-late binding shows the
    // compiled look rather than nothing.
    property_bag: { '#visible': index === 0 },
    visible: '#visible',
    bindings: [
      { binding_type: 'collection_details', binding_collection_name: collection },
      {
        binding_type: 'collection',
        binding_collection_name: collection,
        binding_name: '#item_durability_current_amount',
        binding_name_override: LOOK_PROPERTY,
      },
      {
        binding_type: 'view',
        source_property_name: `(${LOOK_PROPERTY} = ${String(index)})`,
        target_property_name: '#visible',
      },
    ],
    controls: [{ [`face@${face}`]: {} }],
  },
});
