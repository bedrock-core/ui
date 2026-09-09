import { IMAGE_TYPE, liveTexture } from '@bedrock-core/ui-runtime/compile';
import { layerOf, offsetOf, sizeOf, tailOf, topLeft, visibilityOf } from './shared';
import type { NodeBase, NodeDefinition } from './types';

export interface ImageNode extends NodeBase {
  kind: 'image';
  /** The baked path, or the one the build rendered with when the texture is carried. */
  texture: string;
  /**
   * Where the host put the path when the image carries it live. The look is
   * the same either way; only a host with a string channel can draw it, and
   * that host's emit takes over when this is set.
   */
  address?: number;
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
      ...liveTexture(element) ? { address: ctx.channelOf(element).address } : {},
    };
  },

  socket: node => (node.address === undefined ? undefined : 'texture'),

  // The texture the build rendered with; a host with a string carrier stands
  // its live image here.
  face(node) {
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
