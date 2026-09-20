import { SCROLL_RESERVE, SCROLL_SLOT_TYPE, WIDE_RECT } from '@bedrock-core/ui-runtime/compile';
import { type Box, entry, panelFace, placed, scrollContent, scrollFace } from '../../faces';
import type { ControlEntry } from '../../jsonui';
import { boxOf } from '../utils/shared';
import type { ListNode } from './list';

/**
 * The namespace of the controls no host owns: the ones that are the same
 * wherever they are drawn, because they read nothing and bind nothing. A
 * scrolling region is the first of them.
 */
const SHAPES = 'core_ui_shapes';

import type { FaceEmit, IrNode, NodeBase, NodeDefinition, Rect } from '../utils/types';

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
  /**
   * A region over ONE list, solved once more across the whole viewport.
   *
   * What a list holds when the screen is shown is not what the build
   * measured, so a region over one cannot know at build whether its rows
   * scroll. Rather than keep the track's room whatever the count, the layout
   * solved the same rows a second time, one track wider, and the region draws
   * both: the scrolling rows behind a gate that opens past `fit`, the wide
   * rows behind one that opens up to it, on the count the list already
   * carries. `fit` is how many rows the viewport holds at the full width.
   */
  wide?: { list: ListNode; fit: number };
}

declare module '../utils/types' {
  interface IrNodeMap {
    scroll: ScrollNode;
  }
}

/** The content's own origin: a region's children are solved relative to its top-left. */
const REGION_ORIGIN: Rect = { x: 0, y: 0, width: 0, height: 0 };

/** The region's own box, seen from inside it: where each of its two variants sits. */
const inside = (node: ScrollNode): Rect => ({ x: 0, y: 0, width: node.rect.width, height: node.rect.height });

/** The list a region holds, solved wide, and how many of its rows the viewport holds that way. */
const wideOf = (nodes: IrNode[], height: number): { list: ListNode; fit: number } => {
  const [list] = nodes;

  if (list === undefined || list.kind !== 'list' || nodes.length !== 1) {
    throw new Error('unreachable: a region is laid out wide only over a sole list');
  }

  return { list, fit: list.rows.filter(row => list.rect.y + row.rect.y + row.rect.height <= height).length };
};

/**
 * The library's scrolling region over the node's content, at `box`. The
 * content is a definition of its own because the region takes it by name.
 */
const region = (node: ScrollNode, box: Box, ctx: FaceEmit): ControlEntry => {
  const [sole] = node.children;

  // A scroll over exactly one stack takes the STACK as its content: a list
  // is a stack of rows, a folding column is a stack too, and a stack gives
  // an invisible child no space (measured, static and bound alike), so the
  // extent follows what is shown with nothing decoded — vanilla's own idiom
  // for a scrolling list. Baked content otherwise.
  const soleStack = sole !== undefined && node.children.length === 1
    && (sole.kind === 'list' || (sole.kind === 'panel' && sole.stack === true));

  // The column the layout gave the content: the viewport less the track and
  // the clear space before it.
  const width = Math.max(0, node.rect.width - SCROLL_RESERVE);
  let content: string;

  if (soleStack) {
    // The stack IS the content definition, under the stack's own name, so a
    // host that has to fill it (a list's gates) finds it where every other
    // node is found. Never shorter than the viewport: with asserts on,
    // content that fits with room to spare puts the scrollbar's percentage
    // out of 0..1 and the client asserts. `min_size` is the floor; the
    // stack still grows past it.
    const [stack] = Object.values(ctx.emitNode({ ...sole, rect: { ...sole.rect, x: 0, y: 0 } }));

    content = sole.name;
    ctx.defs[content] = { ...stack, min_size: [width, node.rect.height] };
  } else {
    content = `${node.name}_content`;
    ctx.defs[content] = scrollContent({
      axis: 'vertical',
      across: width,
      extent: node.extent,
      children: node.children.map(child => ctx.emitNode(child)),
    });
  }

  return scrollFace({ ...box, shape: `${SHAPES}.scroll`, content: `${ctx.ns}.${content}` });
};

/**
 * Transparent to the layout, but not to the output: a region has a viewport
 * of its own, and its content was laid out from the region's origin.
 *
 * The same on every host, save for one thing: a region over a list asks the
 * host which of its two widths to show, since only the host has the count.
 */
export const scrollDefinition: NodeDefinition<ScrollNode> = {
  kind: 'scroll',
  types: [SCROLL_SLOT_TYPE],

  lower(element, _type, ctx): ScrollNode {
    const children = ctx.children(element, REGION_ORIGIN);
    const bottom = children.reduce((max, child) => Math.max(max, child.rect.y + child.rect.height), 0);
    const [sole] = children;
    const wide = element.props[WIDE_RECT.marker] === true && children.length === 1 && sole?.kind === 'list'
      ? wideOf(ctx.children(element, REGION_ORIGIN, { wide: true }), ctx.rect.height)
      : undefined;

    return {
      kind: 'scroll',
      name: ctx.name('scroll'),
      rect: ctx.rect,
      ...ctx.decoration,
      extent: Math.max(ctx.rect.height, bottom),
      children,
      ...wide === undefined ? {} : { wide },
    };
  },

  children: node => (node.wide === undefined ? node.children : [...node.children, node.wide.list]),

  // Which width shows is the host's to decide, and only where the choice is
  // real: a list whose every row fits the viewport never scrolls.
  socket: node => (node.wide !== undefined && node.wide.fit < node.wide.list.rows.length ? 'fits' : undefined),

  face(node, ctx) {
    if (node.wide !== undefined) {
      const { list, fit } = node.wide;

      // Every row fits: the wide rows are the region, and nothing scrolls.
      if (fit >= list.rows.length) {
        return panelFace({ ...boxOf(node), children: [ctx.emitNode(list)] });
      }

      // Both, seeded from what the build rendered, the host's gates deciding
      // from the first present on.
      const shown = list.initial <= fit;

      return entry(node.name, {
        type: 'panel',
        ...placed(boxOf(node)),
        controls: [
          region(node, { name: `${node.name}_scrolls`, rect: inside(node), hidden: shown }, ctx),
          panelFace({ name: `${node.name}_fits`, rect: inside(node), hidden: !shown, children: [ctx.emitNode(list)] }),
        ],
      });
    }

    // Content the build can see fitting is drawn as itself: a region whose
    // content cannot run past the viewport has nothing to scroll, and a
    // scrollbar beside it is a track the player can never use. The layout laid
    // such content across the whole viewport, since no track was coming.
    if (node.extent <= node.rect.height) {
      return panelFace({
        ...boxOf(node),
        children: node.children.map(child => ctx.emitNode(child)),
      });
    }

    return region(node, boxOf(node), ctx);
  },
};
