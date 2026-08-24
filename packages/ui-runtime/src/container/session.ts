import {
  type Container,
  type Entity,
  EntityComponentTypes,
  ItemStack,
  type Player,
  system,
  world,
} from '@minecraft/server';
import { claim, isOwned, setOrdinal, setRatio, TRANSPORT_ORDINAL } from './marker';
import { encode, MAX_CODE } from './charset';
import { ScreenRender } from './render';
import { snapshot } from './debug';
import type { ContainerScreenConfig, ScreenHandle } from './types';

/**
 * Drives one compiled container screen.
 *
 * The layout is frozen in JSON UI; everything alive travels through the
 * container itself. Slot 0 carries the routing keys, the drawn slots carry what
 * the player sees and touches, and the bank behind them carries state the layout
 * reads but no cell ever draws.
 *
 * The screen's own component is re-rendered per player, so state, handlers and
 * text are all declared inline in the JSX and nothing has to be registered here.
 * The build ran the same component once to decide the shape; this runs it again
 * to decide the values, and because the shape is frozen the two walks line up
 * position for position.
 *
 * The single hard truth this is built around: **an item moving is the only
 * signal a container gives back**. There is no click event, no lock that makes a
 * slot read-only, and no way to veto a move. So a press is an item taken and put
 * straight back — invisible, because a button draws a button rather than an
 * item — and "read-only" is enforced a tick later rather than prevented.
 */

/**
 * Routing marker: unstackable on purpose, because its damage value carries the
 * layout key and a damageable item is the only thing that has one.
 */
const DEFAULT_MARKER = 'minecraft:netherite_pickaxe';

/**
 * Backs a text channel, and must be stackable for the obvious reason: a
 * character IS the stack size. Using the routing marker here pins every cell to
 * 1, and the engine publishes nothing for a single stack, so the text reads as
 * permanently empty with nothing in the log to say why.
 */
const DEFAULT_COUNT_ITEM = 'minecraft:paper';

/** `typeId|amount|damage` — enough to notice any move, cheap enough per tick. */
const fingerprint = (container: Container, slot: number): string => {
  const item = container.getItem(slot);

  if (!item) {
    return '';
  }

  return `${item.typeId}|${item.amount}|${item.getComponent('minecraft:durability')?.damage ?? 0}`;
};

const isPlayer = (entity: Entity | undefined): entity is Player =>
  entity !== undefined && entity.typeId === 'minecraft:player';

const containerOf = (entity: Entity): Container | undefined =>
  entity.getComponent(EntityComponentTypes.Inventory)?.container;

interface Session {
  entity: Entity;
  player: Player;
  render: ScreenRender;
  expected: string[];
  /**
   * What each drawn slot held last time it was looked at.
   *
   * A fingerprint says THAT a slot changed; enforcing a role needs to know
   * WHICH WAY — an input slot cares about items leaving, an output slot about
   * items arriving — and that is only answerable against the previous contents.
   */
  held: (ItemStack | undefined)[];
  /** Last value written to each bank slot, so an unchanged one costs nothing. */
  written: Map<number, number>;
  runId: number;
}

export interface ContainerScreen {
  /** Starts serving this screen for every entity of `typeId`. */
  attachToEntity: (typeId: string) => void;
  /** Stops serving and releases every open session. */
  detach: () => void;
}

/**
 * Serves a compiled screen.
 *
 * Takes the generated handle and nothing else: the component inside it carries
 * its own state, its own handlers and its own text, so there is no second place
 * to describe the screen and no way for the two to drift apart.
 */
export function createContainerScreen(
  handle: ScreenHandle,
  config: ContainerScreenConfig = {},
): ContainerScreen {
  const markerItem = config.markerItem ?? DEFAULT_MARKER;
  const countItem = config.countItem ?? DEFAULT_COUNT_ITEM;
  const pollInterval = config.pollInterval ?? 1;
  const debug = config.debug ?? false;
  const drawnSlots = handle.slots.map(spec => spec.slot);

  /** Says what just happened and where everything ended up. Off by default. */
  const trace = (label: string, container: Container, player: Player): void => {
    if (debug) {
      snapshot(label, container, player, {
        sentinel: handle.screen.sentinelSlot,
        drawn: drawnSlots,
        markerItem,
      });
    }
  };

  const sessions = new Map<string, Session>();
  const unsubscribes: (() => void)[] = [];
  const drawnRange = handle.screen.drawn + 1;

  /** The sentinel: its item id is the protocol key, its durability the layout key. */
  const sentinel = (): ItemStack => {
    const stack = new ItemStack(markerItem, 1);

    setOrdinal(stack, handle.screen.layoutId);
    stack.nameTag = ' ';

    return claim(stack);
  };

  /**
   * The transport item behind a button.
   *
   * Nothing draws it — the compiler replaces a button's item renderer with an
   * empty control and turns off the count and the bars — so it exists purely so
   * that taking it produces a transaction the script can see.
   *
   * Its durability is pinned to {@link TRANSPORT_ORDINAL}, which is what the
   * screen's own inventory and hotbar grids key on to draw a mid-flight copy as
   * nothing. The blank name covers the last visible surface: without it, the
   * tooltip on hover names the marker item out loud.
   */
  const transport = (): ItemStack => {
    const stack = new ItemStack(markerItem, 1);

    setOrdinal(stack, TRANSPORT_ORDINAL);
    stack.nameTag = ' ';

    return claim(stack);
  };

  const ratioItem = (ratio: number): ItemStack =>
    claim(setRatio(new ItemStack(markerItem, 1), ratio));

  /**
   * Writes one character cell.
   *
   * The cheap path, and the reason a string costs so little to update: the code
   * rides the stack size, which is a settable property, so it lands with ONE
   * native call and nothing allocated.
   */
  const writeCell = (container: Container, slot: number, code: number): void => {
    const amount = Math.max(1, Math.min(MAX_CODE, Math.round(code)));

    if (container.getItem(slot)?.typeId === countItem) {
      container.getSlot(slot).amount = amount;

      return;
    }

    container.setItem(slot, claim(new ItemStack(countItem, amount)));
  };

  /** Writes what the last render produced, skipping anything that did not move. */
  const writeChannels = (container: Container, session: Session): void => {
    const { texts, ratios } = session.render.values;
    let text = 0;
    let ratio = 0;

    for (const spec of handle.channels) {
      if (spec.carrier === 'ratio') {
        const value = ratios[ratio] ?? 0;

        ratio += 1;

        if (session.written.get(spec.slot) !== value) {
          session.written.set(spec.slot, value);
          container.setItem(spec.slot, ratioItem(value));
        }

        continue;
      }

      // Only the cells that actually changed. Shortening a string rewrites the
      // tail to blanks, which is the same cost as any other edit.
      const codes = encode(texts[text] ?? '', spec.length);

      text += 1;

      for (const [cell, code] of codes.entries()) {
        const slot = spec.slot + cell;

        if (session.written.get(slot) === code) {
          continue;
        }

        session.written.set(slot, code);
        writeCell(container, slot, code);
      }
    }
  };

  /**
   * Re-reads the drawn range after the runtime has changed it.
   *
   * Anything the runtime writes would otherwise look like a player move on the
   * next tick, and the slot would fight itself.
   */
  const resync = (container: Container, session: Session): void => {
    for (let slot = 0; slot < drawnRange; slot += 1) {
      session.expected[slot] = fingerprint(container, slot);
      session.held[slot] = container.getItem(slot);
    }
  };

  /**
   * Makes every button's slot agree with its handler.
   *
   * The transport item IS the enabled state: a slot with one presses, a slot
   * without one is inert, and the face reads the same fact to draw itself
   * disabled. So `onPress={ready ? fn : undefined}` works the way it reads —
   * this runs after every render, and puts the item in or takes it out as the
   * handler comes and goes. An unchanged button costs one read.
   *
   * The caller resyncs afterwards: a button slot is in the drawn range, and a
   * write here would otherwise look like a press on the next poll.
   */
  const writeButtons = (container: Container, session: Session): void => {
    for (const [index, spec] of handle.slots.entries()) {
      if (spec.role !== 'button') {
        continue;
      }

      const wanted = session.render.values.onPress[index] !== undefined;
      const item = container.getItem(spec.slot);
      const present = item !== undefined && item.typeId === markerItem && isOwned(item);

      if (wanted && !present) {
        container.setItem(spec.slot, transport());
      } else if (!wanted && present) {
        container.setItem(spec.slot, undefined);
      }
    }
  };

  const populate = (container: Container, session: Session): void => {
    session.written.clear();
    container.clearAll();
    container.setItem(handle.screen.sentinelSlot, sentinel());
    writeButtons(container, session);
    writeChannels(container, session);
    resync(container, session);
    trace('open', container, session.player);
  };

  /**
   * Takes back the copy the player is holding.
   *
   * Refilling a slot on its own DUPLICATES it — observed in game: the restored
   * item appeared while the original surfaced elsewhere a tick later. The cursor
   * turned out to be readable, so the reclaim can finish in the same tick, and
   * it is searched FIRST because a click is what leaves a copy in flight there.
   *
   * The container half comes last, skips every BUTTON, and stops at the DRAWN
   * range. None of those three is an optimisation:
   *
   *  - a button slot holds a transport item of exactly this type, put there
   *    deliberately, so finding one there deletes a working button rather than
   *    the copy — and the screen loses a button for every press;
   *  - everything in the bank is claimed too — the sentinel and every ratio
   *    channel are the marker item, every text cell is the count item — so a
   *    whole-container scan finds a channel before it finds the copy and
   *    deletes that instead. Deleting the sentinel takes the routing key with
   *    it, the router stops recognising the screen, and the player is looking
   *    at a plain chest full of pickaxes and paper.
   */
  const reclaim = (container: Container, player: Player, skip: number, typeId: string): void => {
    // In flight between slots, which is where a click puts it. Readable through
    // the cursor component, which is unused under touch controls — the
    // inventory pass below and the close sweep back that case up.
    const cursor = player.getComponent(EntityComponentTypes.CursorInventory);
    const held = cursor?.item;

    if (held && isOwned(held) && held.typeId === typeId) {
      cursor.clear();

      return;
    }

    const inventory = player.getComponent(EntityComponentTypes.Inventory)?.container;

    if (inventory) {
      for (let slot = 0; slot < inventory.size; slot += 1) {
        const item = inventory.getItem(slot);

        if (item && isOwned(item) && item.typeId === typeId) {
          inventory.setItem(slot, undefined);

          return;
        }
      }
    }

    for (const spec of handle.slots) {
      if (spec.slot === skip || spec.role === 'button') {
        continue;
      }

      const item = container.getItem(spec.slot);

      if (item && isOwned(item) && item.typeId === typeId) {
        container.setItem(spec.slot, undefined);

        return;
      }
    }
  };

  /** Anything of ours that got away, whatever route it took. */
  const sweep = (player: Player): void => {
    const inventory = player.getComponent(EntityComponentTypes.Inventory)?.container;

    if (!inventory) {
      return;
    }

    for (let slot = 0; slot < inventory.size; slot += 1) {
      const item = inventory.getItem(slot);

      if (item && isOwned(item)) {
        inventory.setItem(slot, undefined);
      }
    }

    player.getComponent(EntityComponentTypes.CursorInventory)?.clear();
  };

  /** Hands an item back, or drops it, rather than destroying what is theirs. */
  const give = (player: Player, stack: ItemStack): void => {
    const inventory = player.getComponent(EntityComponentTypes.Inventory)?.container;

    if (inventory && inventory.emptySlotsCount > 0) {
      inventory.addItem(stack);

      return;
    }

    player.dimension.spawnItem(stack, player.location);
  };

  /**
   * Takes the player's OWN item back off them, so a refused move is UNDONE
   * rather than copied.
   *
   * {@link reclaim} cannot do this job: it only ever removes something the
   * runtime marked, and an item sitting in an input slot was put there by the
   * player and carries no mark. Restoring the slot without this MINTS a second
   * one — a duplication bug rather than a cosmetic one.
   *
   * @returns whether the item was found. The caller must not restore the slot
   *   when it was not: a refusal that fails to undo beats a duplicate.
   */
  const retrieve = (player: Player, stack: ItemStack): boolean => {
    const cursor = player.getComponent(EntityComponentTypes.CursorInventory);
    const held = cursor?.item;

    // The cursor is all-or-nothing — `item` is read-only and `clear` is the only
    // write it has — so a cursor holding MORE than was taken is emptied and the
    // remainder handed straight back.
    if (held && held.typeId === stack.typeId && held.amount >= stack.amount) {
      const rest = held.amount - stack.amount;

      cursor.clear();

      if (rest > 0) {
        const change = held.clone();

        change.amount = rest;
        give(player, change);
      }

      return true;
    }

    const inventory = player.getComponent(EntityComponentTypes.Inventory)?.container;

    if (!inventory) {
      return false;
    }

    // The whole stack first, which is what a plain take leaves behind, then a
    // partial, which is what a shift-click that merged into an existing stack
    // leaves. The other order would eat a stack the player already had.
    for (const exact of [true, false]) {
      for (let slot = 0; slot < inventory.size; slot += 1) {
        const item = inventory.getItem(slot);

        if (item?.typeId !== stack.typeId) {
          continue;
        }

        if (exact && item.amount === stack.amount) {
          inventory.setItem(slot, undefined);

          return true;
        }

        if (!exact && item.amount > stack.amount) {
          inventory.getSlot(slot).amount = item.amount - stack.amount;

          return true;
        }
      }
    }

    return false;
  };

  const stop = (session: Session): void => {
    const container = containerOf(session.entity);

    if (debug && container?.isValid) {
      trace('close', container, session.player);
    }

    system.clearRun(session.runId);
    sessions.delete(session.entity.id);

    // A player who logged out mid-screen is gone before the close event, and
    // every component read on them throws. What they carried off is swept the
    // next time a screen of theirs closes.
    if (session.player.isValid) {
      sweep(session.player);
    }
  };

  const poll = (session: Session): void => {
    const container = containerOf(session.entity);

    // The player is checked as well as the container: a logout invalidates them
    // without touching the entity, and every handler below is handed that
    // player.
    if (!container?.isValid || !session.player.isValid) {
      stop(session);

      return;
    }

    // Only the drawn range. Scanning the whole container costs in proportion to
    // its size — 3.3 ms at 200 slots against 0.3 ms at 54 — and nothing outside
    // the drawn range has a cell the player could reach.
    for (const [index, spec] of handle.slots.entries()) {
      const { slot, role } = spec;

      if (fingerprint(container, slot) === session.expected[slot]) {
        continue;
      }

      const before = session.held[slot];
      const after = container.getItem(slot);
      const { onPress, onInsert, onRemove } = session.render.values;

      if (role === 'button') {
        // A press empties the slot, but a swap FILLS it: the player drops what
        // they were carrying where the transport was. Overwriting the slot
        // would destroy an item that is theirs, so it goes back first.
        if (after && !isOwned(after)) {
          give(session.player, after);
          container.setItem(slot, undefined);
        }

        // The move IS the press. Take the copy away, run whatever the
        // component attached, then let the buttons settle: the handler may
        // have disabled this one, or enabled another, and `writeButtons`
        // decides which slots hold a transport now — this one included.
        reclaim(container, session.player, slot, markerItem);
        onPress[index]?.(session.player);
        writeButtons(container, session);
        writeChannels(container, session);
        resync(container, session);
        trace(`press slot ${slot}`, container, session.player);

        continue;
      }

      // A role is undone, never prevented: nothing in the container API can veto
      // a move, so the only enforcement available is to put things back a tick
      // later. `input` refuses removals, `output` refuses insertions.
      if (role === 'input' && before !== undefined && after === undefined) {
        // Off the player BEFORE it goes back in the slot. The item is theirs
        // and carries no mark, so writing the slot first and hunting the copy
        // afterwards — which is what `reclaim` does — finds nothing and leaves
        // them holding a duplicate.
        const undone = retrieve(session.player, before);

        if (undone) {
          container.setItem(slot, before);
        }

        resync(container, session);
        trace(
          `input slot ${slot} — take ${undone ? 'refused' : 'refused, NOT undone'}`,
          container,
          session.player,
        );

        continue;
      }

      if (role === 'output' && before === undefined && after !== undefined) {
        // Straight back to the player rather than deleted: it is their item.
        give(session.player, after);
        container.setItem(slot, undefined);
        resync(container, session);
        trace(`output slot ${slot} — insert refused`, container, session.player);

        continue;
      }

      if (after) {
        onInsert[index]?.(session.player, after);
      } else {
        onRemove[index]?.(session.player);
      }

      writeChannels(container, session);
      session.expected[slot] = fingerprint(container, slot);
      session.held[slot] = container.getItem(slot);
      trace(`${after ? 'insert' : 'remove'} slot ${slot}`, container, session.player);
    }
  };

  /**
   * Starts serving one entity for one player.
   *
   * Returns the existing session if there already is one, so it is safe to call
   * from both the interact and the open event — which it has to be: the screen
   * must be POPULATED before the container opens, or the router finds no
   * routing key and the player gets a plain chest.
   */
  const begin = (entity: Entity, player: Player): Session | undefined => {
    const existing = sessions.get(entity.id);

    if (existing) {
      return existing;
    }

    const container = containerOf(entity);

    if (!container?.isValid) {
      return undefined;
    }

    // A state change re-renders the component; this is what turns the result
    // into slots. Nothing else in the runtime knows a screen has state at all.
    // The callback is declared before the session so it can close over it, and
    // only ever runs once the session exists.
    // eslint-disable-next-line prefer-const
    let session: Session | undefined;

    const render = new ScreenRender(handle.Screen, player, () => {
      const live = session && containerOf(session.entity);

      if (session && live?.isValid) {
        // Buttons before channels, and a resync after: a handler that came or
        // went moves an item in the drawn range, which the next poll would
        // otherwise read as a press.
        writeButtons(live, session);
        writeChannels(live, session);
        resync(live, session);
      }
    });

    session = {
      entity,
      player,
      render,
      expected: [],
      held: [],
      written: new Map(),
      runId: 0,
    };

    render.render();

    const open = session;

    open.runId = system.runInterval(() => poll(open), pollInterval);
    sessions.set(entity.id, open);
    populate(container, open);

    return open;
  };

  const attachToEntity = (typeId: string): void => {
    if (debug) {
      console.warn(`[bcui] serving ${typeId} (${handle.screen.inventorySize} slots)`);
    }

    // Population happens HERE, not on open: the screen has to carry its routing
    // key before the container appears, or the router does not recognise it and
    // vanilla renders instead. A before event cannot touch the world, so the
    // write is deferred by a tick — which still lands ahead of the open.
    const onInteract = world.beforeEvents.playerInteractWithEntity.subscribe((event) => {
      if (event.target.typeId !== typeId) {
        return;
      }

      const { target, player } = event;

      system.run(() => {
        begin(target, player);
      });
    });

    // A backstop, for anything that opens a container without an interact.
    const onOpen = world.afterEvents.entityContainerOpened.subscribe((event) => {
      const player = event.openSource.entity;

      if (event.entity.typeId === typeId && isPlayer(player)) {
        begin(event.entity, player);
      }
    });

    const onClose = world.afterEvents.entityContainerClosed.subscribe((event) => {
      const session = sessions.get(event.entity.id);

      if (session) {
        stop(session);
      }
    });

    // A player who logs out inside the one-tick window between a press and its
    // reclaim carries the transport off with them, and by the time the close
    // event fires they are gone and unreadable. The inventory is readable again
    // the moment they are back, so that is when it is swept. The mark on the
    // item is what makes this possible without remembering who held what.
    const onJoin = world.afterEvents.playerSpawn.subscribe((event) => {
      if (event.initialSpawn) {
        sweep(event.player);
      }
    });

    unsubscribes.push(
      () => world.beforeEvents.playerInteractWithEntity.unsubscribe(onInteract),
      () => world.afterEvents.entityContainerOpened.unsubscribe(onOpen),
      () => world.afterEvents.entityContainerClosed.unsubscribe(onClose),
      () => world.afterEvents.playerSpawn.unsubscribe(onJoin),
    );
  };

  const detach = (): void => {
    for (const unsubscribe of unsubscribes) {
      unsubscribe();
    }

    unsubscribes.length = 0;

    for (const session of [...sessions.values()]) {
      stop(session);
    }
  };

  return { attachToEntity, detach };
}
