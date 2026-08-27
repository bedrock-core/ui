import type { SlotRole } from '@bedrock-core/ui-runtime';
import { SLOT_TYPE, slotInteractive, slotSource } from '@bedrock-core/ui-runtime/compile';
import type { Control } from '../jsonui';
import {
  CELL_VAR, collectionKey, CONTAINER, layerOf, offsetOf, sizeOf, SLOT_VAR, topLeft, visibilityOf,
} from './shared';
import type { Emit, NodeBase, NodeDefinition } from './types';

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

/**
 * The library's own cell definitions a slot mounts, from the static
 * `core_ui_container` file the render pack ships. One per control shape, never
 * one per node.
 */
export const CELL = {
  host: `${CONTAINER}.slot_host`,
  slot: `${CONTAINER}.slot`,
  item: `${CONTAINER}.cell`,
  lockedSlot: `${CONTAINER}.locked_slot`,
  outputSlot: `${CONTAINER}.output_slot`,
  displayStates: `${CONTAINER}.display_states`,
  empty: `${CONTAINER}.empty`,
} as const;

/**
 * Which cell a slot host instantiates: an inert cell for a locked slot, the
 * guard-toggled pair for an output slot, or the host's default otherwise. An
 * input's refusals are the runtime's, so it needs no cell of its own.
 */
const cellOf = (node: SlotNode): { [CELL_VAR]?: string } => {
  if (!node.interactive) {
    return { [CELL_VAR]: CELL.lockedSlot };
  }

  return node.role === 'output' ? { [CELL_VAR]: CELL.outputSlot } : {};
};

/**
 * What the cell needs to draw the given collection: its item, and nothing that
 * reveals the runtime's transport. A display-only cell rides the inert button,
 * which withholds focus — no take, no place, no drop — since the engine's slot
 * has no take-only or place-only action to bake instead. `renderer`, when
 * given, hides a transport item for a player's own grids.
 */
export const containerItemVars = (collection: string, interactive: boolean, renderer?: string): Control => ({
  $item_collection_name: collection,
  ...renderer === undefined ? {} : { $item_renderer: renderer, $durability_bar_required: false },
  ...interactive ? {} : { $button_ref: CELL.displayStates },
});

/**
 * A foreign slot's cell definition, registered once per collection and
 * interactivity.
 */
const ensureForeignCell = (emit: Emit, collection: string, interactive: boolean): string => {
  const name = `${interactive ? 'slot' : 'display_slot'}__${collectionKey(collection)}`;

  if (emit.defs[name] === undefined) {
    emit.defs[name] = {
      type: 'panel',
      size: [18, 18],
      controls: [{ [`item@${CELL.item}`]: containerItemVars(collection, interactive) }],
    };
  }

  return `${emit.ns}.${name}`;
};

/**
 * A foreign slot's host, registered once per collection. Its default cell is
 * the interactive one; a display-only slot passes its own cell as an override.
 */
const ensureForeignHost = (emit: Emit, collection: string): string => {
  const name = `slot_host__${collectionKey(collection)}`;

  if (emit.defs[name] === undefined) {
    const cell = ensureForeignCell(emit, collection, true);

    emit.defs[name] = {
      type: 'stack_panel',
      orientation: 'vertical',
      size: [18, 18],
      ...topLeft,
      collection_name: collection,
      [`${SLOT_VAR}|default`]: 0,
      [`${CELL_VAR}|default`]: cell,
      controls: [{ [`cell@${CELL_VAR}`]: { collection_index: SLOT_VAR } }],
    };
  }

  return `${emit.ns}.${name}`;
};

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

  emit(node, ctx) {
    if (node.source !== undefined) {
      // A foreign slot: its own host over its own collection, keyed by that
      // collection so two slots on the same one share it. The index is the
      // author's, not the allocation's, and the runtime never touches it.
      const host = ensureForeignHost(ctx, node.source.collection);

      return {
        [`${node.name}@${host}`]: {
          offset: offsetOf(node.rect),
          size: sizeOf(node.rect),
          ...layerOf(node),
          ...visibilityOf(node),
          [SLOT_VAR]: node.source.index,
          ...node.source.interactive
            ? {}
            : { [CELL_VAR]: ensureForeignCell(ctx, node.source.collection, false) },
        },
      };
    }

    return {
      [`${node.name}@${CELL.host}`]: {
        offset: offsetOf(node.rect),
        size: sizeOf(node.rect),
        ...layerOf(node),
        ...visibilityOf(node),
        [SLOT_VAR]: node.address,
        ...cellOf(node),
      },
    };
  },
};
