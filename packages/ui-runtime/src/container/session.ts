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
import type { ContainerScreenConfig, ScreenHandle, SlotBehaviour } from './types';

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

const DEFAULT_MARKER = 'minecraft:netherite_pickaxe';

/** `typeId|amount|damage` — enough to notice any move, cheap enough to run every tick. */
const fingerprint = (container: Container, slot: number): string => {
  const item = container.getItem(slot);

  if (!item) {
    return '';
  }

  return `${item.typeId}|${item.amount}|${item.getComponent('minecraft:durability')?.damage ?? 0}`;
};

/**
 * `Object.entries` over one of the compiler's index records.
 *
 * TypeScript widens the value to `unknown` whenever the key is a generic
 * parameter. That is a limitation of the signature, not real uncertainty: these
 * records are generated, and every value in them is a container index. Narrowing
 * once here keeps the assertion out of the logic below.
 */
const indexEntries = (record: object): [string, number][] =>
  // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion
  Object.entries(record) as [string, number][];

const isPlayer = (entity: Entity | undefined): entity is Player =>
  entity !== undefined && entity.typeId === 'minecraft:player';

const containerOf = (entity: Entity): Container | undefined =>
  entity.getComponent(EntityComponentTypes.Inventory)?.container;

interface Session {
  entity: Entity;
  player: Player;
  expected: string[];
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
  const pollInterval = config.pollInterval ?? 1;
  const sessions = new Map<string, Session>();
  const unsubscribes: (() => void)[] = [];

  /** Slot index -> what the script asked that slot to do. */
  const behaviourAt = new Map<number, SlotBehaviour>();
  // Walk the handle rather than the config. The handle is the compiler's own
  // record of what exists, so a name the screen never declared cannot reach the
  // map — and the entries come back typed, with nothing to assert.
  const declared: Record<string, SlotBehaviour | undefined> = config.slots ?? {};

  for (const [name, slot] of indexEntries(handle.slots)) {
    const behaviour = declared[name];

    if (behaviour) {
      behaviourAt.set(slot, behaviour);
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

  const writeChannels = (container: Container, player: Player): void => {
    const values: Record<string, number | undefined> = config.channels?.(player) ?? {};

    for (const [name, slot] of indexEntries(handle.channels)) {
      container.setItem(slot, channelItem(values[name] ?? 0));
    }
  };

  const populate = (container: Container, player: Player): void => {
    container.clearAll();
    container.setItem(handle.screen.sentinelSlot, sentinel());

    for (const [slot, behaviour] of behaviourAt) {
      const item = behaviour.item?.(player);

      if (item) {
        container.setItem(slot, claim(item));
      }
    }

    writeChannels(container, player);
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

      if (behaviour?.item) {
        // Managed: the move IS the interaction. Put it back, take the copy away,
        // then run the handler.
        const replacement = behaviour.item(session.player);

        if (replacement) {
          container.setItem(slot, claim(replacement));
          reclaim(container, session.player, slot, replacement.typeId);
        }

        behaviour.onClick?.(session.player);

        for (let i = 0; i < handle.screen.drawn + 1; i += 1) {
          session.expected[i] = fingerprint(container, i);
        }

        continue;
      }

      // Free: a real input or output. Report what happened and leave it alone.
      const item = container.getItem(slot);

      if (item) {
        behaviour?.onInsert?.(session.player, item);
      } else {
        behaviour?.onRemove?.(session.player);
      }

      session.expected[slot] = now;
    }
  };

  const stop = (session: Session): void => {
    system.clearRun(session.runId);
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
        writeChannels(container, player);
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
          populate(container, player);
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
