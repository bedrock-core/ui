import { type Container, EntityComponentTypes, type ItemStack, type Player } from '@minecraft/server';
import type { ProtocolItems } from './items';

/**
 * The player's half of a container transaction: what is on their cursor and
 * in their inventory, how the runtime tells which viewer moved an item, and
 * how it hands items back or takes its own back off them.
 */

export const cursorOf = (player: Player): { item?: ItemStack; clear(): void } | undefined =>
  player.getComponent(EntityComponentTypes.CursorInventory);

export const inventoryOf = (player: Player): Container | undefined =>
  player.getComponent(EntityComponentTypes.Inventory)?.container;

/**
 * What each viewer carried the last time the poll looked: item type → total
 * amount across the cursor and the inventory.
 *
 * Several players can have the same entity open, and the container does not
 * say who moved what. It does not need to: a move out of the screen lands on
 * the mover, and a move in came off them, so the viewer whose own side changed
 * the matching way is the actor. That needs the previous reading of every
 * viewer, which is what this keeps — items are never marked to be traced, so
 * they stack, merge and behave exactly as the player's own.
 */
export interface Ledger {
  readonly carried: Map<string, ReadonlyMap<string, number>>;
}

export const createLedger = (): Ledger => ({ carried: new Map() });

const tally = (into: Map<string, number>, item: ItemStack | undefined): void => {
  if (item) {
    into.set(item.typeId, (into.get(item.typeId) ?? 0) + item.amount);
  }
};

/** Everything a viewer carries right now, by type. */
export const carriedBy = (player: Player): ReadonlyMap<string, number> => {
  const totals = new Map<string, number>();
  const inventory = inventoryOf(player);

  if (inventory) {
    for (let slot = 0; slot < inventory.size; slot += 1) {
      tally(totals, inventory.getItem(slot));
    }
  }

  tally(totals, cursorOf(player)?.item);

  return totals;
};

/** Records what every viewer carries, as the baseline the next poll's moves are read against. */
export const remember = (ledger: Ledger, viewers: readonly Player[]): void => {
  for (const viewer of viewers) {
    ledger.carried.set(viewer.id, carriedBy(viewer));
  }
};

const delta = (ledger: Ledger, viewer: Player, typeId: string): number | undefined => {
  const last = ledger.carried.get(viewer.id);

  if (last === undefined) {
    return undefined;
  }

  return (carriedBy(viewer).get(typeId) ?? 0) - (last.get(typeId) ?? 0);
};

/**
 * The viewer who moved a slot from `before` to `after`.
 *
 * Whoever GAINED what left the slot, or LOST what entered it, since the last
 * reading. One viewer needs no reading at all. With several and no reading
 * that answers — a viewer who opened the screen this very tick, or a move the
 * engine completed on its own — the first viewer stands in, which is the
 * best the container offers.
 */
export const actorOf = (
  ledger: Ledger,
  viewers: readonly Player[],
  before: ItemStack | undefined,
  after: ItemStack | undefined,
): Player => {
  if (viewers.length === 1) {
    return viewers[0];
  }

  if (before !== undefined) {
    const gained = viewers.find(viewer => (delta(ledger, viewer, before.typeId) ?? 0) > 0);

    if (gained) {
      return gained;
    }
  }

  if (after !== undefined) {
    const lost = viewers.find(viewer => (delta(ledger, viewer, after.typeId) ?? 0) < 0);

    if (lost) {
      return lost;
    }
  }

  return viewers[0];
};

/** The viewers with `first` ahead of the rest, so a search starts with the actor. */
export const startingWith = (first: Player, viewers: readonly Player[]): Player[] =>
  [first, ...viewers.filter(viewer => viewer !== first)];

/**
 * Tries to put a stack back on a player's cursor, and says whether it stuck.
 *
 * The API types the cursor read-only — `item` is a getter and `clear()` the
 * only mutator — but `readonly` is a compile-time claim, so this writes
 * through the type as a probe and verifies by reading back. The caller falls
 * back to the inventory when the engine refuses, which the try/catch turns
 * into a plain `false` rather than a crash.
 *
 * It does nothing right now because you cannot write to the cursor. But in
 * case it sometimes becomes available.
 */
export const writeCursor = (player: Player, stack: ItemStack): boolean => {
  const cursor = cursorOf(player);

  if (!cursor) {
    return false;
  }

  try {
    (cursor as { item?: ItemStack }).item = stack;
  } catch {
    return false;
  }

  return cursor.item?.typeId === stack.typeId && cursor.item.amount === stack.amount;
};

/**
 * Pulls an output placeholder back off whoever is holding it — cursor first,
 * then inventory — so no one walks away with the invisible marker after a take
 * or a swap left it on them.
 *
 * @returns the viewer it came off, which is who moved it. Undefined when no
 *   viewer held one: the placeholder left the slot by the screen's own hand.
 */
export const reclaimGuard = (viewers: readonly Player[], items: ProtocolItems): Player | undefined => {
  for (const viewer of viewers) {
    const cursor = cursorOf(viewer);

    if (cursor?.item && items.isGuard(cursor.item)) {
      cursor.clear();

      return viewer;
    }
  }

  for (const viewer of viewers) {
    const inventory = inventoryOf(viewer);

    if (!inventory) {
      continue;
    }

    for (let slot = 0; slot < inventory.size; slot += 1) {
      const item = inventory.getItem(slot);

      if (item && items.isGuard(item)) {
        inventory.setItem(slot, undefined);

        return viewer;
      }
    }
  }

  return undefined;
};

/** Anything of ours that got away, whatever route it took. */
export const sweep = (player: Player, items: ProtocolItems): void => {
  const inventory = inventoryOf(player);

  if (inventory) {
    for (let slot = 0; slot < inventory.size; slot += 1) {
      const item = inventory.getItem(slot);

      if (item && items.isOwned(item)) {
        inventory.setItem(slot, undefined);
      }
    }
  }

  const cursor = cursorOf(player);

  if (cursor?.item && items.isOwned(cursor.item)) {
    cursor.clear();
  }
};

/** Hands an item back, or drops it, rather than destroying what is theirs. */
export const give = (player: Player, stack: ItemStack): void => {
  const inventory = inventoryOf(player);

  if (inventory && inventory.emptySlotsCount > 0) {
    inventory.addItem(stack);

    return;
  }

  player.dimension.spawnItem(stack, player.location);
};

/**
 * Takes a player's OWN item back off them, so a refused move is UNDONE rather
 * than copied.
 *
 * An item sitting in an input slot was put there by the player and is of no
 * type of ours, so nothing marks it as the one taken. Restoring the slot
 * without this MINTS a second one — a duplication bug rather than a cosmetic
 * one.
 *
 * Viewers are searched in the order given: the caller puts the actor first,
 * so the stack comes back off the one who took it.
 *
 * @returns the viewer it was taken from. The caller must not restore the slot
 *   when there is none: a refusal that fails to undo beats a duplicate.
 */
export const retrieve = (viewers: readonly Player[], stack: ItemStack): Player | undefined => {
  // The cursor is all-or-nothing — `item` is read-only and `clear` is the only
  // write it has — so a cursor holding MORE than was taken is emptied and the
  // remainder handed straight back.
  for (const viewer of viewers) {
    const cursor = cursorOf(viewer);
    const held = cursor?.item;

    if (cursor && held && held.typeId === stack.typeId && held.amount >= stack.amount) {
      const rest = held.amount - stack.amount;

      cursor.clear();

      if (rest > 0) {
        const change = held.clone();

        change.amount = rest;
        give(viewer, change);
      }

      return viewer;
    }
  }

  // The whole stack first, which is what a plain take leaves behind, then a
  // partial, which is what a shift-click that merged into an existing stack
  // leaves. The other order would eat a stack the player already had.
  for (const exact of [true, false]) {
    for (const viewer of viewers) {
      const inventory = inventoryOf(viewer);

      if (!inventory) {
        continue;
      }

      for (let slot = 0; slot < inventory.size; slot += 1) {
        const item = inventory.getItem(slot);

        if (item?.typeId !== stack.typeId) {
          continue;
        }

        if (exact && item.amount === stack.amount) {
          inventory.setItem(slot, undefined);

          return viewer;
        }

        if (!exact && item.amount > stack.amount) {
          inventory.getSlot(slot).amount = item.amount - stack.amount;

          return viewer;
        }
      }
    }
  }

  return undefined;
};
