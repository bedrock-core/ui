import {
  type Container, type Entity, EntityComponentTypes, ItemComponentTypes, type ItemStack, type Player,
} from '@minecraft/server';
import type { SlotEntry } from './allocate';
import { guard, isGuard, isOwned, isTransport, type ItemContainer } from './items';

/**
 * Watching the drawn range, and undoing what a role forbids.
 *
 * An item moving is the only signal a container gives back: no click event, no
 * lock that makes a slot read-only, no way to veto a move. So the runtime
 * remembers what every drawn slot held, notices what changed, and decides what
 * the change meant — a press when a transport went, a refusal when a role said
 * no, an insert or a removal otherwise. Nothing is prevented; a forbidden move
 * is put back a tick later.
 *
 * Several players can have the same entity open. The container does not say
 * who moved what, so the acting player is whoever is found holding the moved
 * item, and the first viewer when nobody is.
 */

/** `typeId|amount|damage` — enough to notice any move, cheap enough per tick. */
export const fingerprint = (container: ItemContainer, slot: number): string => {
  const item = container.getItem(slot);

  if (!item) {
    return '';
  }

  return `${item.typeId}|${item.amount}|${item.getComponent(ItemComponentTypes.Durability)?.damage ?? 0}`;
};

/**
 * What each drawn slot held last time it was looked at, by container index.
 *
 * A fingerprint says THAT a slot changed; enforcing a role needs to know WHICH
 * WAY — an input slot cares about items leaving, an output slot about items
 * arriving — and that is only answerable against the previous contents.
 */
export interface Watch {
  expected: string[];
  held: (ItemStack | undefined)[];
}

export const createWatch = (): Watch => ({ expected: [], held: [] });

/**
 * Re-reads drawn slots after the runtime, or a player, changed them.
 *
 * Anything the runtime writes would otherwise look like a player move on the
 * next tick, and the slot would fight itself.
 */
export const resync = (container: ItemContainer, watch: Watch, slots: readonly number[]): void => {
  for (const slot of slots) {
    watch.expected[slot] = fingerprint(container, slot);
    watch.held[slot] = container.getItem(slot);
  }
};

type PressHandler = (player: Player, host: Entity) => void;
type InsertHandler = (player: Player, stack: ItemStack, host: Entity) => void;
type RemoveHandler = (player: Player, stack: ItemStack, host: Entity) => void;

const isPressHandler = (value: unknown): value is PressHandler => typeof value === 'function';
const isInsertHandler = (value: unknown): value is InsertHandler => typeof value === 'function';
const isRemoveHandler = (value: unknown): value is RemoveHandler => typeof value === 'function';

const cursorOf = (player: Player): { item?: ItemStack; clear(): void } | undefined =>
  player.getComponent(EntityComponentTypes.CursorInventory);

const inventoryOf = (player: Player): Container | undefined =>
  player.getComponent(EntityComponentTypes.Inventory)?.container;

const holds = (inventory: ItemContainer, typeId: string): boolean => {
  for (let slot = 0; slot < inventory.size; slot += 1) {
    if (inventory.getItem(slot)?.typeId === typeId) {
      return true;
    }
  }

  return false;
};

/**
 * Tries to put a stack back on a player's cursor, and says whether it stuck.
 *
 * The API types the cursor read-only — `item` is a getter and `clear()` the
 * only mutator — but `readonly` is a compile-time claim, so this writes
 * through the type as a probe and verifies by reading back. The caller falls
 * back to the inventory when the engine refuses, which the try/catch turns
 * into a plain `false` rather than a crash.
 */
const writeCursor = (player: Player, stack: ItemStack): boolean => {
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
 * The viewer most likely to have moved an item, when the move itself does not
 * say. A click leaves the cursor empty, so a viewer still carrying something
 * was less likely the one who just put something down.
 */
const guessActor = (viewers: readonly Player[]): Player => {
  if (viewers.length === 1) {
    return viewers[0];
  }

  return viewers.find(viewer => cursorOf(viewer)?.item === undefined) ?? viewers[0];
};

/** The viewer now holding an item of this type: on the cursor first, then anywhere on them. */
const holderOf = (viewers: readonly Player[], typeId: string): Player | undefined => {
  if (viewers.length === 1) {
    return viewers[0];
  }

  const onCursor = viewers.find(viewer => cursorOf(viewer)?.item?.typeId === typeId);

  if (onCursor) {
    return onCursor;
  }

  return viewers.find((viewer) => {
    const inventory = inventoryOf(viewer);

    return inventory !== undefined && holds(inventory, typeId);
  });
};

/**
 * Takes back the copy a player is holding.
 *
 * Refilling a slot on its own DUPLICATES it — observed in game: the restored
 * item appeared while the original surfaced elsewhere a tick later. The cursor
 * turned out to be readable, so the reclaim can finish in the same tick, and
 * it is searched FIRST because a click is what leaves a copy in flight there.
 * Every viewer's cursor is checked before any viewer's inventory, since the
 * cursor is where the copy is when the press was a click.
 *
 * The container half comes last, skips every BUTTON, and stops at the DRAWN
 * range. None of those three is an optimisation:
 *
 *  - a button slot holds a transport item of exactly this type, put there
 *    deliberately, so finding one there deletes a working button rather than
 *    the copy — and the screen loses a button for every press;
 *  - everything in the bank is claimed too — the sentinel is the protocol
 *    item, every channel cell is the count item — so a whole-container scan
 *    finds a channel before it finds the copy and deletes that instead. Deleting the sentinel takes the routing key with
 *    it, the router stops recognising the screen, and the player is looking
 *    at a plain chest full of pickaxes and paper.
 *
 * @returns the viewer the copy was found on, which is who pressed the button.
 *   Undefined when it was found in the container or not at all.
 */
export const reclaim = (
  container: ItemContainer,
  viewers: readonly Player[],
  slots: readonly SlotEntry[],
  skip: number,
): Player | undefined => {
  // In flight between slots, which is where a click puts it. Readable through
  // the cursor component, which is unused under touch controls — the
  // inventory pass below and the close sweep back that case up.
  for (const viewer of viewers) {
    const cursor = cursorOf(viewer);
    const held = cursor?.item;

    if (cursor && held && isTransport(held)) {
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

      if (item && isTransport(item)) {
        inventory.setItem(slot, undefined);

        return viewer;
      }
    }
  }

  for (const entry of slots) {
    if (entry.slot === skip || entry.role === 'button') {
      continue;
    }

    const item = container.getItem(entry.slot);

    if (item && isTransport(item)) {
      container.setItem(entry.slot, undefined);

      return undefined;
    }
  }

  return undefined;
};

/**
 * Pulls an output placeholder back off whoever is holding it — cursor first,
 * then inventory — so no one walks away with the invisible marker after a take
 * or a swap left it on them.
 */
const reclaimGuard = (viewers: readonly Player[]): void => {
  for (const viewer of viewers) {
    const cursor = cursorOf(viewer);

    if (cursor?.item && isGuard(cursor.item)) {
      cursor.clear();

      return;
    }
  }

  for (const viewer of viewers) {
    const inventory = inventoryOf(viewer);

    if (!inventory) {
      continue;
    }

    for (let slot = 0; slot < inventory.size; slot += 1) {
      const item = inventory.getItem(slot);

      if (item && isGuard(item)) {
        inventory.setItem(slot, undefined);

        return;
      }
    }
  }
};

/** Anything of ours that got away, whatever route it took. */
export const sweep = (player: Player): void => {
  const inventory = inventoryOf(player);

  if (inventory) {
    for (let slot = 0; slot < inventory.size; slot += 1) {
      const item = inventory.getItem(slot);

      if (item && isOwned(item)) {
        inventory.setItem(slot, undefined);
      }
    }
  }

  cursorOf(player)?.clear();
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
 * {@link reclaim} cannot do this job: it only ever removes something the
 * runtime marked, and an item sitting in an input slot was put there by the
 * player and carries no mark. Restoring the slot without this MINTS a second
 * one — a duplication bug rather than a cosmetic one.
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

/** What one poll runs against: a session, seen from the drawn range. */
export interface PollHost {
  readonly container: ItemContainer;
  /** The entity that owns the screen, handed to slot handlers as their host. */
  readonly entity: Entity;
  /** Everyone with the screen open. Never empty while a poll runs. */
  readonly viewers: readonly Player[];
  readonly watch: Watch;
  /**
   * The drawn cells of the latest render. Read again after every handler,
   * because a handler re-renders and the entries it left behind are stale.
   */
  readonly slots: readonly SlotEntry[];
  /**
   * Runs a handler, then settles the container: buttons come and go with the
   * state the handler changed, channels take their new values, the button
   * slots are re-read, and the state is written to the entity.
   */
  handle(run: () => void): void;
  /** Says what just happened and where everything ended up, when debugging. */
  trace(label: string): void;
}

/**
 * A moved transport. The move IS the press: the copy is taken away, whatever
 * the component attached is run for the viewer it was found on, and the
 * buttons settle afterwards — the handler may have disabled this one or
 * enabled another, and the render decides which slots hold a transport now,
 * this one included.
 */
const press = (host: PollHost, entry: SlotEntry, after: ItemStack | undefined): void => {
  const { container, viewers } = host;
  const { slot, element } = entry;
  const actor = reclaim(container, viewers, host.slots, slot) ?? viewers[0];

  // A press empties the slot, but a swap FILLS it: the player drops what they
  // were carrying where the transport was. Overwriting the slot would destroy
  // an item that is theirs, so it goes back first.
  if (after && !isOwned(after)) {
    give(actor, after);
    container.setItem(slot, undefined);
  }

  const { onPress } = element.props;

  host.handle(() => {
    if (isPressHandler(onPress)) {
      onPress(actor, host.entity);
    }
  });
  host.trace(`press slot ${slot}`);
};

/**
 * An item left an input slot. Off the player BEFORE it goes back in the slot:
 * the item is theirs and carries no mark, so writing the slot first and
 * hunting the copy afterwards — which is what {@link reclaim} does — finds
 * nothing and leaves them holding a duplicate.
 */
const refuseTake = (host: PollHost, slot: number, before: ItemStack): void => {
  const undone = retrieve(host.viewers, before) !== undefined;

  if (undone) {
    host.container.setItem(slot, before);
  }

  resync(host.container, host.watch, [slot]);
  host.trace(`input slot ${slot} — take ${undone ? 'refused' : 'refused, NOT undone'}`);
};

/**
 * A different item was swapped over an input slot's contents: the original was
 * taken onto the cursor while the player's item took its place. An input slot
 * keeps what it was given, so the player's item goes back to them, the original
 * is pulled off the cursor, and the slot is restored — or cleared, if the
 * original could not be found, rather than duplicated.
 */
const refuseSwap = (host: PollHost, slot: number, before: ItemStack, after: ItemStack): void => {
  give(guessActor(host.viewers), after);

  const undone = retrieve(host.viewers, before) !== undefined;

  host.container.setItem(slot, undone ? before : undefined);
  resync(host.container, host.watch, [slot]);
  host.trace(`input slot ${slot} — swap ${undone ? 'refused' : 'refused, original lost'}`);
};

/**
 * What changed in an output slot, which always holds the guard when it has no
 * result. A shift-click can never land here — the slot is never empty — and a
 * guarded slot has no cell to click either, so what reaches this is one of:
 * the screen's own machinery writing a result over the guard, a take of a
 * result, or a swap over a result that tries to place. A placed item goes
 * back to the player; a taken result is theirs and is reported; the guard is
 * reclaimed if it left, and restored whenever no result stands.
 */
const handleOutput = (
  host: PollHost,
  entry: SlotEntry,
  before: ItemStack | undefined,
  after: ItemStack | undefined,
): void => {
  const { slot, element } = entry;
  const { onRemove } = element.props;

  // A result written over the guard is the machine's: no player can reach a
  // guarded slot — its cell has no button while the guard sits there — so the
  // write stands, and the screen that made it needs no event about it.
  if ((before === undefined || isGuard(before)) && after !== undefined && !isGuard(after)) {
    resync(host.container, host.watch, [slot]);
    host.trace(`output slot ${slot} — result written`);

    return;
  }

  // A real result the player took (the guard is not one). A swap takes it
  // onto the cursor while placing the player's item; a plain take empties the slot.
  const taken = before !== undefined && !isGuard(before) ? before : undefined;

  // A swap over a result is REVERSED, not accepted as a take: the result comes
  // back off the cursor and stands in the slot again, and the player's placed
  // item returns to them — onto the cursor when the engine lets the probe
  // write it, into their inventory otherwise. Only a result that could not be
  // found on any viewer stays taken, rather than being restored into a
  // duplicate.
  if (taken !== undefined && after !== undefined && !isGuard(after)) {
    const holder = retrieve(host.viewers, taken);

    if (holder !== undefined) {
      if (!writeCursor(holder, after)) {
        give(holder, after);
      }

      host.container.setItem(slot, taken);
      resync(host.container, host.watch, [slot]);
      host.trace(`output slot ${slot} — swap reversed`);

      return;
    }

    give(guessActor(host.viewers), after);
  }

  // Whatever left the guard onto a player is pulled back, so no one walks
  // off holding the invisible marker.
  reclaimGuard(host.viewers);

  host.container.setItem(slot, guard());
  resync(host.container, host.watch, [slot]);

  if (taken !== undefined) {
    const actor = holderOf(host.viewers, taken.typeId) ?? guessActor(host.viewers);

    host.handle(() => {
      if (isRemoveHandler(onRemove)) {
        onRemove(actor, taken, host.entity);
      }
    });
  }

  host.trace(`output slot ${slot} — ${taken ? 'take' : 'insert refused'}`);
};

/** A move a role allows: the component hears about it, then the slot is re-read. */
const move = (host: PollHost, entry: SlotEntry, before: ItemStack | undefined, after: ItemStack | undefined): void => {
  const { slot, element } = entry;
  const { onInsert, onRemove } = element.props;
  const actor = after || !before
    ? guessActor(host.viewers)
    : holderOf(host.viewers, before.typeId) ?? guessActor(host.viewers);

  host.handle(() => {
    if (after) {
      if (isInsertHandler(onInsert)) {
        onInsert(actor, after, host.entity);
      }
    } else if (before && isRemoveHandler(onRemove)) {
      onRemove(actor, before, host.entity);
    }
  });

  // After the handler, which may have taken the item: what it left is what
  // the slot is expected to hold.
  resync(host.container, host.watch, [slot]);
  host.trace(`${after ? 'insert' : 'remove'} slot ${slot}`);
};

/**
 * A disabled button's slot was disturbed: it holds the invisible placeholder,
 * not a transport, so this is never a press. Any item the player dropped there
 * goes back, the placeholder is pulled off whoever took it, and the slot is
 * refilled — so a disabled button stays inert and never fires.
 */
const settleButton = (host: PollHost, entry: SlotEntry, after: ItemStack | undefined): void => {
  const { slot } = entry;

  if (after !== undefined && !isOwned(after)) {
    give(guessActor(host.viewers), after);
  }

  reclaimGuard(host.viewers);
  host.container.setItem(slot, guard());
  resync(host.container, host.watch, [slot]);
  host.trace(`button slot ${slot} — disabled, held`);
};

/**
 * One tick over the drawn range.
 *
 * Only the drawn range. Scanning the whole container costs in proportion to
 * its size — 3.3 ms at 200 slots against 0.3 ms at 54 — and nothing outside
 * the drawn range has a cell the player could reach.
 *
 * A role is undone, never prevented: nothing in the container API can veto a
 * move, so the only enforcement available is to put things back a tick later.
 * `input` refuses removals, `output` refuses insertions. A locked slot never
 * changes, because the engine refuses every route into its inert cell.
 */
export const poll = (host: PollHost): void => {
  const { container, watch } = host;
  const count = host.slots.length;

  if (host.viewers.length === 0) {
    return;
  }

  // By index rather than over the entries: a handler re-renders, and the
  // drawn cells of the render it produced carry the handlers that apply from
  // then on. The shape is frozen, so the nth cell is the nth cell throughout.
  for (let index = 0; index < count; index += 1) {
    const entry = host.slots[index];
    const { slot, role } = entry;

    if (fingerprint(container, slot) === watch.expected[slot]) {
      continue;
    }

    const before = watch.held[slot];
    const after = container.getItem(slot);

    if (role === 'button') {
      if (before !== undefined && isTransport(before)) {
        press(host, entry, after);
      } else {
        settleButton(host, entry, after);
      }
    } else if (role === 'input' && before !== undefined && after === undefined) {
      refuseTake(host, slot, before);
    } else if (role === 'input' && before !== undefined && after !== undefined && after.typeId !== before.typeId) {
      refuseSwap(host, slot, before, after);
    } else if (role === 'output') {
      handleOutput(host, entry, before, after);
    } else {
      move(host, entry, before, after);
    }
  }
};
