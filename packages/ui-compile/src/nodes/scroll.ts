import { SCROLL_SLOT_TYPE } from '@bedrock-core/ui-runtime/compile';
import { CONTAINER, layerOf, offsetOf, sizeOf, topLeft, visibilityOf } from './shared';
import type { IrNode, NodeBase, NodeDefinition, Rect } from './types';

/**
 * A scrolling region: a viewport at its solved rect, over content laid out
 * on its own and taller than the viewport. The client scrolls it; the layout
 * stays frozen. Children are positioned relative to the content's origin.
 */
export interface ScrollNode extends NodeBase {
  kind: 'scroll';
  /** Height of the content, at least the viewport's. */
  extent: number;
  children: IrNode[];
}

declare module './types' {
  interface IrNodeMap {
    scroll: ScrollNode;
  }
}

/** The content's own origin: a region's children are solved relative to its top-left. */
const REGION_ORIGIN: Rect = { x: 0, y: 0, width: 0, height: 0 };

/**
 * Transparent to the layout, but not to the output: a region has a viewport
 * of its own, and its content was laid out from the region's origin.
 */
export const scrollDefinition: NodeDefinition<ScrollNode> = {
  kind: 'scroll',
  types: [SCROLL_SLOT_TYPE],

  lower(element, _type, ctx): ScrollNode {
    const children = ctx.children(element, REGION_ORIGIN);
    const bottom = children.reduce((max, child) => Math.max(max, child.rect.y + child.rect.height), 0);

    return {
      kind: 'scroll',
      name: ctx.name('scroll'),
      rect: ctx.rect,
      ...ctx.decoration,
      extent: Math.max(ctx.rect.height, bottom),
      children,
    };
  },

  children: node => node.children,

  emit(node, ctx) {
    // The library's scrolling region, with the content as a definition of its
    // own because the region takes it by name. The 5-texel track runs down the
    // right edge, the viewport spans the rest.
    const content = `${node.name}_content`;

    ctx.defs[content] = {
      type: 'panel',
      size: [node.rect.width, node.extent],
      ...topLeft,
      controls: node.children.map(child => ctx.emitNode(child)),
    };

    return {
      [`${node.name}@${CONTAINER}.scroll`]: {
        size: sizeOf(node.rect),
        offset: offsetOf(node.rect),
        ...topLeft,
        ...layerOf(node),
        ...visibilityOf(node),
        $scrolling_content: `${ctx.ns}.${content}`,
      },
    };
  },
};
