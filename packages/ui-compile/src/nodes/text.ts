import type { JSX } from '@bedrock-core/ui-runtime';
import {
  isTextElementType, labelFontFields, liveTextLength, TEXT_SHADOW_TYPE, TEXT_SHADOW_WRAP_TYPE,
} from '@bedrock-core/ui-runtime/compile';
import { labelDefinition, type LabelNode } from './label';
import { num, str, tailOf } from './shared';
import type { LabelStyle, LowerContext, NodeBase, NodeDefinition, Rect } from './types';

/**
 * A string the script writes at runtime.
 *
 * The look is a label like any other; what carries the string is the host's:
 * one container slot per character on a chest, an entry on a form. The face
 * draws the string the build rendered with, in the box the layout reserved.
 */
export interface TextNode extends NodeBase, LabelStyle {
  kind: 'text';
  /** Where the host put the run. On a chest it occupies `address .. address + length - 1`. */
  address: number;
  /** How many characters the screen drew room for. */
  length: number;
  /** What the build rendered: the face's string, and what `debug` compares against. */
  initial: string;
  /** True when `initial` is a translation key the client resolves. */
  localize: boolean;
}

declare module './types' {
  interface IrNodeMap {
    text: TextNode;
  }
}

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
    ...rgbOf(props.__color),
  };
};

/** A `color` prop as the label's RGB, when it is three finite numbers. */
const rgbOf = (value: unknown): { color?: readonly [number, number, number] } =>
  Array.isArray(value) && value.length === 3 && value.every(part => typeof part === 'number' && Number.isFinite(part))
    ? { color: [value[0], value[1], value[2]] as const }
    : {};

/**
 * What lets two text runs share a carrier definition: everything except which
 * address they read.
 */
export const textSignature = (node: TextNode): string => JSON.stringify([
  node.fontType,
  node.fontScaleFactor,
  node.shadow ?? null,
  node.color ?? null,
]);

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
      const tail = tailOf(props.value);
      const metrics = textMetricsOf(props.__textMetrics);

      return {
        kind: 'text',
        name: ctx.name('text'),
        rect: nudged,
        ...ctx.decoration,
        address: channel.address,
        length: channel.length,
        initial: tail ?? metrics.resolvedText,
        localize: tail !== undefined && metrics.isKey,
        fontType: str(props.fontType, defaults.fontType),
        fontScaleFactor: num(props.fontScaleFactor, defaults.fontScaleFactor),
        ...shadow ? { shadow } : {},
        ...rgbOf(props.__color),
      };
    }

    return labelOf(element, {
      name: ctx.name('label'),
      rect: nudged,
      ...ctx.decoration,
      ...shadow ? { shadow } : {},
    });
  },

  socket: () => 'text',

  // At rest: the string the build rendered with, as a label in the reserved
  // box. A host stands its carrier here.
  face(node, ctx) {
    const { address: _address, length: _length, initial, ...style } = node;

    return labelDefinition.face({ ...style, kind: 'label', text: initial }, ctx);
  },
};
