import { IMAGE_TYPE } from '@bedrock-core/ui-runtime/compile';
import { layerOf, offsetOf, sizeOf, tailOf, topLeft, visibilityOf } from './shared';
import type { NodeBase, NodeDefinition } from './types';

export interface ImageNode extends NodeBase {
  kind: 'image';
  texture: string;
}

declare module './types' {
  interface IrNodeMap {
    image: ImageNode;
  }
}

export const imageDefinition: NodeDefinition<ImageNode> = {
  kind: 'image',
  types: [IMAGE_TYPE],

  lower(element, _type, ctx): ImageNode {
    return {
      kind: 'image',
      name: ctx.name('image'),
      rect: ctx.rect,
      ...ctx.decoration,
      texture: tailOf(element.props.value) ?? '',
    };
  },

  emit(node) {
    return {
      [node.name]: {
        type: 'image',
        size: sizeOf(node.rect),
        ...layerOf(node),
        ...visibilityOf(node),
        offset: offsetOf(node.rect),
        ...topLeft,
        texture: node.texture,
        keep_ratio: false,
      },
    };
  },
};
