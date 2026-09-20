/**
 * The canvas a bedrock-core screen is baked at, and the card inside it.
 *
 * Every screen in the family — an addon catalog, a settings section, a guide page — is one
 * compiled form at the same size, so a player moving between them sees one window rather than
 * a set of differently shaped ones. Screens from different packs meet inside it: a catalog draws
 * its frame and an addon's own page draws into the area beside the sidebar, and neither pack can
 * ask the other at runtime what the geometry is. These numbers are that agreement, which is why
 * they live below every app that relies on them.
 *
 * Changing one changes what every screen already built against it draws into.
 */

/** The canvas every screen is baked at, centred on the form. */
export const FRAME = { width: 300, height: 200 } as const;

/** The card's painted border: every region is inset by this much so the border contains it. */
export const PADDING = 1;

/** The bottom edge takes more, where the border is thicker and a scroll track ends. */
export const PADDING_BOTTOM = 4;

/** Header bar: the theme's icon plus its padding. */
export const HEADER_HEIGHT = 23;

/**
 * The card below the header, inside its painted border: where a screen's body goes. The sides
 * and the top are one texel of border, the bottom is four, so a body inset equally from this
 * rect reads as equal on all sides.
 */
export const BODY = {
  x: PADDING,
  y: PADDING + HEADER_HEIGHT,
  width: FRAME.width - 2 * PADDING,
  height: FRAME.height - PADDING - HEADER_HEIGHT - PADDING_BOTTOM,
} as const;

/** Space between the header and the regions below it. */
export const HEADER_GAP = 1;
