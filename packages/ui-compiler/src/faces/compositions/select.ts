import { entry, placed, surface, topLeft } from '../utils/place';
import type { OptionFace } from '../primitives/option';
import { optionParts } from '../primitives/option';
import type { Box, ControlEntry, Face } from '../utils/types';

export interface SelectFace extends Box {
  /** The options, placed by the layout, each with its four looks resolved from its textures. */
  options: readonly OptionFace[];
  /** Which one the build rendered as chosen. */
  selected: number;
  /** A surface behind the whole group, if the theme paints one. */
  background?: string;
}

/**
 * A row or column of options, one of them chosen.
 *
 * The same composition whichever way it is arranged: a radio group is a
 * column of bulleted rows, a toggle-button group a row of segments with no
 * bullet. Which it is comes from the layout and the textures, never from a
 * second kind.
 *
 * The face draws each option at rest, the chosen one selected. What picking
 * one DOES is the screen's: the engine's own chooser on a modal, a press that
 * carries the index anywhere else, stood in this face's place.
 */
export const selectFace: Face<SelectFace> = data => entry(data.name, {
  type: 'panel',
  ...placed(data),
  controls: [...surface(data.background, { layer: 1, anchored: true }), ...data.options.map((option, index): ControlEntry => ({
    [option.name]: {
      type: 'panel',
      size: [option.rect.width, option.rect.height],
      offset: [option.rect.x, option.rect.y],
      ...topLeft,
      controls: optionParts({ ...option, state: index === data.selected ? 'selected' : 'rest' }),
    },
  }))],
});
