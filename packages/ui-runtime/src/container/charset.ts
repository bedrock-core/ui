/**
 * How a string crosses into a container screen.
 *
 * A container slot publishes no text — measured: `#hover_text` is a single
 * hover-driven screen value that any press steals, and `#group_item_group_name`
 * is empty for a container. What a slot does publish is NUMBERS, and a label
 * with `localize: true` treats its text as a translation key. So the layout
 * builds `keyPrefix + number` and the game's own `.lang` turns it back into a
 * glyph: one slot per character, and the glyph itself is whatever the table
 * says, in any font and any language.
 *
 * The carrier is the backing item's stack size, because that is the only value
 * that can be written in place — `ContainerSlot.amount = n`, one native call,
 * no stack rebuilt. It also fixes the alphabet at 64 glyphs, since a stack
 * stops there.
 */

/**
 * The glyphs a text channel can carry, in code order. Code `n` is
 * `CHARSET[n - 1]`, because 0 would mean an empty slot and an empty slot has no
 * stack size to read.
 *
 * A stack stops at 64, so the alphabet does too.
 */
export const CHARSET
  = ' ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789.';

/**
 * The blank.
 *
 * It is code 1 because `#inventory_stack_count` reports EMPTY for a stack of
 * one -- measured: the first probe read `n=` with nothing after it, since its
 * marker was unstackable and therefore always amount 1. So a blank cell builds
 * the bare key prefix, and {@link BLANK_VALUE} is what that key maps to.
 */
export const BLANK_CODE = 1;

/**
 * What a blank renders as: a space, wrapped in formatting codes.
 *
 * A `.lang` parser trims trailing whitespace, so a value of one space defines
 * nothing -- the lookup misses, and a label that misses prints its own KEY,
 * which in a narrow cell is a row of dots. The codes are inert and render as
 * nothing, but they stop the space being at either end of the value, so it
 * survives the file format.
 *
 * A real space rather than a hidden control, because the cells are packed by
 * the engine: a hidden one measures zero and the words either side would run
 * together.
 */
export const BLANK_VALUE = '§r §r';

/** Code written for a character the table does not have. */
export const UNKNOWN_CODE = BLANK_CODE;

/** Highest code a stack can express. */
export const MAX_CODE = CHARSET.length;

const CODE_OF = new Map<string, number>(
  [...CHARSET].map((glyph, index) => [glyph, index + 1]),
);

/**
 * Turns a string into one code per cell, padded with spaces.
 *
 * Padding rather than truncating the array keeps the write cheap: a cell that
 * did not change is skipped, and a shorter string only rewrites the cells it
 * actually shortened.
 *
 * @param text - what to display
 * @param length - how many cells the screen drew
 */
export const encode = (text: string, length: number): number[] => {
  const codes: number[] = [];

  for (let cell = 0; cell < length; cell += 1) {
    const glyph = text[cell];

    codes.push(glyph === undefined ? UNKNOWN_CODE : CODE_OF.get(glyph) ?? UNKNOWN_CODE);
  }

  return codes;
};

/**
 * The `.lang` lines a screen needs to decode its text channels.
 *
 * Generated rather than written, because the table is the contract between the
 * compiler and the runtime: change {@link CHARSET} and both sides move together
 * or nothing renders.
 */
export const charsetLang = (keyPrefix: string): string[] =>
  [...CHARSET].map((glyph, index) => {
    const code = index + 1;

    // The blank is keyed by the BARE prefix, because a stack of one reports no
    // count at all, and its value is padded so the space survives trimming.
    return code === BLANK_CODE
      ? `${keyPrefix}=${BLANK_VALUE}`
      : `${keyPrefix}${code}=${glyph}`;
  });
