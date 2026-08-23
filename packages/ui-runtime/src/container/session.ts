import {
  type Container,
  type Entity,
  EntityComponentTypes,
  ItemStack,
  type Player,
  system,
  world,
} from '@minecraft/server';
import { claim, isOwned, setOrdinal, setRatio } from './marker';
import { encode, MAX_CODE } from './charset';
import type {
  ChannelSpec, ContainerScreenConfig, ScreenHandle, SlotBehaviour, SlotRole, SlotSpec,
} from './types';

/**
 * Drives one compiled container screen.
 *
 * The layout is frozen in JSON UI; everything alive travels through the
 * container itself. Slot 0 carries the routing keys, the drawn slots carry what
 * the player sees and touches, and the bank behind them carries state the layout
 * reads but no cell ever draws.
 *
 * The single hard truth this is built around: **an item moving is the only
 * signal a container gives back**. There is no click event, no lock that makes a
 * slot read-only, and no way to veto a move. So a button is an item the player
 * takes and the runtime puts back, and "read-only" is something enforced a tick
 * later rather than prevented.
 */

/**
 * Routing marker: unstackable on purpose, because its damage value carries the
 * layout key and a damageable item is the only thing that has one.
 */
const DEFAULT_MARKER = 'minecraft:netherite_pickaxe';

/**
 * Backs a `count` channel, and must be stackable for the obvious reason: the
 * value IS the stack size. Using the routing marker here pins every count
 * channel to 1, and the engine publishes nothing for a single stack, so the
 * channel reads as permanently empty with nothing in the log to say why.
 */
const DEFAULT_COUNT_ITEM = 'minecraft:paper';

/** `typeId|amount|damage` — enough to notice any move, cheap enough to run every tick. */
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
  expected: string[];
  /**
   * What each drawn slot held last time it was looked at.
   *
   * A fingerprint says THAT a slot changed; enforcing a role needs to know
   * WHICH WAY — an input slot cares about items leaving, an output slot about
   * items arriving — and that is only answerable against the previous contents.
   */
  held: (ItemStack | undefined)[];
  runId: number;
  ticks: number;
}

export interface ContainerScreen {
  /** Starts serving this screen for every entity of `typeId`. */
  attachToEntity: (typeId: string) => void;
  /** Re-reads the channels and writes any that moved. Cheap when nothing changed. */
  refresh: (player: Player) => void;
  /** Stops serving and releases every open session. */
  detach: () => void;
}

export function createContainerScreen<SlotName extends string, ChannelName extends string>(
  handle: ScreenHandle<SlotName, ChannelName>,
  config: ContainerScreenConfig<SlotName, ChannelName> = {},
): ContainerScreen {
  const markerItem = config.markerItem ?? DEFAULT_MARKER;
  const countItem = config.countItem ?? DEFAULT_COUNT_ITEM;
  const pollInterval = config.pollInterval ?? 1;
  const sessions = new Map<string, Session>();
  const unsubscribes: (() => void)[] = [];

  /** Slot index -> what the script asked that slot to do. */
  const behaviourAt = new Map<number, SlotBehaviour>();

  /** Slot index -> what the screen says the player may do with it. */
  const roleAt = new Map<number, SlotRole>();
  // Walk the handle rather than the config. The handle is the compiler's own
  // record of what exists, so a name the screen never declared cannot reach the
  // map — and the entries come back typed, with nothing to assert.
  const declared: Record<string, SlotBehaviour | undefined> = config.slots ?? {};

  const slotSpecs: Record<string, SlotSpec> = handle.slots;

  for (const [name, spec] of Object.entries(slotSpecs)) {
    const behaviour = declared[name];

    roleAt.set(spec.slot, spec.role);

    if (behaviour) {
      behaviourAt.set(spec.slot, behaviour);
    }
  }

  /** The sentinel: its item id is the protocol key, its durability the layout key. */
  const sentinel = (): ItemStack => {
    const stack = new ItemStack(markerItem, 1);

    setOrdinal(stack, handle.screen.layoutId);
    stack.nameTag = ' ';

    return claim(stack);
  };

  const channelItem = (ratio: number): ItemStack =>
    claim(setRatio(new ItemStack(markerItem, 1), ratio));

  /** Last value written per slot, per open container. */
  const written = new Map<string, Map<number, number>>();

  /**
   * Writes one character cell.
   *
   * This is the cheap path, and the reason a string costs so little to update:
   * the code rides the stack size, which is a settable property, so it lands
   * with ONE native call and nothing allocated. Rebuilding the stack is what
   * the old cost measurement was actually measuring.
   */
  const writeCell = (container: Container, slot: number, code: number): void => {
    const amount = Math.max(1, Math.min(MAX_CODE, Math.round(code)));

    if (container.getItem(slot)?.typeId === countItem) {
      container.getSlot(slot).amount = amount;

      return;
    }

    container.setItem(slot, claim(new ItemStack(countItem, amount)));
  };

  // Widened once, so the loop below reads a spec rather than an assertion.
  const specs: Record<string, ChannelSpec> = handle.channels;

  const writeChannels = (container: Container, player: Player, entityId: string): void => {
    const values: Record<string, number | string | undefined> = config.channels?.(player) ?? {};
    let seen = written.get(entityId);

    if (!seen) {
      seen = new Map();
      written.set(entityId, seen);
    }

    for (const [name, spec] of Object.entries(specs)) {
      const value = values[name];

      if (spec.carrier === 'ratio') {
        const ratio = typeof value === 'number' ? value : 0;

        // A channel that did not move is skipped rather than rewritten.
        if (seen.get(spec.slot) !== ratio) {
          seen.set(spec.slot, ratio);
          container.setItem(spec.slot, channelItem(ratio));
        }

        continue;
      }

      // Only the cells that actually changed. Shortening a string rewrites the
      // tail to spaces, which is the same cost as any other edit.
      const codes = encode(typeof value === 'string' ? value : '', spec.length);

      for (const [cell, code] of codes.entries()) {
        const slot = spec.slot + cell;

        if (seen.get(slot) === code) {
          continue;
        }

        seen.set(slot, code);
        writeCell(container, slot, code);
      }
    }
  };

  const populate = (container: Container, player: Player, entityId: string): void => {
    // A fresh open starts from nothing on screen, so nothing may be assumed
    // already written either.
    written.delete(entityId);
    container.clearAll();
    container.setItem(handle.screen.sentinelSlot, sentinel());

    for (const [slot, behaviour] of behaviourAt) {
      const item = behaviour.item?.(player);

      if (item) {
        container.setItem(slot, claim(item));
      }
    }

    writeChannels(container, player, entityId);
  };

  /**
   * Takes back the copy the player is holding.
   *
   * Refilling a slot on its own DUPLICATES it — observed in game: the restored
   * item appeared while the original surfaced elsewhere a tick later. The cursor
   * turned out to be readable, so the reclaim can finish in the same tick.
   */
  const reclaim = (container: Container, player: Player, skip: number, typeId: string): void => {
    for (let slot = 0; slot < container.size; slot += 1) {
      const item = container.getItem(slot);

      if (slot !== skip && item && isOwned(item) && item.typeId === typeId) {
        container.setItem(slot, undefined);

        return;
      }
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

    // In flight between slots. Readable through the cursor component, which is
    // unused under touch controls — the close sweep backs that case up.
    const cursor = player.getComponent(EntityComponentTypes.CursorInventory);
    const held = cursor?.item;

    if (held && isOwned(held) && held.typeId === typeId) {
      cursor.clear();
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

  /**
   * Re-reads the drawn range after the runtime has changed it.
   *
   * Anything the runtime writes would otherwise look like a player move on the
   * next tick, and the slot would fight itself.
   */
  const resync = (container: Container, session: Session): void => {
    for (let slot = 0; slot < handle.screen.drawn + 1; slot += 1) {
      session.expected[slot] = fingerprint(container, slot);
      session.held[slot] = container.getItem(slot);
    }
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

  const poll = (session: Session): void => {
    const container = containerOf(session.entity);

    if (!container?.isValid) {
      stop(session);

      return;
    }

    session.ticks += 1;

    // Only the drawn range. Scanning the whole container costs in proportion to
    // its size — 3.3 ms at 200 slots against 0.3 ms at 54 — and nothing outside
    // the drawn range has a cell the player could reach.
    for (let slot = 0; slot < handle.screen.drawn + 1; slot += 1) {
      const now = fingerprint(container, slot);

      if (now === session.expected[slot]) {
        continue;
      }

      const behaviour = behaviourAt.get(slot);
      const role = roleAt.get(slot) ?? 'both';
      const before = session.held[slot];
      const after = container.getItem(slot);

      if (role === 'button' || behaviour?.item) {
        // A button: the move IS the press. Put the item back, take the copy
        // away, then run the handler.
        const replacement = behaviour?.item?.(session.player);

        if (replacement) {
          container.setItem(slot, claim(replacement));
          reclaim(container, session.player, slot, replacement.typeId);
        }

        behaviour?.onClick?.(session.player);
        resync(container, session);

        continue;
      }

      // A role is undone, never prevented: nothing in the container API can
      // veto a move, so the only enforcement available is to put things back a
      // tick later. `input` refuses removals, `output` refuses insertions.
      const removed = before !== undefined && after === undefined;
      const inserted = before === undefined && after !== undefined;

      if (role === 'input' && removed) {
        container.setItem(slot, before);
        reclaim(container, session.player, slot, before.typeId);
        resync(container, session);

        continue;
      }

      if (role === 'output' && inserted) {
        // Straight back to the player rather than deleted: it is their item.
        give(session.player, after);
        container.setItem(slot, undefined);
        resync(container, session);

        continue;
      }

      if (after) {
        behaviour?.onInsert?.(session.player, after);
      } else {
        behaviour?.onRemove?.(session.player);
      }

      session.held[slot] = after;
      session.expected[slot] = now;
    }
  };

  const stop = (session: Session): void => {
    system.clearRun(session.runId);
    written.delete(session.entity.id);
    sessions.delete(session.entity.id);
    sweep(session.player);
  };

  const refresh = (player: Player): void => {
    for (const session of sessions.values()) {
      if (session.player.id !== player.id) {
        continue;
      }

      const container = containerOf(session.entity);

      if (container?.isValid) {
        writeChannels(container, player, session.entity.id);
      }
    }
  };

  const attachToEntity = (typeId: string): void => {
    const onInteract = world.beforeEvents.playerInteractWithEntity.subscribe((event) => {
      if (event.target.typeId !== typeId) {
        return;
      }

      const { target, player } = event;

      // The screen must be populated before the container opens, and a before
      // event cannot touch the world — so the write is deferred by a tick, which
      // still lands ahead of the open.
      system.run(() => {
        const container = containerOf(target);

        if (container?.isValid) {
          populate(container, player, target.id);
        }
      });
    });

    const onOpen = world.afterEvents.entityContainerOpened.subscribe((event) => {
      const player = event.openSource.entity;

      if (event.entity.typeId !== typeId || !isPlayer(player)) {
        return;
      }

      const container = containerOf(event.entity);

      if (!container) {
        return;
      }

      const session: Session = {
        entity: event.entity,
        player,
        expected: Array.from({ length: container.size }, (_, slot) => fingerprint(container, slot)),
        held: Array.from({ length: container.size }, (_, slot) => container.getItem(slot)),
        runId: 0,
        ticks: 0,
      };

      session.runId = system.runInterval(() => {
        poll(session);
      }, pollInterval);

      sessions.set(event.entity.id, session);
    });

    const onClose = world.afterEvents.entityContainerClosed.subscribe((event) => {
      const session = sessions.get(event.entity.id);

      if (session) {
        stop(session);
      }
    });

    unsubscribes.push(
      () => { world.beforeEvents.playerInteractWithEntity.unsubscribe(onInteract); },
      () => { world.afterEvents.entityContainerOpened.unsubscribe(onOpen); },
      () => { world.afterEvents.entityContainerClosed.unsubscribe(onClose); },
    );
  };

  const detach = (): void => {
    for (const session of [...sessions.values()]) {
      stop(session);
    }

    for (const off of unsubscribes.splice(0)) {
      off();
    }
  };

  return { attachToEntity, refresh, detach };
}
