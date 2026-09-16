import { resolveDisplay, type DisplayText, type TranslationResolver } from '@bedrock-core/i18n';
import { measureText, WIDEST_GLYPH } from '@bedrock-core/ui-runtime';
import { FRAME } from './frame';
import { theme } from './tokens';

/**
 * Composing a header's breadcrumb trail: what it says, and what it gives up
 * when it does not fit.
 *
 * The trail travels as ONE value. A form entry's text is resolved by the CLIENT
 * before the binding sees it, so a whole breadcrumb rides a single message in
 * the reader's own language instead of one reserved box per segment.
 *
 * Which segments survive is decided HERE, server-side, because this is the only
 * side that holds both halves of the question: the segments resolved in the
 * viewing player's language, and the room the header's controls leave. A
 * compiled screen's boxes were solved at build time and have nothing to ask.
 */

/** A composed trail: the message one label carries. */
export type TrailMessage = Exclude<DisplayText, string>;

/** Which back control the header wears, which is what decides the trail's room. */
export type TrailBack = 'icon' | 'cancel';

/** Room the labelled cancel control takes in the back slot: the back glyph, a gap and its word. */
export const CANCEL_WIDTH = 54;

/** What stands between two segments. */
const SEPARATOR = ' > ';

/** What the trail says in place of the segments it dropped. */
const ELLIPSIS = '...';

/**
 * The room the header leaves the trail.
 *
 * The bar is inset from the card by a texel on each side and by its own
 * padding, and the control opposite the back one is as wide as it — so the
 * trail is what is left between the two of them and their two gaps.
 */
export function trailWidth(back: TrailBack = 'icon'): number {
  const header = theme.components.header;
  const slot = back === 'cancel' ? CANCEL_WIDTH : header.iconSize;

  return FRAME.width - 2 - 2 * header.padding - 2 * slot - 2 * header.gap;
}

/**
 * Characters a live trail reserves: as many of the widest glyph as its room
 * holds, at the header's own font and scale. The reservation is what makes the
 * label live, and the widest glyph is the only count that is true whatever the
 * trail turns out to say.
 */
export const trailMaxLength = (back: TrailBack = 'icon'): number =>
  Math.max(1, Math.floor(trailWidth(back) / headerWidth(WIDEST_GLYPH)));

/** How wide one line of trail draws, in scaled pixels. */
export type TrailMeasure = (text: string) => number;

/** One place in a collapsed trail: a segment, or the gap standing for the dropped ones. */
export type TrailSlot = number | 'gap';

/** The trail's own font and scale, which is what a segment has to fit in. */
const headerWidth: TrailMeasure = (text) => {
  const { font, scale } = theme.components.header.textStyle;

  return measureText({ text, font, fontSize: scale }).width;
};

/**
 * Which segments a trail shows when they do not all fit, and where the gap is.
 *
 * The LAST segment always stays: it is where the player actually is. The FIRST
 * is kept when it fits, since it names what everything below belongs to. What
 * room is left is filled from the END backwards, so the steps nearest the
 * player survive longest, and everything dropped becomes one gap. The trail
 * gives way in that order — `1 > … > 3 > 4`, then `1 > … > 4`, then `… > 4`.
 *
 * @param shown - Every segment already resolved to the text it draws as.
 * @param width - The room the trail has, in the same units `measure` reports.
 * @param measure - How wide a line of trail draws.
 */
export function collapseTrail(shown: readonly string[], width: number, measure: TrailMeasure): readonly TrailSlot[] {
  const last = shown.length - 1;

  if (last < 1) {
    return shown.map((_segment, index) => index);
  }

  const laidOut = (slots: readonly TrailSlot[]): string =>
    slots.map(slot => (slot === 'gap' ? ELLIPSIS : shown[slot] ?? '')).join(SEPARATOR);
  const fits = (slots: readonly TrailSlot[]): boolean => measure(laidOut(slots)) <= width;

  const all: TrailSlot[] = shown.map((_segment, index) => index);

  if (fits(all)) {
    return all;
  }

  // Two segments and a gap is the smallest trail that still names where it
  // started; below three segments there is nothing between them to drop.
  const head: TrailSlot[] = last >= 2 && fits([0, 'gap', last]) ? [0] : [];
  const compose = (from: number): TrailSlot[] => [
    ...head,
    ...from > head.length ? ['gap' as const] : [],
    ...Array.from({ length: last - from + 1 }, (_slot, step) => from + step),
  ];

  let from = last;

  for (let at = last - 1; at >= head.length; at -= 1) {
    if (!fits(compose(at))) {
      break;
    }

    from = at;
  }

  return compose(from);
}

/** Options for {@link trailText}. */
export interface TrailOptions {
  /** The back control the header wears: a labelled cancel leaves the trail less room than the icon. */
  back?: TrailBack;
}

/**
 * One segment as a part of the message.
 *
 * A key travels as a `translate` part so the CLIENT resolves it in its own
 * language; a literal — a player's name, a dimension's id — travels as text.
 * The trail's colour rides parts of its own and is never glued to a key, which
 * would stop the key resolving.
 */
const partOf = (segment: DisplayText, resolve: TranslationResolver | null | undefined): TrailMessage =>
  (typeof segment !== 'string'
    ? segment
    : resolve?.(segment) === undefined ? { text: segment } : { translate: segment });

/**
 * The trail a header is titled with, as the one message its label carries.
 *
 * Every segment is resolved through `resolve` — the viewing player's own
 * resolver — to decide what fits; what travels is the segments themselves, so
 * the client resolves them again in the language it is actually set to. A
 * segment that resolves to nothing takes no room and no separator.
 *
 * @param segments - The trail in order, `a > b > c`.
 * @param resolve - The viewing player's resolver, for measuring and for telling a key from a literal.
 * @param options - The header this trail sits in, which is what decides its room.
 */
export function trailText(
  segments: readonly DisplayText[],
  resolve: TranslationResolver | null | undefined,
  options: TrailOptions = {},
): TrailMessage {
  const { color, separator } = theme.components.header.textStyle;
  const kept = segments
    .map(segment => ({ segment, text: resolveDisplay(resolve, segment) }))
    .filter(entry => entry.text !== '');
  const slots = collapseTrail(kept.map(entry => entry.text), trailWidth(options.back ?? 'icon'), headerWidth);
  const parts: TrailMessage[] = [];

  for (const [at, slot] of slots.entries()) {
    parts.push({ text: at === 0 ? color : `${separator}${SEPARATOR}${color}` });
    parts.push(slot === 'gap' ? { text: ELLIPSIS } : partOf(kept[slot]?.segment ?? '', resolve));
  }

  return { rawtext: parts };
}
