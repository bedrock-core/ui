import { label, topLeft, type TextStyle } from '../../faces';
import { ENTRY_PROPERTY, entryHost, entryText } from './entry';
import type { Addressed, Connector, Control } from '../types';

/** One live string's carrier: the look it draws in, and the box it draws in. */
export interface TextCarrier {
  /** The screen-local definition name, e.g. `text_carrier_1`. */
  definition: string;
  size: [number, number];
  style: TextStyle;
}

/**
 * A live string on a form, which is the entry itself.
 *
 * The chest's per-character machinery is absent: a container slot publishes
 * numbers, so a string crosses it one glyph and one `.lang` lookup at a time,
 * while a form entry IS a string. One binding, no slicing, no table, no cap —
 * which is the difference between the two hosts stated as JSON UI.
 */
export const text: Connector<Addressed> = (data, face, ctx) =>
  entryHost(data.name, data.address, `${ctx.ns}.${data.definition}`, face, ctx.collection);

/**
 * The carrier definition: the same label the face drew, reading the entry
 * instead of a baked string.
 *
 * Localized on the client, always. A live value that is a `.lang` key resolves
 * in the player's language, and a literal renders as itself the way an
 * unmatched key does — which is what lets a reference travel as its name.
 */
export const textDef = (carrier: TextCarrier, collection: string): Control => ({
  ...label(
    { ...carrier.style, text: ENTRY_PROPERTY, localize: true },
    { size: carrier.size, ...topLeft },
  ),
  bindings: entryText(ENTRY_PROPERTY, collection),
});
