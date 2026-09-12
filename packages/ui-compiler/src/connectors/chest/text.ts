import { KEY_PREFIX } from '@bedrock-core/ui-runtime/compile';
import { label, topLeft, type TextStyle } from '../../faces';
import { literal } from '../../nodes/utils/shared';
import { placed, TEXT_DEF } from './cell';
import type { Binding, Connector, Control, ControlEntry } from '../types';

/**
 * Private name a text channel's string is renamed to.
 *
 * Never `#hover_text` itself: the engine owns that name at screen scope and
 * overwrites it while a slot is pressed.
 */
const TEXT_PROPERTY = '#channel_text';

/** Where the raw code lands before the key is built around it. */
const TEXT_RAW_PROPERTY = '#channel_raw';

/** One live string's run: where its glyphs start, how many there are, and the look. */
export interface TextRun {
  name: string;
  /** The first container slot; the run occupies `address` through `address + length - 1`. */
  address: number;
  length: number;
  /** The screen-local glyph definition this run mounts. */
  definition: string;
}

/**
 * A live string as a run of glyph cells.
 *
 * One host per cell, because `collection_index` is only accepted on a direct
 * child of a control declaring `collection_name`. The hosts sit in a
 * horizontal stack and hug their glyph, so the run reads as text rather than
 * as a grid of letters.
 */
export const text: Connector<TextRun> = (data, face, ctx) => {
  const hug: [string, string] = ['100%c', '100%c'];

  return {
    [data.name]: {
      type: 'stack_panel',
      orientation: 'horizontal',
      ...placed(face),
      controls: Array.from({ length: data.length }, (_unused, cell): ControlEntry => ({
        [`cell_${String(cell)}@${TEXT_DEF.textHost}`]: {
          size: hug,
          controls: [{ [`glyph@${ctx.ns}.${data.definition}`]: { collection_index: data.address + cell } }],
        },
      })),
    },
  };
};

/**
 * The definition one character cell instantiates.
 *
 * A binding cannot be parameterised: a `$variable` inside one is dropped
 * outright in a subtree inserted through `modifications`, measured six ways,
 * so every name in a binding is baked here and a reference may only supply
 * what is NOT a binding — the collection index, and the box.
 *
 * The cell reads its slot's STACK SIZE, builds the key prefix plus that code,
 * and localizes it. No per-slot binding publishes text, so this is how a
 * string gets in at all: the generated `.lang` decides what each code draws
 * as, which means any glyph, any font, any language.
 */
export const textDef = (style: TextStyle, collection: string): Control => ({
  ...label(
    { ...style, text: TEXT_PROPERTY, localize: true },
    // Its own natural size. The cells are packed by the engine rather than
    // positioned by the compiler, because glyph widths are not knowable here:
    // which character lands in a cell is decided at runtime. On a fixed pitch
    // every narrow glyph left a gap, and `units` came out `uni ts`.
    { size: ['default', 'default'] },
  ),
  bindings: [
    { binding_type: 'collection_details', binding_collection_name: collection },
    {
      binding_name: '#inventory_stack_count',
      binding_name_override: TEXT_RAW_PROPERTY,
      binding_type: 'collection',
      binding_collection_name: collection,
    },
    {
      binding_type: 'view',
      source_property_name: `(${literal(KEY_PREFIX)} + ${TEXT_RAW_PROPERTY})`,
      target_property_name: TEXT_PROPERTY,
    },
  ] satisfies Binding[],
});

export { topLeft };
