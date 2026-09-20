import { entry, placed, styled, surface } from '../utils/place';
import { caption } from './text';
import type { Box, ControlEntry, Face, TextStyle } from '../utils/types';

export interface InputFace extends Box {
  /** The edit box's own surface. */
  background?: string;
  /** What the build rendered with. Empty draws the placeholder instead. */
  text: string;
  /** Shown, muted, while there is nothing typed. */
  placeholder?: string;
  style: TextStyle;
}

/**
 * A text box.
 *
 * Two strings, one shown at a time: what is typed, or the placeholder while
 * nothing is. The face draws whichever the build had; the engine's own edit
 * box takes over and swaps them from then on.
 */
export const inputFace: Face<InputFace> = (data) => {
  // One caption, whichever string is showing: what is typed, or the muted
  // placeholder while nothing is. Neither, when there is nothing to say.
  const written: ControlEntry[] = data.text !== ''
    ? [{ caption: caption({ ...data.style, text: data.text, localize: false }) }]
    : data.placeholder === undefined || data.placeholder === ''
      ? []
      : [{ caption: caption({ ...data.style, text: data.placeholder, localize: false }, { muted: true }) }];

  return entry(data.name, {
    type: 'panel',
    ...placed(data),
    controls: [...surface(styled(data.background), { layer: 1, anchored: true }), ...written],
  });
};
