import type { JSX } from '@bedrock-core/ui-runtime';
import {
  hasTextChannel, isTextElementType, labelFontFields, TEXT_SHADOW_TYPE, TEXT_SHADOW_WRAP_TYPE,
} from '@bedrock-core/ui-runtime/compile';
import { textFace } from '../../faces';
import { composedKey } from '../utils/composed';
import { boxOf, num, str, tailOf } from '../utils/shared';
import type { LabelStyle, LowerContext, NodeBase, NodeDefinition, Rect } from '../utils/types';

/** Text is baked unless state probes detect a changing value. */
export interface TextNode extends NodeBase, LabelStyle {
  kind: 'text';
  /** Keeps localized overflow text within the box solved for its line limit. */
  bounded?: true;
  /** Host address for a detected value; static strings have none. */
  address?: number;
  /** Display limit of a carried value. Absent on a static string. */
  length?: number;
  /**
   * Drawn at the width of its glyphs, for a string in a stack whose length is
   * only known when the screen is shown. Declared by `<Text hug>`.
   */
  hug?: true;
  /** What the build rendered: the face's string, and what `debug` compares against. */
  text: string;
  /** True when `text` is a translation key the client resolves. */
  localize: boolean;
  /**
   * What a text the build composed says in each language: `text` is then the
   * key the build minted for it, and the screen writes these under it.
   */
  translations?: Readonly<Record<string, string>>;
}

/** The host address and display limit of a text value. */
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
const textMetricsOf = (value: unknown): { isKey: boolean; resolvedText: string; hug: boolean; bounded?: true; translations?: Record<string, string> } => {
  if (typeof value !== 'object' || value === null) {
    return { isKey: false, resolvedText: '', hug: false };
  }

  const isKey = 'isKey' in value && value.isKey === true;
  const resolvedText = 'resolvedText' in value && typeof value.resolvedText === 'string'
    ? value.resolvedText
    : '';
  const translations = 'translations' in value ? stringsOf(value.translations) : undefined;

  const bounded = ('overflow' in value && value.overflow === 'ellipsis') || ('maxLines' in value && typeof value.maxLines === 'number');

  return { isKey, resolvedText, hug: 'hug' in value && value.hug === true,
    ...bounded ? { bounded: true } : {}, ...translations === undefined ? {} : { translations } };
};

/** A record of strings by locale, when that is what a value is. */
const stringsOf = (value: unknown): Record<string, string> | undefined => {
  if (typeof value !== 'object' || value === null) {
    return undefined;
  }

  const entries = Object.entries(value);

  return entries.every((entry): entry is [string, string] => typeof entry[1] === 'string')
    ? Object.fromEntries(entries)
    : undefined;
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
    // here the build's own resolution is baked instead. A composed text is
    // drawn through the key minted for what it says in every language.
    ...metrics.translations === undefined
      ? { text: tail ?? metrics.resolvedText, localize: tail !== undefined && metrics.isKey }
      : { text: composedKey(metrics.translations), localize: true, translations: metrics.translations },
    fontType: str(props.fontType, defaults.fontType),
    fontScaleFactor: num(props.fontScaleFactor, defaults.fontScaleFactor),
    ...metrics.hug ? { hug: true as const } : {},
    ...metrics.bounded === true ? { bounded: true as const } : {},
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
  node.hug ?? null,
]);

export const textDefinition: NodeDefinition<TextNode> = {
  kind: 'text',
  matches: isTextElementType,

  lower(element, type, ctx: LowerContext): TextNode {
    const { props } = element;
    const shadow = type === TEXT_SHADOW_TYPE || type === TEXT_SHADOW_WRAP_TYPE;

    // The label's own nudge, applied here so the emitter sees one offset.
    const nudged: Rect = { ...ctx.rect, x: ctx.rect.x + num(props.labelX), y: ctx.rect.y + num(props.labelY) };

    const base = bakedOf(element, {
      name: ctx.name(hasTextChannel(element) ? 'text' : 'label'), rect: nudged, ...ctx.decoration,
      ...shadow ? { shadow } : {},
    });

    if (!hasTextChannel(element)) { return base; }

    const channel = ctx.channelOf(element);

    return {
      ...base,
      address: channel.address,
      length: channel.length,
    };
  },

  // Static text is already present in the face; detected values ask for a channel.
  socket: node => node.address === undefined ? undefined : 'text',

  // At rest: the string the build rendered with, in the box the layout gave
  // it. A host stands its carrier here when there is one.
  face(node) {
    return textFace({
      ...boxOf(node),
      ...node.hug === undefined ? {} : { hug: node.hug },
      ...node.bounded === true ? { bounded: true } : {},
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
