import {
  type Entity, EntityComponentTypes, type Player, system, world,
} from '@minecraft/server';
import {
  containerHandlers, containerHost, containerRoot, type ContainerHandlers, type ContainerHost,
} from '../../../components/Container';
import type { ScreenHost } from '../../../core/events';
import type { Owner } from '../../../core/fabric';
import {
  beginInteractiveTransaction, clearSession, endInteractiveTransaction, setBuildRunner, setSessionRoot,
} from '../../../core/render/session';
import { cleanupComponentTree } from '../../../core/render/tree';
import { ContainerScreenError } from '../../../core/types';
import type { FunctionComponent } from '../../../jsx';
import { allocate, type Allocation } from '../allocate';
import { BLOCK_SLOT_LIMIT, blockCapacityError, namespaceOf } from '../contract';
import { buildContainerTree } from '../build';
import type { NamedContainer } from '../../../entity';
import { writeChannels, type Written } from './channels';
import { protocolItems } from './items';
import { snapshot } from './debug';
import { containerLooksOf } from '../../../core/render/screens';
import {
  createLedger, createWatch, type Ledger, poll, resync, sweep, type Watch,
} from './poll';
import { validHost, validPlayer } from './cells/types';
import { buttonSlots, reconcile, writeButtons } from './reconcile';
import { hydrateState, persistState } from './store';
import { type HostTarget, targetOf } from './target';
import { screenContainer } from './view';

/**
 * Serving a compiled container screen.
 *
 * The build freezes the layout in JSON UI; everything alive travels through
 * the host's container. Slot 0 carries the routing keys, the drawn slots
 * carry what the players see and touch, and the bank behind them carries the
 * values the layout reads but no cell ever draws.
 *
 * One session per host, shared by everyone who has it open. The screen's
 * component renders with the entity or block as its owner, so its state belongs
 * to the host and outlives every viewer: it is written to the host after each
 * render and read back at the next open. Effects run exactly while someone is
 * looking, because the fibers exist exactly then.
 *
 * The single hard truth this is built around: **an item moving is the only
 * signal a container gives back**. There is no click event, no lock that
 * makes a slot read-only, and no way to veto a move. So a press is an item
 * dropped and put straight back — invisible, because the item has no icon and
 * a button draws a button rather than an item — and a role is enforced a tick
 * later rather than prevented.
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

/**
 * A screen being served, and the way into the cells of any host it owns.
 *
 * `N` is the set of names the screen's `<Slot name>` cells declare, when the
 * caller states it: `createContainerScreen<'output' | 'fuel'>(Furnace)` types
 * every named call against those two. Left off, a name is an ordinary string,
 * so nothing has to be declared twice to use one.
 */
export interface ContainerScreen<N extends string = string> {
  /** What the screen's `<Container>` opens from: a custom entity, or a custom block. */
  readonly host: ContainerHost;
  /**
   * The screen's own cells on one host: the vanilla `Container` over the drawn
   * `<Slot>`s in document order, addressed by index or by the name the author
   * gave them.
   *
   * Built from the layout the screen was constructed with, so it needs no
   * session and no viewer — a machine ticking over its host while nobody is
   * looking reaches its cells exactly as a handler does. Nothing the runtime
   * placed is visible through it, so an output cell holding the guard reads
   * empty.
   */
  container(host: ScreenHost): NamedContainer<N>;
  /** Stops serving and releases every open session. */
  detach(): void;
}

interface Session {
  /** The entity or block the screen is being served on, and how its four facts are read. */
  readonly target: HostTarget;
  readonly owner: Owner;
  /** Everyone with the screen open, by player id. */
  readonly viewers: Map<string, Player>;
  readonly watch: Watch;
  /** What every viewer carried at the last poll, so a move is traced to its mover. */
  readonly ledger: Ledger;
  /** Viewers whose transport drop was heard since the last poll: who pressed. */
  readonly drops: Player[];
  /** Presses waiting for the drop event that names the presser, by button slot. */
  readonly waiting: Map<number, number>;
  readonly written: Written;
  /** The latest render's cells and channels. Replaced by every render. */
  allocation: Allocation;
  /** The latest render's viewer handlers, off the `<Container>` it produced. */
  handlers: ContainerHandlers;
  /** The state text on the host, so an unchanged state is not rewritten. */
  persisted: string | undefined;
  runId: number;
}

const isPlayer = (entity: Entity | undefined): entity is Player =>
  entity !== undefined && entity.typeId === 'minecraft:player';

/** The content log, where a developer already is; never chat. */
const report = (error: unknown): void => {
  console.error(`[core.ui] ${error instanceof Error ? error.message : String(error)}`);
};

/**
 * Serves a compiled screen to every player who opens its host.
 *
 * Takes the screen's component and nothing else: it carries its own state,
 * its own handlers and its own text, so there is no second place to describe
 * the screen and no way for the two to drift apart. The entity or block comes
 * from the `<Container>` at its root.
 *
 * @throws ContainerScreenError when the screen breaks the container rules.
 */
export function createContainerScreen<N extends string = string>(
  Screen: FunctionComponent,
  config: ContainerScreenConfig = {},
): ContainerScreen<N> {
  const pollInterval = config.pollInterval ?? 1;
  const debug = config.debug ?? false;

  // The same render the build machine did, for the same reason: the tree
  // decides the host, and anything the container rules reject fails here
  // rather than when a player walks up.
  const built = buildContainerTree(Screen);
  const host = containerHost(containerRoot(built));

  if (host === undefined) {
    throw new ContainerScreenError(
      '`<Container>` needs `entity` or `block`: the type of the entity or the block the screen opens from.',
    );
  }

  // The shape, once. A compiled screen cannot change it, so this numbers the
  // same cells every later render does — which is what lets a host's cells be
  // reached with no session open.
  const shape = allocate(built);

  // The items the build registered for this screen: under the namespace of
  // the entity or block it opens from.
  const items = protocolItems(namespaceOf(host.type));

  // A block's container is capped where an entity's is not, so a screen that
  // outgrew its block is refused here as well as at the build: the two can
  // disagree when the pack carries a stamp from an older screen.
  if (host.kind === 'block' && shape.size > BLOCK_SLOT_LIMIT) {
    throw blockCapacityError(Screen.name || 'The screen', shape.size);
  }

  const sessions = new Map<string, Session>();
  const viewersOf = (session: Session): Player[] => [...session.viewers.values()];

  /**
   * The screen's own cells on one host.
   *
   * A live session lends its watch, so what the screen writes through the view
   * is re-read straight away and the next poll does not report the screen's
   * own move as a player's.
   */
  const cellsOf = (target: HostTarget): NamedContainer<N> => {
    const session = sessions.get(target.id);

    return screenContainer<N>(target.host, session?.allocation.slots ?? shape.slots, items, session?.watch);
  };

  const trace = (session: Session, label: string): void => {
    if (!debug) {
      return;
    }

    const container = session.target.container();

    if (container?.isValid) {
      // The host is named on every line: several of them may be open at once,
      // and two blocks of one type are told apart only by where they stand.
      snapshot(`${label} on ${session.target.label}`, container, viewersOf(session), {
        items,
        sentinels: session.allocation.sentinels,
        drawn: session.allocation.slots.map(entry => entry.slot),
      });
    }
  };

  /**
   * Turns a render into slots.
   *
   * The screen is rendered again with the host as owner — same fibers, so the
   * state it holds carries over — and the allocation is walked again, so every
   * handler and value is read off the element this render produced. Buttons
   * before channels, and a re-read of the button slots after: a button that
   * came or went moved an item in the drawn range, which the next poll would
   * otherwise read as a press. Then the state goes to the host.
   */
  const rerender = (session: Session): void => {
    const container = session.target.container();

    if (!container?.isValid) {
      return;
    }

    const tree = buildContainerTree(Screen, session.owner);

    session.allocation = allocate(tree, undefined, containerLooksOf(Screen));
    session.handlers = containerHandlers(containerRoot(tree));
    writeButtons(container, session.allocation.slots, items);
    writeChannels(container, session.allocation.channels, session.written, items);
    resync(container, session.watch, buttonSlots(session.allocation.slots));
    session.persisted = persistState(session.target.store, session.owner, session.persisted);
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
    const { target } = session;

    if (onOpen && validPlayer(player) && validHost(target.host) && target.isValid()) {
      handle(session, () => {
        onOpen({ player, host: target.host, container: cellsOf(target) });
      });
    }
  };

  /** Releases everything a session holds: the last viewer left, the host is gone, or the screen detached. */
  const end = (session: Session): void => {
    system.clearRun(session.runId);
    sessions.delete(session.target.id);

    // What the tree holds is on the host after every render already; this
    // covers a setter that ran after the last one.
    if (session.target.isValid()) {
      try {
        session.persisted = persistState(session.target.store, session.owner, session.persisted);
      } catch (error: unknown) {
        report(error);
      }
    }

    // Deleting the fibers runs every effect's cleanup: an effect lives
    // exactly as long as the host is being viewed.
    cleanupComponentTree(session.owner);
    clearSession(session.owner);

    // A player who logged out mid-screen is gone before the close event, and
    // every component read on them throws. What they carried off is swept the
    // next time they spawn.
    for (const viewer of session.viewers.values()) {
      if (viewer.isValid) {
        sweep(viewer, items);
      }
    }

    session.viewers.clear();
  };

  /** One viewer closes the screen. The session outlives them while anyone else is looking. */
  const leave = (session: Session, id: string): void => {
    const viewer = session.viewers.get(id);
    const { target } = session;

    session.viewers.delete(id);

    if (viewer?.isValid) {
      sweep(viewer, items);

      const { onClose } = session.handlers;

      if (onClose && validPlayer(viewer) && validHost(target.host) && target.isValid()) {
        handle(session, () => {
          onClose({ player: viewer, host: target.host, container: cellsOf(target) });
        });
      }

      trace(session, `close ${viewer.name}`);
    }

    if (session.viewers.size === 0) {
      end(session);
    }
  };

  const tick = (session: Session): void => {
    const container = session.target.container();

    if (!container?.isValid) {
      end(session);

      return;
    }

    // A logout invalidates the player without touching the host, and every
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
      host: session.target.host,
      viewers: viewersOf(session),
      watch: session.watch,
      ledger: session.ledger,
      items,
      drops: session.drops,
      waiting: session.waiting,
      get slots() {
        return session.allocation.slots;
      },
      get cells() {
        return cellsOf(session.target);
      },
      handle: run => handle(session, run),
      trace: label => trace(session, label),
    });
  };

  /**
   * Starts serving one host, or adds a viewer to the session already serving
   * it.
   *
   * Safe to call from both the interact and the open event — which it has to
   * be: the screen must be POPULATED before the container opens, or the router
   * finds no routing key and the player gets a plain chest.
   */
  const open = (subject: ScreenHost, player: Player): void => {
    const target = targetOf(subject);
    const existing = sessions.get(target.id);

    if (existing) {
      existing.viewers.set(player.id, player);
      greet(existing, player);
      trace(existing, `open ${player.name}`);

      return;
    }

    const container = target.container();

    if (!container?.isValid) {
      return;
    }

    // The host carries its own routing key: the build stamps the layout key on
    // it, and the sentinel repeats it where the JSON UI can read it.
    const layout = target.layout();

    if (layout === undefined) {
      report(new ContainerScreenError(
        `${target.stampHint}, so its screen cannot be routed.\n`
        + '  The build stamps it on the host: rebuild the pack with the ui-compiler filter.',
      ));

      return;
    }

    const { owner } = target;

    // Nothing a dead session left behind may lend this one its state; the
    // host's own copy is what comes back, and it is handed over before the
    // first render because a fiber reads its seed as it is created.
    cleanupComponentTree(owner);

    const stored = hydrateState(target.store, owner);

    // A state change re-renders the screen; this is what turns the result
    // into slots. Registered before the first render, so an effect that sets
    // state on mount is heard.
    setSessionRoot(owner, { type: Screen, props: {} });
    setBuildRunner(owner, () => {
      const live = sessions.get(target.id);

      if (live) {
        rerender(live);
      }
    });

    let allocation: Allocation;
    let handlers: ContainerHandlers;

    try {
      const tree = buildContainerTree(Screen, owner);

      allocation = allocate(tree, undefined, containerLooksOf(Screen));
      handlers = containerHandlers(containerRoot(tree));
    } catch (error: unknown) {
      report(error);
      cleanupComponentTree(owner);
      clearSession(owner);

      return;
    }

    if (container.size !== allocation.size) {
      report(new ContainerScreenError(
        `${target.label} has ${container.size} container slots and its screen needs ${allocation.size}.\n`
        + `  ${target.sizeHint}: rebuild the pack with the ui-compiler filter.`,
      ));
      cleanupComponentTree(owner);
      clearSession(owner);

      return;
    }

    const session: Session = {
      target,
      owner,
      viewers: new Map([[player.id, player]]),
      watch: createWatch(),
      ledger: createLedger(),
      drops: [],
      waiting: new Map(),
      written: new Map(),
      allocation,
      handlers,
      persisted: stored,
      runId: 0,
    };

    sessions.set(target.id, session);
    reconcile(container, allocation, layout, session.written, items);
    resync(container, session.watch, allocation.slots.map(entry => entry.slot));

    try {
      session.persisted = persistState(target.store, owner, stored);
    } catch (error: unknown) {
      report(error);
    }

    session.runId = system.runInterval(() => {
      tick(session);
    }, pollInterval);
    greet(session, player);
    trace(session, `open ${player.name}`);
  };

  const close = (subject: ScreenHost, source: Entity | undefined): void => {
    const session = sessions.get(targetOf(subject).id);

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
    console.warn(`[core.ui] serving ${host.kind} ${host.type}`);
  }

  /**
   * Population happens on the interact, not on the open: the screen has to
   * carry its routing key before the container appears, or the router does not
   * recognise it and vanilla renders instead. A before event cannot touch the
   * world, so the write is deferred by a tick — which still lands ahead of the
   * open. The after-event behind it is the backstop, for anything that opens a
   * container without an interact.
   *
   * Entities and blocks each have their own pair, and a screen subscribes to
   * exactly the pair its `<Container>` named.
   */
  const detachHost = host.kind === 'entity'
    ? serveEntity(host.type, open, close)
    : serveBlock(host.type, open, close);

  // A player who logs out while an output's guard is on their cursor carries
  // it off with them, and by the time the close event fires they are gone and
  // unreadable. The inventory is readable again the moment they are back, so
  // that is when it is swept. The item's type is what makes this possible
  // without remembering who held what.
  const onSpawn = world.afterEvents.playerSpawn.subscribe((event) => {
    if (event.initialSpawn) {
      sweep(event.player, items);
    }
  });

  // A press drops the transport, and the drop event is the one place the
  // pressing player is named. It is heard after the poll within the same tick,
  // so it is queued on the session the player is viewing and the poll takes it
  // on its next pass.
  const onDrop = world.afterEvents.entityItemDrop.subscribe((event) => {
    const { entity } = event;

    if (!isPlayer(entity)) {
      return;
    }

    const pressed = event.items.some((dropped) => {
      const stack = dropped.isValid ? dropped.getComponent(EntityComponentTypes.Item)?.itemStack : undefined;

      return stack !== undefined && items.isTransport(stack);
    });

    if (!pressed) {
      return;
    }

    for (const session of sessions.values()) {
      if (session.viewers.has(entity.id)) {
        session.drops.push(entity);

        return;
      }
    }
  });

  // An item of ours that reaches the ground — every press drops one — is an
  // item entity anyone could pick up. It is removed on the next tick: the
  // drop event, which fires after this one, still reads it, and nobody can
  // pick up an item that young.
  const onItemSpawn = world.afterEvents.entitySpawn.subscribe((event) => {
    const { entity } = event;

    if (entity.typeId !== 'minecraft:item' || !entity.isValid) {
      return;
    }

    const stack = entity.getComponent(EntityComponentTypes.Item)?.itemStack;

    if (stack !== undefined && items.isOwned(stack)) {
      system.run(() => {
        if (entity.isValid) {
          entity.remove();
        }
      });
    }
  });

  const detach = (): void => {
    detachHost();
    world.afterEvents.playerSpawn.unsubscribe(onSpawn);
    world.afterEvents.entityItemDrop.unsubscribe(onDrop);
    world.afterEvents.entitySpawn.unsubscribe(onItemSpawn);

    for (const session of [...sessions.values()]) {
      end(session);
    }
  };

  return { host, container: (subject: ScreenHost) => cellsOf(targetOf(subject)), detach };
}

/** What one kind of host's events are wired to. */
type Open = (host: ScreenHost, player: Player) => void;
type Close = (host: ScreenHost, source: Entity | undefined) => void;

/** Listens for one entity type being interacted with, opened and closed. */
function serveEntity(entityType: string, open: Open, close: Close): () => void {
  const onInteract = world.beforeEvents.playerInteractWithEntity.subscribe((event) => {
    if (event.target.typeId !== entityType) {
      return;
    }

    const { target, player } = event;

    system.run(() => {
      open(target, player);
    });
  });

  const onOpen = world.afterEvents.entityContainerOpened.subscribe((event) => {
    const source = event.openSource.entity;

    if (event.entity.typeId === entityType && isPlayer(source)) {
      open(event.entity, source);
    }
  });

  const onClose = world.afterEvents.entityContainerClosed.subscribe((event) => {
    close(event.entity, event.closeSource.entity);
  });

  return (): void => {
    world.beforeEvents.playerInteractWithEntity.unsubscribe(onInteract);
    world.afterEvents.entityContainerOpened.unsubscribe(onOpen);
    world.afterEvents.entityContainerClosed.unsubscribe(onClose);
  };
}

/**
 * Listens for one block type being interacted with, opened and closed.
 *
 * The block handed to the after events is the one standing there now, so it is
 * taken from the event every time rather than remembered: the block a session
 * was opened on may have been broken and replaced, and the session key is the
 * position either way.
 */
function serveBlock(blockType: string, open: Open, close: Close): () => void {
  const onInteract = world.beforeEvents.playerInteractWithBlock.subscribe((event) => {
    if (event.block.typeId !== blockType) {
      return;
    }

    const { block, player } = event;

    system.run(() => {
      open(block, player);
    });
  });

  const onOpen = world.afterEvents.blockContainerOpened.subscribe((event) => {
    const source = event.openSource.entity;

    if (event.block.typeId === blockType && isPlayer(source)) {
      open(event.block, source);
    }
  });

  const onClose = world.afterEvents.blockContainerClosed.subscribe((event) => {
    if (event.block.typeId === blockType) {
      close(event.block, event.closeSource.entity);
    }
  });

  return (): void => {
    world.beforeEvents.playerInteractWithBlock.unsubscribe(onInteract);
    world.afterEvents.blockContainerOpened.unsubscribe(onOpen);
    world.afterEvents.blockContainerClosed.unsubscribe(onClose);
  };
}
