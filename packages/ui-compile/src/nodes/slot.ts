import type { SlotRole } from '@bedrock-core/ui-runtime';
import { SLOT_TYPE, slotInteractive, slotSource } from '@bedrock-core/ui-runtime/compile';
import { cellFrame, layerOf, visibilityOf } from './shared';
import type { NodeBase, NodeDefinition } from './types';

/**
 * A slot reading a collection the screen does not own, at an author-given
 * index. The runtime never allocates or polls it: an interactive one is driven
 * by the engine's own take/place on that collection, a display-only one by
 * nothing at all.
 */
export interface SlotSource {
  /** JSON UI collection the cell reads, e.g. `inventory_items`. */
  collection: string;
  /** The cell of that collection to draw. */
  index: number;
  /** Whether the player can move items through it. */
  interactive: boolean;
}

/** A real container slot the player can interact with. */
export interface SlotNode extends NodeBase {
  kind: 'slot';
  /** Where the host put this cell. Unused when foreign — that index is the author's. */
  address: number;
  /**
   * Enforced by the runtime, never by the engine: a container offers no way
   * to veto a move, so a forbidden one is undone a tick later rather than
   * prevented. Meaningful only for an interactive own slot.
   */
  role: SlotRole;
  /**
   * Whether the player can move items through the slot. A locked slot draws an
   * inert cell — the item shows but no route reaches it — since a container can
   * only undo a move a tick later, never veto one, and its {@link role} no
   * longer applies. A foreign slot carries its own flag on {@link source}.
   */
  interactive: boolean;
  /**
   * A collection other than the screen's own. Present makes the slot foreign:
   * `slot` and `role` no longer apply, and the runtime never touches it.
   */
  source?: SlotSource;
}

declare module './types' {
  interface IrNodeMap {
    slot: SlotNode;
  }
}

export const slotDefinition: NodeDefinition<SlotNode> = {
  kind: 'slot',
  types: [SLOT_TYPE],

  lower(element, _type, ctx): SlotNode {
    const source = slotSource(element);

    if (source !== undefined) {
      // Foreign: reads another collection at the author's index, so it is not
      // in the allocation and the runtime never polls it.
      return {
        kind: 'slot',
        name: ctx.name('slot'),
        rect: ctx.rect,
        ...ctx.decoration,
        address: source.index,
        role: 'both',
        interactive: source.interactive,
        source,
      };
    }

    const cell = ctx.cellOf(element);

    if (cell.role === 'button') {
      throw new Error('The allocation numbered a <Slot> as a button.');
    }

    return {
      kind: 'slot',
      name: ctx.name('slot'),
      rect: ctx.rect,
      ...ctx.decoration,
      address: cell.address,
      role: cell.role,
      interactive: slotInteractive(element),
    };
  },

  socket: () => 'slot',

  // At rest: an empty cell. The host stands a cell over its collection here.
  face(node) {
    return {
      [node.name]: {
        ...cellFrame(node.rect),
        ...layerOf(node),
        ...visibilityOf(node),
      },
    };
  },
};
