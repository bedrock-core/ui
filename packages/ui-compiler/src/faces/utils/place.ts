import type { Box, Control, ControlEntry, Rect } from './types';

/**
 * Every face anchors top-left and carries its own offset.
 *
 * The layout already solved an absolute position for everything, so nothing is
 * centred or stretched by the engine: a control sits where it was put, and the
 * rect guard refuses a host that moves it.
 */
export const topLeft = { anchor_from: 'top_left', anchor_to: 'top_left' } as const;

/** The whole of the parent. */
export const FULL: ['100%', '100%'] = ['100%', '100%'];

/** As wide and as tall as what it holds. */
export const HUG: ['100%c', '100%c'] = ['100%c', '100%c'];

/**
 * The base every label is drawn at, scaled from there by `font_scale_factor`.
 * The form render pack does the same, so a compiled label and an interpreted
 * one paint identically.
 */
export const FONT_SIZE = 'small';

export const sizeOf = (rect: Rect): [number, number] => [rect.width, rect.height];
export const offsetOf = (rect: Rect): [number, number] => [rect.x, rect.y];

/**
 * Where a face sits: its size, its offset, its anchors, and the two
 * decorations the author may have set.
 *
 * Spread first in every face, so the placement is the same shape wherever it
 * came from and a host can lift it off one control onto another.
 */
export const placed = (box: Box): Record<string, unknown> => ({
  size: sizeOf(box.rect),
  offset: offsetOf(box.rect),
  ...topLeft,
  ...box.layer === undefined ? {} : { layer: box.layer },
  ...box.hidden === true ? { visible: false } : {},
});

/**
 * The blank canvas: a 3 by 3 nineslice with 1px borders, shipped in the render
 * pack. It is what a control the author has not styled draws, so an unstyled
 * screen shows its boxes instead of nothing at all.
 */
export const UNSTYLED = 'textures/ui/unstyled';

/**
 * The texture a control draws, falling back to the blank canvas.
 *
 * For the faces that CANNOT be drawn without one: a button, a switch, a slider
 * and a text box are invisible with no texture, and an invisible control is
 * worse than an obviously unstyled one. The faces where absence is a real
 * choice — a panel's background, an option's row behind its bullet — take
 * `surface` directly and draw nothing.
 */
export const styled = (texture: string | undefined): string => (
  texture === undefined || texture === '' ? UNSTYLED : texture
);

/**
 * A texture over the whole control, or nothing when there is none.
 *
 * An image rather than a `texture` property: only `image` nineslices, and a
 * face that draws its background as a child can put content above it.
 *
 * Anchors are optional because they cannot move it: it fills its parent
 * either way. The layer is the caller's, and the caller has to think about it
 * — a background left at the default sits UNDER content raised above it, and a
 * background given the content's own layer draws in an order the client
 * resolves per frame, which is how a card's text once came and went with the
 * scroll.
 */
export const surface = (
  texture: string | undefined,
  { layer, anchored = false }: { layer?: number; anchored?: boolean } = {},
): ControlEntry[] => (
  texture === undefined || texture === ''
    ? []
    : [{
        bg: {
          type: 'image',
          texture,
          size: FULL,
          ...anchored ? topLeft : {},
          keep_ratio: false,
          ...layer === undefined ? {} : { layer },
        },
      }]
);

/**
 * Children one layer above a background, never beside it.
 *
 * At an equal layer the client resolves draw order per draw, and inside a
 * clipped scroll region a card's text came and went with the scroll position.
 * A layer is relative to its parent, so nesting keeps climbing and every
 * descendant stays above every ancestor's background.
 */
export const over = (background: readonly ControlEntry[], children: readonly ControlEntry[]): ControlEntry[] => (
  background.length === 0
    ? [...children]
    : [...background, { content: { type: 'panel', size: FULL, ...topLeft, layer: 1, controls: [...children] } }]
);

/** One face, named. */
export const entry = (name: string, control: Control): ControlEntry => ({ [name]: control });
