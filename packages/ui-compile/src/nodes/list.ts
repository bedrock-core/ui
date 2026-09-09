import { LIST_SLOT_TYPE, listCount } from '@bedrock-core/ui-runtime/compile';
import type { ControlEntry } from '../jsonui';
import { layerOf, num, offsetOf, topLeft, visibilityOf } from './shared';
import type { IrNode, NodeBase, NodeDefinition } from './types';

/**
 * A variable count on a frozen screen: `max` rows compiled, one carried int
 * saying how many are real.
 *
 * The LOOK is a stack of the rows the layout placed, the surplus hidden: a
 * `stack_panel` gives an invisible child no space (measured, static and bound
 * alike), so the rows that show pack from the top and a scroll over the list
 * reaches exactly that far. The MECHANISM is the host's: which channel the
 * count travels on and how each row's gate reads it back differ per screen,
 * so the host turns each row of the face into a gate and this module carries
 * only what it needs — the rows, the channel's address, and the count the
 * build rendered with (what the gates are seeded from).
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

  socket: () => 'list',

  // Each row in a panel exactly one pitch tall (gap included, the last row its
  // own height), so the stack keeps the layout's spacing; the rows past the
  // reference count hidden, which is what the host's gates seed from.
  face(node, ctx): ControlEntry {
    return {
      [node.name]: {
        type: 'stack_panel',
        orientation: 'vertical',
        size: [node.rect.width, '100%c'],
        offset: offsetOf(node.rect),
        ...topLeft,
        ...layerOf(node),
        ...visibilityOf(node),
        controls: node.rows.map((row, index) => {
          const next = node.rows[index + 1];
          const pitch = next === undefined ? row.rect.height : next.rect.y - row.rect.y;

          return {
            [`${row.name}_row`]: {
              type: 'panel',
              size: [node.rect.width, pitch],
              ...topLeft,
              ...index < node.initial ? {} : { visible: false },
              controls: [ctx.emitNode({ ...row, rect: { ...row.rect, y: 0 } })],
            },
          };
        }),
      },
    };
  },
};
