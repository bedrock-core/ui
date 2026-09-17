import { FULL, topLeft, type Rect } from '../../faces';
import { MODAL_COLLECTION, placed } from './entry';
import type { Connector, ControlEntry } from '../types';

/** The shared toggle each option mounts, with its bindings already fixed. */
export const OPTION_TOGGLE = 'core_ui_form_components.compiled_option_toggle';

/**
 * The name the ENGINE listens to. A modal's dropdown takes its answer from a
 * press on a toggle of this exact name under its content control, the way
 * vanilla's `server_form.json` names its option radios; any other name is a
 * toggle the engine never hears, and the option's state — read back off the
 * row each frame — never moves. Every inline select on a screen shares it.
 */
export const OPTION_GROUP = 'custom_dropdown_radio_toggle';

/** The dropdown that owns the row's collection and never opens. */
export const STUB = 'core_ui_form_components.inline_dropdown_toggle_stub';

/** One option, placed, with each of its four looks already drawn. */
export interface SelectOption {
  /** Where the layout put the row, relative to the field. */
  rect: Rect;
  rest: readonly ControlEntry[];
  selected: readonly ControlEntry[];
  hover: readonly ControlEntry[];
  selectedHover: readonly ControlEntry[];
}

export interface Select {
  name: string;
  /** The row in `custom_form` the answer arrives in. */
  address: number;
  options: readonly SelectOption[];
}

/**
 * The eight state children a toggle needs, from the four looks an option has.
 *
 * All eight, because a toggle draws the one its current state names and
 * nothing else — a state left undefined is a control that vanishes the moment
 * the pointer touches it. The locked pair look like rest and selected, since a
 * locked option still has to say which one it is.
 */
const LOOKS: readonly [string, keyof Omit<SelectOption, 'rect'>][] = [
  ['unchecked', 'rest'],
  ['checked', 'selected'],
  ['unchecked_hover', 'hover'],
  ['checked_hover', 'selectedHover'],
  ['unchecked_locked', 'rest'],
  ['checked_locked', 'selected'],
  ['unchecked_locked_hover', 'rest'],
  ['checked_locked_hover', 'selected'],
];

/** An option's four looks as the eight state children of the toggle that stands it in. */
export const optionStates = (option: SelectOption): ControlEntry[] =>
  LOOKS.map(([state, look]): ControlEntry => ({
    [state]: { type: 'panel', size: FULL, ...topLeft, controls: [...option[look]] },
  }));

/**
 * A chooser whose options are all visible at once, with the rows placed by the
 * build.
 *
 * A native row positions itself from each option's blob, through size and
 * offset bindings that are inert under a compiled mount. So the compile places
 * them: an invisible native dropdown owns the row's `custom_dropdown`
 * collection and names its content control in place — the stub, which never
 * opens — and inside that content each
 * option is an index host at its rect: a stack declaring the collection, whose
 * one child carries the index, legal only there, and holds the shared radio
 * toggle with the four looks the build drew for it. The toggle's own bindings
 * live in its definition, where the variables they read are fixed.
 *
 * The toggles wear the engine's own name ({@link OPTION_GROUP}): the press has
 * to be heard by the dropdown that owns the row, and only that name is. What
 * keeps two choosers on one screen apart is the data, not the group — each
 * option's state is the row's own, read back through its collection index.
 */
export const select: Connector<Select> = (data, face) => {
  const group = OPTION_GROUP;
  const content = `content_${String(data.address)}`;
  const offscreen = `offscreen_${String(data.address)}`;

  const rows: ControlEntry[] = data.options.map((option, index): ControlEntry => ({
    [`option_${String(index)}`]: {
      type: 'stack_panel',
      orientation: 'vertical',
      size: [option.rect.width, option.rect.height],
      offset: [option.rect.x, option.rect.y],
      ...topLeft,
      collection_name: 'custom_dropdown',
      controls: [{
        row: {
          type: 'panel',
          size: FULL,
          ...topLeft,
          collection_index: index,
          controls: [{
            [`toggle@${OPTION_TOGGLE}`]: {
              size: FULL,
              toggle_name: group,
              controls: optionStates(option),
            },
          }],
        },
      }],
    },
  }));

  return {
    [data.name]: {
      type: 'stack_panel',
      orientation: 'vertical',
      ...placed(face),
      collection_name: MODAL_COLLECTION,
      controls: [{
        field: {
          type: 'panel',
          size: FULL,
          ...topLeft,
          collection_index: data.address,
          bindings: [{ binding_type: 'collection_details', binding_collection_name: MODAL_COLLECTION }],
          controls: [
            {
              [`stub@${STUB}`]: {
                type: 'dropdown',
                ...topLeft,
                dropdown_name: 'custom_dropdown',
                dropdown_content_control: content,
                dropdown_area: offscreen,
              },
            },
            { [offscreen]: { type: 'panel', size: [0, 0], visible: false } },
            { [content]: { type: 'panel', size: FULL, ...topLeft, controls: rows } },
          ],
        },
      }],
    },
  };
};
