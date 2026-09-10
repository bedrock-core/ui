import { topLeft } from '../../faces';
import { collectionKey } from '../../nodes/utils/shared';
import { CELL, CELL_VAR, placed, SLOT_VAR } from './cell';
import type { Connector, Control, Emit } from '../types';

/**
 * The collections the PLAYER owns, as opposed to the screen's own container.
 *
 * A press auto-places the runtime's transport into the player's inventory and
 * the script pulls it back a tick later, so for that tick the transport is
 * genuinely sitting in one of these — whichever slot happened to be free. Any
 * cell drawing one of them therefore hides it.
 *
 * This is NOT an author's choice. The transport is the library's own
 * mechanism, and nobody writing a screen should have to know it exists to keep
 * a command block from flashing in their hotbar. `hideOwned` stays as the way
 * to ask for the same gate over some other collection.
 */
const PLAYER_COLLECTIONS: ReadonlySet<string> = new Set(['inventory_items', 'hotbar_items']);

/** Whether a cell over this collection must hide the runtime's transport. */
export const hidesTransport = (collection: string, hideOwned = false): boolean =>
  hideOwned || PLAYER_COLLECTIONS.has(collection);

/**
 * What a cell needs to draw the given collection: its item, and nothing that
 * reveals the runtime's transport.
 *
 * A display-only cell rides the inert button, which withholds focus — no take,
 * no place, no drop — since the engine's slot has no take-only or place-only
 * action to bake instead. `renderer`, when given, hides a transport item for a
 * player's own grids.
 */
export const containerItemVars = (collection: string, interactive: boolean, renderer?: string): Control => ({
  $item_collection_name: collection,
  ...renderer === undefined ? {} : { $item_renderer: renderer, $durability_bar_required: false },
  ...interactive ? {} : { $button_ref: CELL.displayStates },
});

/** A cell of the screen's OWN container, at the index the allocation gave it. */
export interface OwnSlot {
  name: string;
  address: number;
  /** Which cell definition to instantiate, when it is not the host's default. */
  cell?: string;
}

/** A cell over a collection the screen does not own, at the author's index. */
export interface ForeignSlot {
  name: string;
  collection: string;
  index: number;
  interactive: boolean;
}

/** A real container cell the player can reach. */
export const slot: Connector<OwnSlot> = (data, face) => ({
  [`${data.name}@${CELL.host}`]: {
    ...placed(face),
    [SLOT_VAR]: data.address,
    ...data.cell === undefined ? {} : { [CELL_VAR]: data.cell },
  },
});

/**
 * A cell over someone else's collection: its own host, keyed by that
 * collection so two slots on the same one share it. The index is the author's,
 * not the allocation's, and the runtime never touches it.
 */
export const foreignSlot: Connector<ForeignSlot> = (data, face, ctx) => ({
  [`${data.name}@${ensureForeignHost(ctx, data.collection)}`]: {
    ...placed(face),
    [SLOT_VAR]: data.index,
    ...data.interactive ? {} : { [CELL_VAR]: ensureForeignCell(ctx, data.collection, false) },
  },
});

/** A foreign slot's cell definition, registered once per collection and interactivity. */
export const ensureForeignCell = (ctx: Emit, collection: string, interactive: boolean): string => {
  const name = `${interactive ? 'slot' : 'display_slot'}__${collectionKey(collection)}`;

  ctx.defs[name] ??= {
    type: 'panel',
    size: [18, 18],
    controls: [{
      [`item@${CELL.item}`]: containerItemVars(
        collection,
        interactive,
        hidesTransport(collection) ? ctx.ownedRenderer : undefined,
      ),
    }],
  };

  return `${ctx.ns}.${name}`;
};

/**
 * A foreign slot's host, registered once per collection. Its default cell is
 * the interactive one; a display-only slot passes its own cell as an override.
 */
const ensureForeignHost = (ctx: Emit, collection: string): string => {
  const name = `slot_host__${collectionKey(collection)}`;

  if (ctx.defs[name] === undefined) {
    const cell = ensureForeignCell(ctx, collection, true);

    ctx.defs[name] = {
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

  return `${ctx.ns}.${name}`;
};
