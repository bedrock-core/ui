import type { JSX } from '@bedrock-core/ui-runtime';
import {
  isTextElementType, labelFontFields, liveTextLength, TEXT_SHADOW_TYPE, TEXT_SHADOW_WRAP_TYPE,
} from '@bedrock-core/ui-runtime/compile';
import { textFace } from '../../faces';
import { boxOf, num, str, tailOf } from '../utils/shared';
import type { LabelStyle, LowerContext, NodeBase, NodeDefinition, Rect } from '../utils/types';

/**
 * A string.
 *
 * One kind for both, because a string is a string: what separates them is
 * whether script writes it while the screen is open, and that is a property
 * of THIS string rather than of a different kind of control. A string the
 * build knows is drawn as it is and asks the host for nothing. A live one
 * reserves a box for its longest form and asks for a carrier — one container
 * slot per character on a chest, an entry on a form — and the face draws the
 * value the build rendered into that same box.
 */
export interface TextNode extends NodeBase, LabelStyle {
  kind: 'text';
  /**
   * Where the host put the run, when the string is live. On a chest it
   * occupies `address .. address + length - 1`. Absent on a baked string,
   * which nothing carries.
   */
  address?: number;
  /** How many characters the screen drew room for. Absent on a baked string. */
  length?: number;
  /** What the build rendered: the face's string, and what `debug` compares against. */
  text: string;
  /** True when `text` is a translation key the client resolves. */
  localize: boolean;
}

/** Whether a host has to carry this string, which is what `maxLength` declares. */
export const isLive = (node: TextNode): boolean => node.address !== undefined;

/**
 * The run a live string was given.
 *
 * Only a baked string has none, and that one declares no text socket, so
 * nothing that fills a carrier is ever handed one.
 */
export const runOf = (node: TextNode): { address: number; length: number } => ({
  address: node.address ?? 0,
  length: node.length ?? 0,
});

declare module '../utils/types' {
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

const bakedOf = (element: JSX.Element, base: Omit<TextNode, 'kind' | 'text' | 'localize' | 'fontType' | 'fontScaleFactor'>): TextNode => {
  const { props } = element;
  const tail = tailOf(props.value);
  const metrics = textMetricsOf(props.__textMetrics);
  const defaults = labelFontFields();

  return {
    kind: 'text',
    ...base,
    // A string tail is what the label shows: a literal, or a key the engine
    // resolves. A RawMessage tail would be resolved by the client in a form;
    // here the build's own resolution is baked instead.
    text: tail ?? metrics.resolvedText,
    localize: tail !== undefined && metrics.isKey,
    fontType: str(props.fontType, defaults.fontType),
    fontScaleFactor: num(props.fontScaleFactor, defaults.fontScaleFactor),
    ...rgbOf(props.__color),
    ...alignmentOf(props.__textAlign),
  };
};

/** A `color` prop as the label's RGB, when it is three finite numbers. */
const rgbOf = (value: unknown): { color?: readonly [number, number, number] } =>
  Array.isArray(value) && value.length === 3 && value.every(part => typeof part === 'number' && Number.isFinite(part))
    ? { color: [value[0], value[1], value[2]] as const }
    : {};

/** A `textAlign` prop as the label's alignment, when it is one the engine knows. */
const alignmentOf = (value: unknown): { textAlignment?: 'left' | 'center' | 'right' } =>
  value === 'left' || value === 'center' || value === 'right' ? { textAlignment: value } : {};

/**
 * What lets two text runs share a carrier definition: everything except which
 * address they read.
 */
export const textSignature = (node: TextNode): string => JSON.stringify([
  node.fontType,
  node.fontScaleFactor,
  node.shadow ?? null,
  node.color ?? null,
  node.textAlignment ?? null,
]);

export const textDefinition: NodeDefinition<TextNode> = {
  kind: 'text',
  matches: isTextElementType,

  lower(element, type, ctx: LowerContext): TextNode {
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
        text: tail ?? metrics.resolvedText,
        localize: tail !== undefined && metrics.isKey,
        fontType: str(props.fontType, defaults.fontType),
        fontScaleFactor: num(props.fontScaleFactor, defaults.fontScaleFactor),
        ...shadow ? { shadow } : {},
        ...rgbOf(props.__color),
        ...alignmentOf(props.__textAlign),
      };
    }

    return bakedOf(element, {
      name: ctx.name('label'),
      rect: nudged,
      ...ctx.decoration,
      ...shadow ? { shadow } : {},
    });
  },

  // Only a live string asks for anything. A baked one is drawn once and
  // forever, which is the same answer `image` gives about its own path.
  socket: node => (isLive(node) ? 'text' : undefined),

  // At rest: the string the build rendered with, in the box the layout gave
  // it. A host stands its carrier here when there is one.
  face(node) {
    return textFace({
      ...boxOf(node),
      text: node.text,
      localize: node.localize,
      fontType: node.fontType,
      fontScaleFactor: node.fontScaleFactor,
      ...node.shadow === undefined ? {} : { shadow: node.shadow },
      ...node.color === undefined ? {} : { color: node.color },
      ...node.textAlignment === undefined ? {} : { align: node.textAlignment },
    });
  },
};
