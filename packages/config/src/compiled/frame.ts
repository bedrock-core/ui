/**
 * The addon list's geometry, shared by the two screens that meet in it.
 *
 * The list is the host's: a header, a sidebar of rows, and a main area. What
 * the main area shows for one addon is that addon's own compiled screen,
 * drawn by its pack into the host's frame — so both packs have to agree on
 * where the main area is and how many entries the page may take, and neither
 * can ask the other at runtime. These numbers are that agreement; changing
 * one changes what every page built against it draws into.
 */

/** The canvas every screen of the list is baked at, centred on the form. */
export const FRAME = { width: 300, height: 200 } as const;

/** The card's painted border: every region is inset by this much so the border contains it. */
export const PADDING = 1;

/** The bottom edge takes one more, where the border is thicker. */
export const PADDING_BOTTOM = 2;

/** Header bar: the theme's icon plus its padding. */
export const HEADER_HEIGHT = 23;

/** Space between the header and the regions below it. */
const HEADER_GAP = 1;

export const SIDEBAR_WIDTH = 112;
const DIVIDER_WIDTH = 2;

/** The main area, relative to the frame: where an addon's page draws. The sidebar and the divider share its rows. */
export const MAIN = {
  x: SIDEBAR_WIDTH + DIVIDER_WIDTH,
  y: PADDING + HEADER_HEIGHT + HEADER_GAP,
  width: FRAME.width - SIDEBAR_WIDTH - DIVIDER_WIDTH - PADDING,
  height: FRAME.height - (PADDING + HEADER_HEIGHT + HEADER_GAP) - PADDING_BOTTOM,
} as const;

/** Entries reserved for the page: the marker, then the page's own presses. */
export const PAGE_SLOTS = 8;

/** Rows the sidebar is baked with; a world with more addons shows the first. */
export const ADDONS_MAX = 12;
