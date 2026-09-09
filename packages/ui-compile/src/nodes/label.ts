import { FONT_SIZE, layerOf, offsetOf, sizeOf, topLeft, visibilityOf } from './shared';
import type { LabelStyle, NodeBase, NodeDefinition } from './types';

/** A baked string. May use any character, because nothing decodes it. */
export interface LabelNode extends NodeBase, LabelStyle {
  kind: 'label';
  text: string;
  /** True only when `text` is a translation key. Labels localize by default. */
  localize: boolean;
}

declare module './types' {
  interface IrNodeMap {
    label: LabelNode;
  }
}

/**
 * Labels are lowered by the text kind: whether a `<Text>` bakes into a label
 * or becomes a live channel is its `maxLength`, which only that lowering sees.
 */
export const labelDefinition: NodeDefinition<LabelNode> = {
  kind: 'label',

  face(node) {
    return {
      [node.name]: {
        type: 'label',
        size: sizeOf(node.rect),
        ...layerOf(node),
        ...visibilityOf(node),
        offset: offsetOf(node.rect),
        ...topLeft,
        text: node.text,
        localize: node.localize,
        font_type: node.fontType,
        font_size: FONT_SIZE,
        font_scale_factor: node.fontScaleFactor,
        ...node.shadow ? { shadow: node.shadow } : {},
        ...node.color === undefined ? {} : { color: [...node.color] as [number, number, number] },
      },
    };
  },
};
