import type { JSX } from '@bedrock-core/ui-runtime';
import {
  isTextElementType, KEY_PREFIX, labelFontFields, liveTextLength, TEXT_SHADOW_TYPE, TEXT_SHADOW_WRAP_TYPE,
} from '@bedrock-core/ui-runtime/compile';
import type { Binding, Control } from '../jsonui';
import type { LabelNode } from './label';
import { CHEST, FONT_SIZE, layerOf, literal, num, offsetOf, sizeOf, str, tailOf, topLeft, visibilityOf } from './shared';
import type { LabelStyle, LowerContext, NodeBase, NodeDefinition, Rect } from './types';

/**
 * A run of characters the script writes as an ordinary string.
 *
 * One cell per character, each backed by its own bank slot: the slot's stack
 * size is the character code, and the label localizes `keyPrefix + code` so the
 * generated `.lang` decides what is drawn. That is the only way text reaches a
 * container screen -- no per-slot binding publishes a string.
 */
export interface TextNode extends NodeBase, LabelStyle {
  kind: 'text';
  /** Where the host put the run. On a chest it occupies `address .. address + length - 1`. */
  address: number;
  /** How many characters the screen drew room for. */
  length: number;
}

declare module './types' {
  interface IrNodeMap {
    text: TextNode;
  }
}

/** The static host one character cell mounts, and the per-screen name a channel definition takes. */
export const TEXT_DEF = {
  textHost: `${CHEST}.text_host`,
  text: 'text_channel',
} as const;

/**
 * Private name a text channel's string is renamed to.
 *
 * Never `#hover_text` itself: the engine owns that name at screen scope and
 * overwrites it while a slot is pressed.
 */
const TEXT_PROPERTY = '#channel_text';

/** Where the raw code lands before the key is built around it. */
const TEXT_RAW_PROPERTY = '#channel_raw';

/** What `<Text>` recorded about its string for the layout pass. */
const textMetricsOf = (value: unknown): { isKey: boolean; resolvedText: string } => {
  if (typeof value !== 'object' || value === null) {
    return { isKey: false, resolvedText: '' };
  }

  const isKey = 'isKey' in value && value.isKey === true;
  const resolvedText = 'resolvedText' in value && typeof value.resolvedText === 'string'
    ? value.resolvedText
    : '';

  return { isKey, resolvedText };
};

const labelOf = (element: JSX.Element, base: Omit<LabelNode, 'kind' | 'text' | 'localize' | 'fontType' | 'fontScaleFactor'>): LabelNode => {
  const { props } = element;
  const tail = tailOf(props.value);
  const metrics = textMetricsOf(props.__textMetrics);
  const defaults = labelFontFields();

  return {
    kind: 'label',
    ...base,
    // A string tail is what the label shows: a literal, or a key the engine
    // resolves. A RawMessage tail would be resolved by the client in a form;
    // here the build's own resolution is baked instead.
    text: tail ?? metrics.resolvedText,
    localize: tail !== undefined && metrics.isKey,
    fontType: str(props.fontType, defaults.fontType),
    fontScaleFactor: num(props.fontScaleFactor, defaults.fontScaleFactor),
  };
};

/**
 * What lets two text runs share a definition: everything except which slots
 * they read.
 */
export const textSignature = (node: TextNode): string => JSON.stringify([
  node.fontType,
  node.fontScaleFactor,
  node.shadow ?? null,
]);

/**
 * The definition one character cell instantiates.
 *
 * A binding cannot be parameterised: a `$variable` inside one is dropped
 * outright in a subtree inserted through `modifications` -- measured six ways
 * -- so every name in a binding is baked here, and a reference may only supply
 * what is NOT a binding: the collection index, and the box.
 *
 * The cell reads its slot's STACK SIZE, builds `keyPrefix + code`, and
 * localizes it. No per-slot binding publishes text, so this is how a string
 * gets in: the generated `.lang` decides what each code draws as, which means
 * any glyph, any font, any language.
 */
export const textDef = (node: TextNode, collection: string): Control => ({
  type: 'label',
  // Its own natural size. The cells are packed by the engine rather than
  // positioned by the compiler, because glyph widths are not knowable here:
  // which character lands in a cell is decided at runtime. On a fixed pitch
  // every narrow glyph left a gap -- `units` came out `uni ts`.
  size: ['default', 'default'],
  text: TEXT_PROPERTY,
  localize: true,
  font_type: node.fontType,
  font_size: FONT_SIZE,
  font_scale_factor: node.fontScaleFactor,
  ...node.shadow ? { shadow: node.shadow } : {},
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

export const textDefinition: NodeDefinition<TextNode> = {
  kind: 'text',
  matches: isTextElementType,

  lower(element, type, ctx: LowerContext): TextNode | LabelNode {
    const { props } = element;
    const shadow = type === TEXT_SHADOW_TYPE || type === TEXT_SHADOW_WRAP_TYPE;
    const length = liveTextLength(element);
    const defaults = labelFontFields();

    // The label's own nudge, applied here so the emitter sees one offset.
    const nudged: Rect = { ...ctx.rect, x: ctx.rect.x + num(props.labelX), y: ctx.rect.y + num(props.labelY) };

    if (length !== undefined) {
      const channel = ctx.channelOf(element);

      return {
        kind: 'text',
        name: ctx.name('text'),
        rect: nudged,
        ...ctx.decoration,
        address: channel.address,
        length: channel.length,
        fontType: str(props.fontType, defaults.fontType),
        fontScaleFactor: num(props.fontScaleFactor, defaults.fontScaleFactor),
        ...shadow ? { shadow } : {},
      };
    }

    return labelOf(element, {
      name: ctx.name('label'),
      rect: nudged,
      ...ctx.decoration,
      ...shadow ? { shadow } : {},
    });
  },

  emit(node, ctx) {
    // One host per cell, because `collection_index` is only accepted on a
    // direct child of a control declaring `collection_name`. The hosts sit in
    // a horizontal stack panel and hug their glyph, so the run reads as text
    // rather than as a grid of letters.
    const def = ctx.textNames.get(textSignature(node)) ?? TEXT_DEF.text;
    const hug: [string, string] = ['100%c', '100%c'];

    return {
      [node.name]: {
        type: 'stack_panel',
        orientation: 'horizontal',
        size: sizeOf(node.rect),
        offset: offsetOf(node.rect),
        ...layerOf(node),
        ...visibilityOf(node),
        ...topLeft,
        controls: Array.from({ length: node.length }, (_unused, cell) => ({
          [`cell_${cell}@${TEXT_DEF.textHost}`]: {
            size: hug,
            controls: [{ [`glyph@${ctx.ns}.${def}`]: { collection_index: node.address + cell } }],
          },
        })),
      },
    };
  },
};
