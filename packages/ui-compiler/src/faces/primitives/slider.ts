import { entry, placed, styled } from '../utils/place';
import type { Box, ControlEntry, Face } from '../utils/types';

/**
 * The engine's own defaults, restated because a compiled slider is told its
 * geometry rather than deriving it: the thumb matches the static 16 by 16
 * hitbox in the render pack's `slider_box`, so the drawn thumb and the
 * interactive core coincide exactly.
 */
export const TRACK_HEIGHT = 10;
export const THUMB_WIDTH = 16;
export const THUMB_HEIGHT = 16;

export interface SliderFace extends Box {
  /** The bar across the middle. Blank canvas when the theme gives none. */
  track?: string;
  /** The draggable handle. Blank canvas when the theme gives none. */
  thumb?: string;
  trackHeight?: number;
  thumbWidth?: number;
  thumbHeight?: number;
  /** How many stops the travel has, baked from min, max and step. */
  steps: number;
  /** Which stop the build rendered with, and so where the face draws the thumb. */
  value: number;
}

/**
 * A track with a handle on it.
 *
 * The thumb travels the width less its own, so its left edge is flush at the
 * minimum and its right edge flush at the maximum. The face draws it at the
 * build's value; the screen's own slider takes over from there.
 */
export const sliderFace: Face<SliderFace> = (data) => {
  const trackHeight = data.trackHeight ?? TRACK_HEIGHT;
  const thumbWidth = data.thumbWidth ?? THUMB_WIDTH;
  const thumbHeight = data.thumbHeight ?? THUMB_HEIGHT;
  // The thumb crosses the GAPS between stops, which is one fewer than the stops
  // themselves — at the last stop it has travelled the whole width.
  const gaps = Math.max(1, data.steps - 1);
  const travel = Math.max(0, data.rect.width - thumbWidth);
  const middle = { anchor_from: 'left_middle', anchor_to: 'left_middle' } as const;

  const track: ControlEntry[] = [{
    track: {
      type: 'image',
      texture: styled(data.track),
      size: [data.rect.width, trackHeight],
      ...middle,
      keep_ratio: false,
      layer: 1,
    },
  }];

  const thumb: ControlEntry[] = [{
    thumb: {
      type: 'image',
      texture: styled(data.thumb),
      size: [thumbWidth, thumbHeight],
      offset: [Math.round(travel * Math.min(gaps, data.value) / gaps), 0],
      ...middle,
      keep_ratio: false,
      layer: 2,
    },
  }];

  return entry(data.name, { type: 'panel', ...placed(data), controls: [...track, ...thumb] });
};
