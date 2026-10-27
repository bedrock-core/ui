import { FULL, label, topLeft, type TextStyle } from '../../faces';
import { ENTRY_PROPERTY, entryHost, entryText } from './entry';
import type { Addressed, Connector, Control } from '../types';

/** One live string's carrier: the look it draws in, and the box it draws in. */
export interface TextCarrier {
  /** The screen-local definition name, e.g. `text_carrier_1`. */
  definition: string;
  /**
   * The box the value draws in: the layout's rect, or its own natural size for
   * a string that hugs its glyphs inside a stack.
   */
  size: [number, number] | ['default', 'default'];
  style: TextStyle;
}

/**
 * A live string on a form, which is the entry itself.
 *
 * The form entry carries the complete string, without a container bank slot
 * or the container host's 128-code-unit limit.
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
 * Fixed labels fill and cap to their own index host; hugging labels keep their natural size.
 */
export const textDef = (carrier: TextCarrier, collection: string): Control => ({
  ...label(
    { ...carrier.style, text: ENTRY_PROPERTY, localize: true },
    { size: carrier.size[0] === 'default' ? carrier.size : FULL,
      ...carrier.size[0] === 'default' ? {} : { max_size: FULL }, ...topLeft },
  ),
  bindings: entryText(ENTRY_PROPERTY, collection),
});
