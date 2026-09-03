import { SCROLL_SLOT_TYPE, SCROLL_TRACK_WIDTH } from '@bedrock-core/ui-runtime/compile';
import { layerOf, offsetOf, SHAPES, sizeOf, topLeft, visibilityOf } from './shared';
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
 *
 * The same on every host, which is why this kind has no mechanism to override:
 * a scroll clips and scrolls baked content and reads nothing at all.
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
    const [sole] = node.children;

    // A scroll over exactly one list takes the LIST as its content: the host
    // emits a list as a stack of gated rows sized `100%c`, and a stack gives
    // an invisible child no space (measured, static and bound alike), so the
    // extent follows the live count with nothing decoded — vanilla's own idiom
    // for a scrolling list. Baked content otherwise.
    const [stack] = ctx.host.id === 'form' && node.children.length === 1 && sole?.kind === 'list'
      ? Object.values(ctx.emitNode({ ...sole, rect: { ...sole.rect, x: 0, y: 0 } }))
      : [];

    // Never shorter than the viewport: with asserts on, content that fits with
    // room to spare puts the scrollbar's percentage out of 0..1 and the client
    // asserts. `min_size` is the floor; the stack still grows past it.
    // The column the layout gave the content: the viewport less the track.
    const width = Math.max(0, node.rect.width - SCROLL_TRACK_WIDTH);

    ctx.defs[content] = stack === undefined
      ? {
          type: 'panel',
          size: [width, node.extent],
          ...topLeft,
          controls: node.children.map(child => ctx.emitNode(child)),
        }
      : { ...stack, min_size: [width, node.rect.height] };

    return {
      [`${node.name}@${SHAPES}.scroll`]: {
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
