import { FULL } from '../../faces';
import { BUTTON_MAPPINGS, CELL, CELL_VAR, placed, SLOT_VAR, whenDisabled, whenEnabled } from './cell';
import type { Addressed, Connector, Control, Definitions, Emit } from '../types';

/** One button look on a chest: the shared faces, and the box the cell is sized to. */
export interface PressLook {
  /** The screen-local definition name this look is emitted under, e.g. `press_1`. */
  definition: string;
  size: [number, number];
  rest: string;
  hover: string;
  pressed: string;
  /** The look while it cannot be pressed. Falls back to the resting one. */
  disabled: string;
}

/**
 * A press on a chest: an item taken out of the slot and put straight back.
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
 * turned off, and the face becomes a real button with hover and pressed
 * states. The item underneath is pure transport.
 *
 * The button EXTENDS vanilla's rather than replacing it, because the
 * transaction is the whole point: lose it and the button stops reporting.
 *
 * Hover and pressed are gated on the slot holding a transport, so a disabled
 * button does not react. Two visibilities, on two controls: the button toggles
 * `hover` and `pressed` itself as the pointer comes and goes, and a binding
 * writing `#visible` on the SAME control fights it — re-enabling a button set
 * both faces visible at once until the next hover made the engine recompute,
 * measured. So the engine owns the outer panel, the gate owns the panel
 * inside, and a state is drawn only when both agree.
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
      hover_control: 'hover',
      pressed_control: 'pressed',
      button_mappings: BUTTON_MAPPINGS,
      // A slot is silent, the way vanilla's are; a button clicks, the way
      // vanilla's do.
      sound_name: 'random.click',
      sound_volume: 1,
      sound_pitch: 1,
      controls: [
        { hover: gatedState(look.hover, collection) },
        { pressed: gatedState(look.pressed, collection) },
      ],
    },

    [definition]: {
      type: 'panel',
      size,
      controls: [
        {
          // The press surface exists only while the transport is in the slot.
          // A disabled button therefore has no button at all: a click or a
          // shift-click routes nowhere, so the guard that marks it disabled is
          // never auto-placed into the player's inventory where it would show.
          enabled: {
            type: 'panel',
            size: FULL,
            bindings: whenEnabled(collection),
            controls: [{
              [`item@${CELL.item}`]: {
                size,
                $cell_image_size: size,
                $item_collection_name: collection,
                $background_images: look.rest,
                $item_renderer: CELL.empty,
                $button_ref: `${ns}.${definition}_states`,
                // Nothing about the transport item may show: not its count, not
                // its durability — which a text channel rides — and not its
                // storage.
                $stack_count_required: false,
                $durability_bar_required: false,
                $storage_bar_required: false,
              },
            }],
          },
        },
        {
          // The face alone, no press surface: the disabled look when the author
          // gave one, the resting look otherwise.
          disabled: {
            type: 'panel',
            size: FULL,
            bindings: whenDisabled(collection),
            controls: [{ [`face@${look.disabled}`]: {} }],
          },
        },
      ],
    },
  };
};

/** One state's panel: the engine toggles it, the gate inside draws the face only while enabled. */
const gatedState = (face: string, collection: string): Control => ({
  type: 'panel',
  size: FULL,
  controls: [{
    gate: {
      type: 'panel',
      size: FULL,
      bindings: whenEnabled(collection),
      controls: [{ [`face@${face}`]: {} }],
    },
  }],
});
