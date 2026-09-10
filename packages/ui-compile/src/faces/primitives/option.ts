import { surface } from '../utils/place';
import { placedCaption } from './text';
import type { Box, Control, ControlEntry, TextStyle } from '../utils/types';

/** The four looks an option takes, since it is selectable as well as hoverable. */
export interface OptionStates {
  background: string;
  backgroundHover: string;
  backgroundSelected: string;
  /** The glyph at the row's left middle. Empty draws none, which is the segmented look. */
  bullet: string;
  bulletHover: string;
  bulletSelected: string;
  bulletSelectedHover: string;
}

export type OptionState = 'rest' | 'hover' | 'selected' | 'selectedHover';

export interface OptionFace extends Box, OptionStates {
  label: string;
  /** Where the label sits, as the layout solved it, from the row's top-left. */
  labelX: number;
  labelY: number;
  style: TextStyle;
  bulletWidth: number;
  bulletHeight: number;
  /** Which of the four looks this face draws. Defaults to resting. */
  state?: OptionState;
}

/**
 * One choice in a chooser: a row surface, a glyph, and a caption, without a
 * box of its own.
 *
 * The same primitive for every chooser there is. A radio row is a bullet and a
 * label; a segment of a toggle-button group is the same row with no bullet and
 * a centred label; a dropdown's popup row is the same again. What differs is
 * the textures and where the layout put the caption, never the shape.
 *
 * Four looks rather than a button's three, because an option is selected as
 * well as pressed, and the two combine. It draws no box because the select
 * that owns it places the row, and the screen serving it puts all four looks
 * inside the one control that swaps between them.
 */
export const optionParts = (data: OptionFace): ControlEntry[] => {
  const state = data.state ?? 'rest';
  const selected = state === 'selected' || state === 'selectedHover';
  const hovered = state === 'hover' || state === 'selectedHover';
  const background = selected
    ? data.backgroundSelected
    : hovered ? data.backgroundHover : data.background;
  const bullet = selected
    ? (hovered ? data.bulletSelectedHover : data.bulletSelected)
    : (hovered ? data.bulletHover : data.bullet);

  const glyph: ControlEntry[] = bullet === ''
    ? []
    : [{
        bullet: {
          type: 'image',
          texture: bullet,
          size: [data.bulletWidth, data.bulletHeight],
          anchor_from: 'left_middle',
          anchor_to: 'left_middle',
          keep_ratio: false,
          layer: 2,
        } satisfies Control,
      }];

  const label: ControlEntry[] = data.label === ''
    ? []
    : [{ label: placedCaption({ ...data.style, text: data.label, localize: false }, { x: data.labelX, y: data.labelY }) }];

  return [...surface(background, { layer: 1, anchored: true }), ...glyph, ...label];
};
