import {
  type Container as EngineContainer, type Entity, EntityComponentTypes, ItemStack, type Player,
} from '@minecraft/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Container as MockContainer } from '../../../__mocks__/@minecraft/server';
import { Button } from '../../../components/Button';
import { Container } from '../../../components/Container';
import { Slot } from '../../../components/Slot';
import type { JSX } from '../../../jsx';
import { allocate, type Allocation } from '../allocate';
import { buildContainerTree } from '../build';
import { PROTOCOL_ITEM, TRANSPORT_ITEM } from '../contract';
import { guard, isGuard, isTransport, transport } from '../runtime/items';
import {
  createLedger, createWatch, fingerprint, poll, type PollHost, reclaim, resync, retrieve, sweep,
} from '../runtime/poll';
import { buttonSlots, reconcile, writeButtons } from '../runtime/reconcile';
import { screenContainer } from '../runtime/view';

/** The mock container, typed as the engine's: that is what it stands in for at runtime. */
const createContainer = (size: number): EngineContainer => new MockContainer(size) as unknown as EngineContainer;

/** The stack in flight between slots: read-only `item`, `clear` its only write, `hold` for the test. */
interface FakeCursor {
  readonly item: ItemStack | undefined;
  clear(): void;
  hold(stack: ItemStack | undefined): void;
}

const createCursor = (): FakeCursor => {
  let held: ItemStack | undefined;

  return {
    get item(): ItemStack | undefined {
      return held?.clone();
    },
    clear: (): void => {
      held = undefined;
    },
    hold: (stack): void => {
      held = stack?.clone();
    },
  };
};

interface FakePlayer {
  readonly id: string;
  readonly inventory: EngineContainer;
  readonly cursor: FakeCursor;
  readonly dropped: ItemStack[];
  readonly player: Player;
}

const createPlayer = (id: string, slots = 9): FakePlayer => {
  const inventory = createContainer(slots);
  const cursor = createCursor();
  const dropped: ItemStack[] = [];
  const fake = {
    id,
    name: id,
    typeId: 'minecraft:player',
    isValid: true,
    location: { x: 0, y: 0, z: 0 },
    dimension: {
      spawnItem: (stack: ItemStack): void => {
        dropped.push(stack);
      },
    },
    getComponent: (componentId: string): unknown => {
      if (componentId === EntityComponentTypes.Inventory) {
        return { container: inventory };
      }

      return componentId === EntityComponentTypes.CursorInventory ? cursor : undefined;
    },
  };

  return { id, inventory, cursor, dropped, player: fake as unknown as Player };
};

const onPress = vi.fn();
const onInsert = vi.fn();
const onRemove = vi.fn();
const onTake = vi.fn();

/** A button, an input, an output and an ordinary slot: 2, 3, 4, 5, after the two sentinel slots. */
const Screen = (): JSX.Element => Container({
  entity: 'core:test',
  children: [
    Button({ onPress }),
    Slot({ role: 'input', onInsert }),
    Slot({ role: 'output', onRemove: onTake }),
    Slot({ onInsert, onRemove }),
  ],
});

/** The container the stand-in host entity currently owns; `rig` points it at its own. */
let hostContainer: EngineContainer | undefined;

/** A stand-in host entity: handed to the slot handlers, and the view's way to the container. */
const HOST = {
  id: 'host',
  typeId: 'core:test',
  isValid: true,
  getComponent: (componentId: string): unknown =>
    (componentId === EntityComponentTypes.Inventory && hostContainer ? { container: hostContainer } : undefined),
} as unknown as Entity;

interface Rig {
  readonly container: EngineContainer;
  readonly host: PollHost;
  readonly allocation: Allocation;
  readonly handle: ReturnType<typeof vi.fn>;
}

/** A settled container and a host that settles the buttons the way a session does. */
const rig = (...viewers: FakePlayer[]): Rig => {
  const allocation = allocate(buildContainerTree(Screen));
  const container = createContainer(allocation.size);
  const watch = createWatch();

  hostContainer = container;
  reconcile(container, allocation, 1, new Map());
  resync(container, watch, allocation.slots.map(entry => entry.slot));

  const handle = vi.fn((run: () => void): void => {
    run();
    writeButtons(container, allocation.slots);
    resync(container, watch, buttonSlots(allocation.slots));
  });

  const host: PollHost = {
    container,
    host: HOST,
    viewers: viewers.map(viewer => viewer.player),
    watch,
    ledger: createLedger(),
    slots: allocation.slots,
    cells: screenContainer(HOST, allocation.slots, watch),
    handle,
    trace: vi.fn(),
  };

  return { container, host, allocation, handle };
};

/** The player lifts the item out of `slot` onto their cursor. */
const lift = (container: EngineContainer, slot: number, viewer: FakePlayer): void => {
  viewer.cursor.hold(container.getItem(slot));
  container.setItem(slot, undefined);
};

const stone = (amount = 1): ItemStack => new ItemStack('minecraft:stone', amount);

beforeEach(() => {
  vi.clearAllMocks();
});

describe('a press', () => {
  it('is a transport that moved: reclaimed from the cursor, handler run for that viewer, button settled', () => {
    const viewer = createPlayer('p1');
    const { container, host, handle } = rig(viewer);

    lift(container, 2, viewer);
    poll(host);

    expect(viewer.cursor.item).toBeUndefined();
    expect(onPress).toHaveBeenCalledTimes(1);
    expect(onPress).toHaveBeenCalledWith({ player: viewer.player, host: HOST, container: expect.anything() });
    expect(handle).toHaveBeenCalledTimes(1);

    const item = container.getItem(2);

    expect(item && isTransport(item)).toBe(true);
    expect(host.watch.expected[2]).toBe(fingerprint(container, 2));

    // Settled: a second poll sees nothing.
    poll(host);

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('reclaims a transport that landed in the inventory', () => {
    const viewer = createPlayer('p1');
    const { container, host } = rig(viewer);

    viewer.inventory.setItem(4, container.getItem(2));
    container.setItem(2, undefined);
    poll(host);

    expect(viewer.inventory.getItem(4)).toBeUndefined();
    expect(onPress).toHaveBeenCalledWith({ player: viewer.player, host: HOST, container: expect.anything() });
  });

  it('hands back an item swapped into the button and restores the transport', () => {
    const viewer = createPlayer('p1');
    const { container, host } = rig(viewer);

    viewer.cursor.hold(container.getItem(2));
    container.setItem(2, stone(5));
    poll(host);

    expect(onPress).toHaveBeenCalledTimes(1);
    expect(viewer.cursor.item).toBeUndefined();
    expect(viewer.inventory.getItem(0)?.typeId).toBe('minecraft:stone');
    expect(viewer.inventory.getItem(0)?.amount).toBe(5);

    const item = container.getItem(2);

    expect(item && isTransport(item)).toBe(true);
  });

  it('names the viewer the transport was found on, among several', () => {
    const first = createPlayer('p1');
    const second = createPlayer('p2');
    const { container, host } = rig(first, second);

    lift(container, 2, second);
    poll(host);

    expect(onPress).toHaveBeenCalledWith({ player: second.player, host: HOST, container: expect.anything() });
    expect(second.cursor.item).toBeUndefined();
  });

  it('never reclaims a working button or a bank slot', () => {
    const viewer = createPlayer('p1');
    const { container, host, allocation } = rig(viewer);

    container.setItem(5, transport());

    expect(reclaim(container, [viewer.player], allocation.slots, 2)).toBeUndefined();
    expect(container.getItem(5)).toBeUndefined();
    expect(container.getItem(2)?.typeId).toBe(TRANSPORT_ITEM);
    expect(container.getItem(0)?.typeId).toBe(PROTOCOL_ITEM);
    expect(container.getItem(1)?.typeId).toBe(PROTOCOL_ITEM);
    expect(host.watch.expected[2]).toBe(fingerprint(container, 2));
  });

  it('runs the handler even when the copy is nowhere, so a press is never lost', () => {
    const viewer = createPlayer('p1');
    const { container, host } = rig(viewer);

    container.setItem(2, undefined);
    poll(host);

    expect(onPress).toHaveBeenCalledWith({ player: viewer.player, host: HOST, container: expect.anything() });
    expect(container.getItem(2)?.typeId).toBe(TRANSPORT_ITEM);
  });
});

describe('an input slot', () => {
  it('refuses a take: the item comes off the cursor and back into the slot', () => {
    const viewer = createPlayer('p1');
    const { container, host } = rig(viewer);

    container.setItem(3, stone(3));
    resync(container, host.watch, [3]);
    lift(container, 3, viewer);
    poll(host);

    expect(viewer.cursor.item).toBeUndefined();
    expect(container.getItem(3)?.typeId).toBe('minecraft:stone');
    expect(container.getItem(3)?.amount).toBe(3);
    expect(onInsert).not.toHaveBeenCalled();
    expect(host.handle).not.toHaveBeenCalled();
    expect(host.watch.expected[3]).toBe(fingerprint(container, 3));
  });

  it('takes a partial back from a merged stack and returns the change from a larger cursor', () => {
    const viewer = createPlayer('p1');
    const { container, host } = rig(viewer);

    container.setItem(3, stone(3));
    resync(container, host.watch, [3]);
    viewer.inventory.setItem(0, stone(10));
    container.setItem(3, undefined);
    poll(host);

    expect(viewer.inventory.getItem(0)?.amount).toBe(7);
    expect(container.getItem(3)?.amount).toBe(3);

    viewer.cursor.hold(stone(5));
    container.setItem(3, undefined);
    poll(host);

    expect(viewer.cursor.item).toBeUndefined();
    expect(container.getItem(3)?.amount).toBe(3);
    expect(viewer.inventory.getItem(1)?.amount).toBe(2);
  });

  it('does not restore what it could not take back, so nothing is duplicated', () => {
    const viewer = createPlayer('p1');
    const { container, host } = rig(viewer);

    container.setItem(3, stone(3));
    resync(container, host.watch, [3]);
    container.setItem(3, undefined);
    poll(host);

    expect(container.getItem(3)).toBeUndefined();
    expect(host.watch.expected[3]).toBe('');
    expect(host.trace).toHaveBeenCalledWith(expect.stringMatching(/NOT undone/));
  });

  it('refuses a swap: a different item cannot replace what is already in it', () => {
    const viewer = createPlayer('p1');
    const { container, host } = rig(viewer);

    container.setItem(3, stone(3));
    resync(container, host.watch, [3]);

    // The engine swaps: the player's item takes the slot, the original goes to
    // the cursor.
    viewer.cursor.hold(stone(3));
    container.setItem(3, new ItemStack('minecraft:dirt', 1));
    poll(host);

    expect(container.getItem(3)?.typeId).toBe('minecraft:stone');
    expect(container.getItem(3)?.amount).toBe(3);
    expect(viewer.inventory.getItem(0)?.typeId).toBe('minecraft:dirt');
    expect(onInsert).not.toHaveBeenCalled();
  });

  it('accepts an insert and tells the component', () => {
    const viewer = createPlayer('p1');
    const { container, host } = rig(viewer);

    container.setItem(3, stone(4));
    poll(host);

    expect(onInsert).toHaveBeenCalledTimes(1);

    const call = onInsert.mock.calls[0];

    expect(call?.[0]?.player).toBe(viewer.player);
    expect(call?.[0]?.stack?.typeId).toBe('minecraft:stone');
    expect(call?.[0]?.stack?.amount).toBe(4);
    expect(call?.[0]?.host).toBe(HOST);
    expect(host.handle).toHaveBeenCalledTimes(1);
    expect(host.watch.expected[3]).toBe(fingerprint(container, 3));
  });
});

describe('an output slot', () => {
  it('never sits empty, so a shift-click has no slot to auto-place into', () => {
    const { container } = rig(createPlayer('p1'));

    expect(isGuard(container.getItem(4)!)).toBe(true);
  });

  it('keeps a result the machine writes over the guard', () => {
    // No player can reach a guarded slot — its cell has no button while the
    // guard sits there — so a change out of the guard is the screen's own
    // machinery filling the output, and it stands.
    const viewer = createPlayer('p1');
    const { container, host } = rig(viewer);

    container.setItem(4, stone(2));
    poll(host);

    expect(container.getItem(4)?.typeId).toBe('minecraft:stone');
    expect(container.getItem(4)?.amount).toBe(2);
    expect(viewer.inventory.getItem(0)).toBeUndefined();
    expect(onTake).not.toHaveBeenCalled();
    expect(host.watch.expected[4]).toBe(fingerprint(container, 4));
  });

  it('reverses a swap over a result: nothing is taken and the result stands again', () => {
    const viewer = createPlayer('p1');
    const { container, host } = rig(viewer);

    container.setItem(4, stone(2));
    resync(container, host.watch, [4]);

    // The player clicks the result with an item on the cursor: the engine
    // swaps them, taking the result and placing theirs. The swap is reversed —
    // the result comes off the cursor and stands in the slot again; the placed
    // item returns to the player (the inventory: a cursor cannot be written).
    viewer.cursor.hold(stone(2));
    container.setItem(4, new ItemStack('minecraft:dirt', 1));
    poll(host);

    expect(container.getItem(4)?.typeId).toBe('minecraft:stone');
    expect(container.getItem(4)?.amount).toBe(2);
    expect(viewer.cursor.item).toBeUndefined();
    expect(viewer.inventory.getItem(0)?.typeId).toBe('minecraft:dirt');
    expect(onTake).not.toHaveBeenCalled();
  });

  it('drops a refused item when the player has no room', () => {
    const viewer = createPlayer('p1', 1);
    const { container, host } = rig(viewer);

    container.setItem(4, stone(2));
    resync(container, host.watch, [4]);
    viewer.inventory.setItem(0, stone(1));

    // A swap over the result with a full inventory: the refund has nowhere to
    // go, so it is dropped rather than destroyed.
    viewer.cursor.hold(stone(2));
    container.setItem(4, new ItemStack('minecraft:dirt', 2));
    poll(host);

    expect(viewer.dropped).toHaveLength(1);
    expect(viewer.dropped[0]?.amount).toBe(2);
  });

  it('lets a take through and tells the component the stack that left', () => {
    const viewer = createPlayer('p1');
    const { container, host } = rig(viewer);

    container.setItem(4, stone(2));
    resync(container, host.watch, [4]);
    lift(container, 4, viewer);
    poll(host);

    expect(onTake).toHaveBeenCalledTimes(1);
    expect(onTake.mock.calls[0]?.[0]?.player).toBe(viewer.player);
    expect(onTake.mock.calls[0]?.[0]?.stack?.typeId).toBe('minecraft:stone');
    expect(onTake.mock.calls[0]?.[0]?.stack?.amount).toBe(2);
    expect(onTake.mock.calls[0]?.[0]?.host).toBe(HOST);
    expect(viewer.cursor.item?.typeId).toBe('minecraft:stone');
    expect(isGuard(container.getItem(4)!)).toBe(true);
  });
});

describe('an ordinary slot', () => {
  it('reports an insert with the stack, and a removal without', () => {
    const viewer = createPlayer('p1');
    const { container, host } = rig(viewer);

    container.setItem(5, stone(6));
    poll(host);

    expect(onInsert).toHaveBeenCalledTimes(1);
    expect(onInsert.mock.calls[0]?.[0]?.stack?.amount).toBe(6);

    lift(container, 5, viewer);
    poll(host);

    expect(onRemove).toHaveBeenCalledTimes(1);
    expect(onRemove.mock.calls[0]?.[0]?.player).toBe(viewer.player);
    expect(onRemove.mock.calls[0]?.[0]?.stack?.amount).toBe(6);
    expect(onRemove.mock.calls[0]?.[0]?.host).toBe(HOST);
    expect(viewer.cursor.item?.amount).toBe(6);
  });

  it('expects what the handler left behind, not what arrived', () => {
    const viewer = createPlayer('p1');
    const { container, host } = rig(viewer);

    onInsert.mockImplementationOnce(() => {
      container.setItem(5, undefined);
    });
    container.setItem(5, stone(1));
    poll(host);
    poll(host);

    expect(onInsert).toHaveBeenCalledTimes(1);
    expect(onRemove).not.toHaveBeenCalled();
  });

  it('traces a removal to the viewer who gained the item since the last poll', () => {
    const first = createPlayer('p1');
    const second = createPlayer('p2');
    const { container, host } = rig(first, second);

    container.setItem(5, stone(2));
    resync(container, host.watch, [5]);
    // A quiet poll records what each viewer carries; the take is read against it.
    poll(host);
    lift(container, 5, second);
    poll(host);

    expect(onRemove.mock.calls[0]?.[0]?.player).toBe(second.player);
    expect(onRemove.mock.calls[0]?.[0]?.host).toBe(HOST);
  });

  it('traces an insert to the viewer who lost the item, and never marks the item', () => {
    const first = createPlayer('p1');
    const second = createPlayer('p2');
    const { container, host } = rig(first, second);

    second.inventory.setItem(0, stone(5));
    poll(host);
    second.inventory.setItem(0, stone(2));
    container.setItem(5, stone(3));
    poll(host);

    expect(onInsert.mock.calls[0]?.[0]?.player).toBe(second.player);
    expect(container.getItem(5)?.getDynamicPropertyIds?.() ?? []).toEqual([]);
  });

  it('falls back to the first viewer when no viewer\'s side changed', () => {
    const first = createPlayer('p1');
    const second = createPlayer('p2');
    const { container, host } = rig(first, second);

    poll(host);
    container.setItem(5, stone(3));
    poll(host);

    expect(onInsert.mock.calls[0]?.[0]?.player).toBe(first.player);
  });
});

describe('a session’s housekeeping', () => {
  it('sweeps every owned item off a player, and nothing else', () => {
    const viewer = createPlayer('p1');

    viewer.inventory.setItem(0, stone(3));
    viewer.inventory.setItem(1, transport());
    viewer.cursor.hold(transport());
    sweep(viewer.player);

    expect(viewer.inventory.getItem(0)?.amount).toBe(3);
    expect(viewer.inventory.getItem(1)).toBeUndefined();
    expect(viewer.cursor.item).toBeUndefined();
  });

  it('retrieves from whichever viewer holds the item', () => {
    const first = createPlayer('p1');
    const second = createPlayer('p2');

    second.inventory.setItem(2, stone(3));

    expect(retrieve([first.player, second.player], stone(3))).toBe(second.player);
    expect(second.inventory.getItem(2)).toBeUndefined();
    expect(retrieve([first.player, second.player], stone(3))).toBeUndefined();
  });

  it('does nothing without a viewer', () => {
    const { container, host } = rig();

    container.setItem(2, undefined);
    poll(host);

    expect(onPress).not.toHaveBeenCalled();
  });
});

describe('handler guards', () => {
  it('never hands a handler a player who is no longer valid', () => {
    const viewer = createPlayer('p1');
    const { container, host } = rig(viewer);

    (viewer.player as unknown as { isValid: boolean }).isValid = false;
    lift(container, 2, viewer);
    poll(host);

    expect(onPress).not.toHaveBeenCalled();
  });

  it('never hands a handler an entity that is no longer valid', () => {
    const viewer = createPlayer('p1');
    const { container, host } = rig(viewer);
    const dead = { ...host, host: { typeId: 'core:test', isValid: false } as unknown as Entity };

    lift(container, 2, viewer);
    poll(dead);

    expect(onPress).not.toHaveBeenCalled();

    container.setItem(5, stone(2));
    poll(dead);

    expect(onInsert).not.toHaveBeenCalled();
  });
});

describe('an output slot under a late click', () => {
  it('reverses a swap over the guard rather than taking it for a machine write', () => {
    const viewer = createPlayer('p1');
    const { container, host } = rig(viewer);

    // The client still drew the result it last saw; the click landed after the
    // guard was restored and swapped: the player's item in, the guard out.
    viewer.cursor.hold(guard());
    container.setItem(4, stone(1));
    poll(host);

    const restored = container.getItem(4);

    expect(restored !== undefined && isGuard(restored)).toBe(true);
    expect(viewer.cursor.item).toBeUndefined();
    expect(viewer.inventory.getItem(0)?.typeId).toBe('minecraft:stone');
    expect(onTake).not.toHaveBeenCalled();
  });

  it('lets a machine write stand when no viewer holds the guard', () => {
    const viewer = createPlayer('p1');
    const { container, host } = rig(viewer);

    container.setItem(4, stone(1));
    poll(host);

    expect(container.getItem(4)?.typeId).toBe('minecraft:stone');
    expect(viewer.inventory.getItem(0)).toBeUndefined();
  });
});
