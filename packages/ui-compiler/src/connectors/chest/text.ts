import { IDENTITY, TEXT_EMPTY_VALUE } from '@bedrock-core/ui-runtime/compile';
import { label, topLeft, type TextStyle } from '../../faces';
import { placed, TEXT_DEF } from './cell';
import type { Binding, Connector, Control } from '../types';

/**
 * Private name a text channel's string is renamed to.
 *
 * Never `#hover_text` itself: the engine owns that name at screen scope and
 * overwrites it while a slot is pressed.
 */
const TEXT_PROPERTY = '#channel_text';

/** One live string's slot, declared character capacity and alignment. */
export interface TextRun {
  name: string;
  /** The one bank slot carrying this complete value. */
  address: number;
  length: number;
  /** The screen-local glyph definition this run mounts. */
  definition: string;
  align?: TextStyle['align'];
  hug?: true;
}

/** A natural-width live label positioned within its solved box. */
export const text: Connector<TextRun> = (data, face, ctx) => {
  const hug: [string, string] = ['100%c', '100%c'];
  const row: Control = {
    type: 'stack_panel',
    orientation: 'horizontal',
    size: hug,
    ...topLeft,
    controls: [{
      [`cell_0@${TEXT_DEF.textHost}`]: {
        size: hug,
        controls: [{ [`glyph@${ctx.ns}.${data.definition}`]: { collection_index: data.address } }],
      },
    }],
  };
  const anchor = data.align === 'center' ? 'top_middle' : data.align === 'right' ? 'top_right' : 'top_left';

  return { [data.name]: data.hug === true
    ? { ...row, ...placed(face) }
    : {
        type: 'panel',
        ...placed(face),
        controls: [{ glyphs: { ...row, anchor_from: anchor, anchor_to: anchor } }],
      } };
};

/** Reads a slot's own tooltip text under a private binding name. */
export const textDef = (style: TextStyle, collection: string): Control => ({
  ...label(
    { ...style, align: 'left', text: TEXT_PROPERTY, localize: false },
    { size: ['default', 'default'] },
  ),
  visible: '#visible',
  property_bag: { '#visible': false },
  bindings: [
    { binding_type: 'collection_details', binding_collection_name: collection },
    {
      binding_name: '#hover_text',
      binding_name_override: TEXT_PROPERTY,
      binding_type: 'collection',
      binding_collection_name: collection,
    },
    {
      binding_name: '#item_durability_total_amount',
      binding_name_override: '#channel_identity',
      binding_type: 'collection',
      binding_collection_name: collection,
    },
    {
      binding_name: '#item_durability_current_amount',
      binding_name_override: '#channel_padding',
      binding_type: 'collection',
      binding_collection_name: collection,
    },
    {
      binding_type: 'view',
      source_property_name: `((#channel_identity = ${String(IDENTITY.count)}) and (not (#channel_padding = ${String(TEXT_EMPTY_VALUE)})))`,
      target_property_name: '#visible',
    },
  ] satisfies Binding[],
});

export { topLeft };
