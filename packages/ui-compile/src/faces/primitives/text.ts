import { FONT_SIZE, entry, placed, topLeft } from '../utils/place';
import type { Box, Control, Face, TextStyle } from '../utils/types';

export interface TextFace extends Box, TextStyle {
  /** A literal, or a key the client resolves when `localize`. */
  text: string;
  /**
   * Whether the string is a translation key. A baked string may use any
   * character, because nothing decodes it; a key must be one the client knows.
   */
  localize: boolean;
}

/**
 * A string.
 *
 * One face for both kinds of string. A string the build knows is drawn as it
 * is; a string script writes at runtime is drawn at the value the build
 * rendered with, in the box the layout reserved for its longest form. What
 * carries the live one is the host's, and stands here in this face's place.
 */
export const textFace: Face<TextFace> = data => entry(data.name, { ...placed(data), ...glyphs(data) });

/**
 * The bare label, sized and anchored by the caller.
 *
 * The captions inside other faces are labels too — a field's value, an
 * option's caption — and they hang off their own anchor rather than filling a
 * box, so they take the style from here and the geometry from their own face.
 */
export const label = (style: TextStyle & { text: string; localize: boolean }, geometry: Control): Control => ({
  ...geometry,
  ...glyphs(style),
});

/** Everything a label carries that is about the glyphs rather than the box. */
const glyphs = (style: TextStyle & { text: string; localize: boolean }): Control => ({
  type: 'label',
  text: style.text,
  localize: style.localize,
  ...style.fontType === undefined ? {} : { font_type: style.fontType },
  font_size: FONT_SIZE,
  font_scale_factor: style.fontScaleFactor,
  ...style.shadow === true ? { shadow: true } : {},
  ...style.color === undefined ? {} : { color: [...style.color] as [number, number, number] },
  ...style.align === undefined ? {} : { text_alignment: style.align },
});

/**
 * A caption inside another control: hung from the left middle, inset, and cut
 * to the control's width less the inset on both sides.
 */
export const caption = (
  style: TextStyle & { text: string; localize: boolean },
  { inset = 4, layer = 2, muted = false }: { inset?: number; layer?: number; muted?: boolean } = {},
): Control => label(
  muted ? { ...style, color: [0.6, 0.6, 0.6] } : style,
  {
    size: [`100% - ${String(inset * 2)}px`, 'default'],
    offset: [inset, 0],
    anchor_from: 'left_middle',
    anchor_to: 'left_middle',
    layer,
  },
);

/** A caption placed by the layout, at its own offset inside the control. */
export const placedCaption = (
  style: TextStyle & { text: string; localize: boolean },
  at: { x: number; y: number },
  layer = 3,
): Control => label(style, {
  size: ['default', 'default'],
  offset: [at.x, at.y],
  ...topLeft,
  layer,
});
