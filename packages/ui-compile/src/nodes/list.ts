import { LIST_SLOT_TYPE, listCount } from '@bedrock-core/ui-runtime/compile';
import type { ControlEntry } from '../jsonui';
import { layerOf, num, offsetOf, sizeOf, topLeft, visibilityOf } from './shared';
import type { IrNode, NodeBase, NodeDefinition } from './types';

/**
 * A variable count on a frozen screen: `max` rows compiled, one carried int
 * saying how many are real.
 *
 * The LOOK is nothing — a box with the rows the layout already placed. The
 * MECHANISM is the host's: which channel the count travels on and how a gate
 * reads it back differ per screen, so the gating lives in the host's emit and
 * this module only carries what it needs — the rows, the channel's address,
 * and the count the build rendered with (what the gates are seeded from).
 */
export interface ListNode extends NodeBase {
  kind: 'list';
  /** The compiled row subtrees, one per slot, rects relative to this node. */
  rows: IrNode[];
  /** The channel the count travels on — a form entry, a modal row. */
  countEntry: number;
  /** The count the build rendered with: how many gates are seeded visible. */
  initial: number;
}

declare module './types' {
  interface IrNodeMap {
    list: ListNode;
  }
}

export const listDefinition: NodeDefinition<ListNode> = {
  kind: 'list',
  types: [LIST_SLOT_TYPE],

  lower(element, _type, ctx): ListNode {
    return {
      kind: 'list',
      name: ctx.name('list'),
      rect: ctx.rect,
      ...ctx.decoration,
      rows: ctx.children(element, ctx.own),
      countEntry: ctx.channelOf(element).address,
      initial: num(listCount(element), 0),
    };
  },

  children(node): IrNode[] {
    return node.rows;
  },

  // The hostless emit: the box and its rows, every one drawn. Only a host has
  // the mechanism to hide the surplus, and every host that compiles a list
  // overrides this — it exists so the kind is total, not because it is used.
  emit(node, ctx): ControlEntry {
    return {
      [node.name]: {
        type: 'panel',
        size: sizeOf(node.rect),
        offset: offsetOf(node.rect),
        ...topLeft,
        ...layerOf(node),
        ...visibilityOf(node),
        controls: node.rows.map(row => ctx.emitNode(row)),
      },
    };
  },
};
