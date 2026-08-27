import {
  type Container, type Entity, EntityComponentTypes, type Player, system, world,
} from '@minecraft/server';
import { containerEntity, containerHandlers, type ContainerHandlers } from '../components/Container';
import { entityOwner, type Owner } from '../core/fabric';
import {
  beginInteractiveTransaction, clearSession, endInteractiveTransaction, setBuildRunner, setSessionRoot,
} from '../core/render/session';
import { cleanupComponentTree } from '../core/render/tree';
import { containerRoot } from '../core/render/validateContainer';
import { ContainerScreenError } from '../core/types';
import type { FunctionComponent } from '../jsx';
import { allocate, type Allocation } from './allocate';
import { buildContainerTree } from './build';
import { writeChannels, type Written } from './channels';
import { LAYOUT_PROPERTY } from './contract';
import { isOwned } from './items';
import { snapshot } from './debug';
import {
  createLedger, createWatch, type Ledger, poll, resync, sweep, type Watch,
} from './poll';
import { validHost, validPlayer } from './cells/types';
import { buttonSlots, reconcile, writeButtons } from './reconcile';
import { hydrateState, persistState } from './store';

/**
 * Serving a compiled container screen.
 *
 * The build freezes the layout in JSON UI; everything alive travels through
 * the entity's container. Slot 0 carries the routing keys, the drawn slots
 * carry what the players see and touch, and the bank behind them carries the
 * values the layout reads but no cell ever draws.
 *
 * One session per entity, shared by everyone who has it open. The screen's
 * component renders with the entity as its owner, so its state belongs to the
 * entity and outlives every viewer: it is written to the entity after each
 * render and read back at the next open. Effects run exactly while someone is
 * looking, because the fibers exist exactly then.
 *
 * The single hard truth this is built around: **an item moving is the only
 * signal a container gives back**. There is no click event, no lock that
 * makes a slot read-only, and no way to veto a move. So a press is an item
 * taken and put straight back — invisible, because a button draws a button
 * rather than an item — and a role is enforced a tick later rather than
 * prevented.
 */

export interface ContainerScreenConfig {
  /** Ticks between polls of the drawn range. Defaults to 1. */
  pollInterval?: number;

  /**
   * Reports every action and where every item ended up, to the content log.
   *
   * A container bug is invisible from the outside — the only signal is an
   * item moving, and every wrong answer looks like a screen that stopped
   * responding. This says which of the three places an item can be it
   * actually went to.
   */
  debug?: boolean;
}

export interface ContainerScreen {
  /** The entity type the screen's `<Container>` names. */
  readonly entity: string;
  /** Stops serving and releases every open session. */
  detach(): void;
}

interface Session {
  readonly entity: Entity;
  readonly owner: Owner;
  /** Everyone with the screen open, by player id. */
  readonly viewers: Map<string, Player>;
  readonly watch: Watch;
  /** What every viewer carried at the last poll, so a move is traced to its mover. */
  readonly ledger: Ledger;
  readonly written: Written;
  /** The latest render's cells and channels. Replaced by every render. */
  allocation: Allocation;
  /** The latest render's viewer handlers, off the `<Container>` it produced. */
  handlers: ContainerHandlers;
  /** The state text on the entity, so an unchanged state is not rewritten. */
  persisted: string | undefined;
  runId: number;
}

const isPlayer = (entity: Entity | undefined): entity is Player =>
  entity !== undefined && entity.typeId === 'minecraft:player';

const containerOf = (entity: Entity): Container | undefined =>
  entity.isValid ? entity.getComponent(EntityComponentTypes.Inventory)?.container : undefined;

/** The content log, where a developer already is; never chat. */
const report = (error: unknown): void => {
  console.error(`[core.ui] ${error instanceof Error ? error.message : String(error)}`);
};

/**
 * Serves a compiled screen to every player who opens its entity.
 *
 * Takes the screen's component and nothing else: it carries its own state,
 * its own handlers and its own text, so there is no second place to describe
 * the screen and no way for the two to drift apart. The entity comes from the
 * `<Container>` at its root.
 *
 * @throws ContainerScreenError when the screen breaks the container rules.
 */
export function createContainerScreen(
  Screen: FunctionComponent,
  config: ContainerScreenConfig = {},
): ContainerScreen {
  const pollInterval = config.pollInterval ?? 1;
  const debug = config.debug ?? false;

  // The same render the build machine did, for the same reason: the tree
  // decides the entity, and anything the container rules reject fails here
  // rather than when a player walks up.
  const entityType = containerEntity(containerRoot(buildContainerTree(Screen)));

  if (entityType === undefined) {
    throw new ContainerScreenError('`<Container>` needs `entity`: the type of the entity the screen opens from.');
  }

  const sessions = new Map<string, Session>();
  const viewersOf = (session: Session): Player[] => [...session.viewers.values()];

  const trace = (session: Session, label: string): void => {
    if (!debug) {
      return;
    }

    const container = containerOf(session.entity);

    if (container?.isValid) {
      snapshot(label, container, viewersOf(session), {
        sentinels: session.allocation.sentinels,
        drawn: session.allocation.slots.map(entry => entry.slot),
      });
    }
  };

  /**
   * Turns a render into slots.
   *
   * The screen is rendered again with the entity as owner — same fibers, so
   * the state it holds carries over — and the allocation is walked again, so
   * every handler and value is read off the element this render produced.
   * Buttons before channels, and a re-read of the button slots after: a
   * button that came or went moved an item in the drawn range, which the next
   * poll would otherwise read as a press. Then the state goes to the entity.
   */
  const rerender = (session: Session): void => {
    const container = containerOf(session.entity);

    if (!container?.isValid) {
      return;
    }

    const tree = buildContainerTree(Screen, session.owner);

    session.allocation = allocate(tree);
    session.handlers = containerHandlers(containerRoot(tree));
    writeButtons(container, session.allocation.slots);
    writeChannels(container, session.allocation.channels, session.written);
    resync(container, session.watch, buttonSlots(session.allocation.slots));
    session.persisted = persistState(session.entity, session.owner, session.persisted);
  };

  /**
   * Runs a handler and renders what it changed, in one go.
   *
   * A setter inside the handler would otherwise schedule its own render for
   * the end of the tick. Holding that back and rendering once here means the
   * buttons settle, the channels update and the state lands before the poll
   * moves on to the next slot — and a handler that throws costs one log line
   * rather than a button with no transport in it.
   */
  const handle = (session: Session, run: () => void): void => {
    beginInteractiveTransaction(session.owner);

    try {
      run();
    } catch (error: unknown) {
      report(error);
    } finally {
      endInteractiveTransaction(session.owner);
    }

    try {
      rerender(session);
    } catch (error: unknown) {
      report(error);
    }
  };

  /** Tells the screen who just opened it, and renders whatever it made of that. */
  const greet = (session: Session, player: Player): void => {
    const { onOpen } = session.handlers;

    if (onOpen && validPlayer(player) && validHost(session.entity)) {
      handle(session, () => {
        onOpen(player, session.entity);
      });
    }
  };

  /** Releases everything a session holds: the last viewer left, the entity is gone, or the screen detached. */
  const end = (session: Session): void => {
    system.clearRun(session.runId);
    sessions.delete(session.entity.id);

    // What the tree holds is on the entity after every render already; this
    // covers a setter that ran after the last one.
    if (session.entity.isValid) {
      try {
        session.persisted = persistState(session.entity, session.owner, session.persisted);
      } catch (error: unknown) {
        report(error);
      }
    }

    // Deleting the fibers runs every effect's cleanup: an effect lives
    // exactly as long as the entity is being viewed.
    cleanupComponentTree(session.owner);
    clearSession(session.owner);

    // A player who logged out mid-screen is gone before the close event, and
    // every component read on them throws. What they carried off is swept the
    // next time they spawn.
    for (const viewer of session.viewers.values()) {
      if (viewer.isValid) {
        sweep(viewer);
      }
    }

    session.viewers.clear();
  };

  /** One viewer closes the screen. The session outlives them while anyone else is looking. */
  const leave = (session: Session, id: string): void => {
    const viewer = session.viewers.get(id);

    session.viewers.delete(id);

    if (viewer?.isValid) {
      sweep(viewer);

      const { onClose } = session.handlers;

      if (onClose && validPlayer(viewer) && validHost(session.entity)) {
        handle(session, () => {
          onClose(viewer, session.entity);
        });
      }

      trace(session, `close ${viewer.name}`);
    }

    if (session.viewers.size === 0) {
      end(session);
    }
  };

  const tick = (session: Session): void => {
    const container = containerOf(session.entity);

    if (!container?.isValid) {
      end(session);

      return;
    }

    // A logout invalidates the player without touching the entity, and every
    // handler below is handed a player.
    for (const [id, viewer] of [...session.viewers]) {
      if (!viewer.isValid) {
        session.viewers.delete(id);
      }
    }

    if (session.viewers.size === 0) {
      end(session);

      return;
    }

    poll({
      container,
      entity: session.entity,
      viewers: viewersOf(session),
      watch: session.watch,
      ledger: session.ledger,
      get slots() {
        return session.allocation.slots;
      },
      handle: run => handle(session, run),
      trace: label => trace(session, label),
    });
  };

  /**
   * Starts serving one entity, or adds a viewer to the session already
   * serving it.
   *
   * Safe to call from both the interact and the open event — which it has to
   * be: the screen must be POPULATED before the container opens, or the router
   * finds no routing key and the player gets a plain chest.
   */
  const open = (entity: Entity, player: Player): void => {
    const existing = sessions.get(entity.id);

    if (existing) {
      existing.viewers.set(player.id, player);
      greet(existing, player);
      trace(existing, `open ${player.name}`);

      return;
    }

    const container = containerOf(entity);

    if (!container?.isValid) {
      return;
    }

    // The entity carries its own routing key: the build stamps the layout key
    // on it, and the sentinel repeats it where the JSON UI can read it.
    const layout = entity.getProperty(LAYOUT_PROPERTY);

    if (typeof layout !== 'number') {
      report(new ContainerScreenError(
        `${entity.typeId} has no \`${LAYOUT_PROPERTY}\` property, so its screen cannot be routed.\n`
        + '  The build stamps it on the entity: rebuild the pack with the ui-compile filter.',
      ));

      return;
    }

    const owner = entityOwner(entity);

    // Nothing a dead session left behind may lend this one its state; the
    // entity's own copy is what comes back, and it is handed over before the
    // first render because a fiber reads its seed as it is created.
    cleanupComponentTree(owner);

    const stored = hydrateState(entity, owner);

    // A state change re-renders the screen; this is what turns the result
    // into slots. Registered before the first render, so an effect that sets
    // state on mount is heard.
    setSessionRoot(owner, { type: Screen, props: {} });
    setBuildRunner(owner, () => {
      const live = sessions.get(entity.id);

      if (live) {
        rerender(live);
      }
    });

    let allocation: Allocation;
    let handlers: ContainerHandlers;

    try {
      const tree = buildContainerTree(Screen, owner);

      allocation = allocate(tree);
      handlers = containerHandlers(containerRoot(tree));
    } catch (error: unknown) {
      report(error);
      cleanupComponentTree(owner);
      clearSession(owner);

      return;
    }

    if (container.size !== allocation.size) {
      report(new ContainerScreenError(
        `${entity.typeId} has ${container.size} inventory slots and its screen needs ${allocation.size}.\n`
        + '  The build sizes the entity\'s inventory to the screen: rebuild the pack with the ui-compile filter.',
      ));
      cleanupComponentTree(owner);
      clearSession(owner);

      return;
    }

    const session: Session = {
      entity,
      owner,
      viewers: new Map([[player.id, player]]),
      watch: createWatch(),
      ledger: createLedger(),
      written: new Map(),
      allocation,
      handlers,
      persisted: stored,
      runId: 0,
    };

    sessions.set(entity.id, session);
    reconcile(container, allocation, layout, session.written);
    resync(container, session.watch, allocation.slots.map(entry => entry.slot));

    try {
      session.persisted = persistState(entity, owner, stored);
    } catch (error: unknown) {
      report(error);
    }

    session.runId = system.runInterval(() => {
      tick(session);
    }, pollInterval);
    greet(session, player);
    trace(session, `open ${player.name}`);
  };

  const close = (entity: Entity, source: Entity | undefined): void => {
    const session = sessions.get(entity.id);

    if (!session) {
      return;
    }

    if (isPlayer(source)) {
      leave(session, source.id);

      return;
    }

    // Without a source: the one viewer there is has left; among several, only
    // the ones gone for good can be told apart.
    if (session.viewers.size === 1) {
      for (const id of [...session.viewers.keys()]) {
        leave(session, id);
      }

      return;
    }

    for (const [id, viewer] of [...session.viewers]) {
      if (!viewer.isValid) {
        leave(session, id);
      }
    }
  };

  if (debug) {
    console.warn(`[core.ui] serving ${entityType}`);
  }

  // Population happens on the interact, not on the open: the screen has to
  // carry its routing key before the container appears, or the router does
  // not recognise it and vanilla renders instead. A before event cannot touch
  // the world, so the write is deferred by a tick — which still lands ahead
  // of the open.
  const onInteract = world.beforeEvents.playerInteractWithEntity.subscribe((event) => {
    if (event.target.typeId !== entityType) {
      return;
    }

    const { target, player } = event;

    system.run(() => {
      open(target, player);
    });
  });

  // A backstop, for anything that opens a container without an interact.
  const onOpen = world.afterEvents.entityContainerOpened.subscribe((event) => {
    const source = event.openSource.entity;

    if (event.entity.typeId === entityType && isPlayer(source)) {
      open(event.entity, source);
    }
  });

  const onClose = world.afterEvents.entityContainerClosed.subscribe((event) => {
    close(event.entity, event.closeSource.entity);
  });

  // A player who logs out inside the one-tick window between a press and its
  // reclaim carries the transport off with them, and by the time the close
  // event fires they are gone and unreadable. The inventory is readable again
  // the moment they are back, so that is when it is swept. The mark on the
  // item is what makes this possible without remembering who held what.
  const onSpawn = world.afterEvents.playerSpawn.subscribe((event) => {
    if (event.initialSpawn) {
      sweep(event.player);
    }
  });

  // A marker that reaches the ground — dropped off the cursor, thrown, spilled
  // by a death — is an item entity anyone could pick up later, outside every
  // sweep. It is destroyed the moment it spawns, so no marker ever exists in
  // the world as anything but a slot of ours.
  const onItemSpawn = world.afterEvents.entitySpawn.subscribe((event) => {
    const { entity } = event;

    if (entity.typeId !== 'minecraft:item' || !entity.isValid) {
      return;
    }

    const stack = entity.getComponent(EntityComponentTypes.Item)?.itemStack;

    if (stack !== undefined && isOwned(stack)) {
      entity.remove();
    }
  });

  const detach = (): void => {
    world.beforeEvents.playerInteractWithEntity.unsubscribe(onInteract);
    world.afterEvents.entityContainerOpened.unsubscribe(onOpen);
    world.afterEvents.entityContainerClosed.unsubscribe(onClose);
    world.afterEvents.playerSpawn.unsubscribe(onSpawn);
    world.afterEvents.entitySpawn.unsubscribe(onItemSpawn);

    for (const session of [...sessions.values()]) {
      end(session);
    }
  };

  return { entity: entityType, detach };
}
