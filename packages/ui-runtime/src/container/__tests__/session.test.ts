import {
  type Container as EngineContainer, type Entity, EntityComponentTypes, ItemStack, type Player,
} from '@minecraft/server';
import {
  afterEach, beforeEach, describe, expect, it, vi,
} from 'vitest';
import { Container as MockContainer, world } from '../../__mocks__/@minecraft/server';
import { Button } from '../../components/Button';
import { Container } from '../../components/Container';
import { Slot } from '../../components/Slot';
import { Text } from '../../components/Text';
import { entityOwner, getFibersForOwner } from '../../core/fabric';
import { ContainerScreenError } from '../../core/types';
import { useEffect, useState } from '../../hooks';
import type { JSX } from '../../jsx';
import { CHARSET } from '../charset';
import { LAYOUT_PROPERTY, OWNED_PROPERTY, PROTOCOL_ITEM, STATE_PROPERTY } from '../contract';
import { isGuard, isTransport } from '../items';
import { type ContainerScreen, createContainerScreen } from '../session';

/** One tick of the system shim, in fake-timer milliseconds. */
const TICK = 50;

const code = (glyph: string): number => CHARSET.indexOf(glyph) + 1;

/** The mock container, typed as the engine's: that is what it stands in for at runtime. */
const createContainer = (size: number): EngineContainer => new MockContainer(size) as unknown as EngineContainer;

interface FakeEntity {
  readonly id: string;
  readonly container: EngineContainer;
  readonly properties: Map<string, boolean | number | string>;
  readonly entity: Entity;
  invalidate(): void;
}

const createEntity = (id: string, size: number, layout: number | undefined, typeId = 'core:test'): FakeEntity => {
  const container = createContainer(size);
  const properties = new Map<string, boolean | number | string>();
  const fake = {
    id,
    typeId,
    isValid: true,
    getComponent: (componentId: string): unknown =>
      (componentId === EntityComponentTypes.Inventory ? { container } : undefined),
    getProperty: (identifier: string): number | undefined => (identifier === LAYOUT_PROPERTY ? layout : undefined),
    getDynamicProperty: (identifier: string): boolean | number | string | undefined => properties.get(identifier),
    setDynamicProperty: (identifier: string, value?: boolean | number | string): void => {
      if (value === undefined) {
        properties.delete(identifier);
      } else {
        properties.set(identifier, value);
      }
    },
  };

  return {
    id,
    container,
    properties,
    entity: fake as unknown as Entity,
    invalidate: (): void => {
      fake.isValid = false;
    },
  };
};

interface FakeCursor {
  readonly item: ItemStack | undefined;
  clear(): void;
  hold(stack: ItemStack | undefined): void;
}

interface FakePlayer {
  readonly id: string;
  readonly inventory: EngineContainer;
  readonly cursor: FakeCursor;
  readonly player: Player;
}

const createPlayer = (id: string): FakePlayer => {
  const inventory = createContainer(9);
  let held: ItemStack | undefined;
  const cursor: FakeCursor = {
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
  const fake = {
    id,
    name: id,
    typeId: 'minecraft:player',
    isValid: true,
    location: { x: 0, y: 0, z: 0 },
    dimension: { spawnItem: (): void => undefined },
    getComponent: (componentId: string): unknown => {
      if (componentId === EntityComponentTypes.Inventory) {
        return { container: inventory };
      }

      return componentId === EntityComponentTypes.CursorInventory ? cursor : undefined;
    },
  };

  return { id, inventory, cursor, player: fake as unknown as Player };
};

let effectRuns = 0;
let cleanups = 0;
const onInsert = vi.fn();

/**
 * A counter button, a button that goes dark after the first press, an input
 * slot, and a four-cell readout: slots 1, 2, 3 and 4–7, size 8.
 */
const Screen = (): JSX.Element => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    effectRuns += 1;

    return (): void => {
      cleanups += 1;
    };
  }, []);

  return Container({
    entity: 'core:test',
    children: [
      Button({ onPress: () => setCount(value => value + 1) }),
      Button({ enabled: count < 1 }),
      Slot({ role: 'input', onInsert }),
      Text({ maxLength: 4, children: `n ${count}` }),
    ],
  });
};

const SIZE = 8;

const interact = (target: FakeEntity, viewer: FakePlayer): void => {
  world.beforeEvents.playerInteractWithEntity.__emit({ cancel: false, player: viewer.player, target: target.entity });
};

const closeFor = (target: FakeEntity, viewer: FakePlayer): void => {
  world.afterEvents.entityContainerClosed.__emit({ entity: target.entity, closeSource: { entity: viewer.player } });
};

const stateOf = (target: FakeEntity): string | undefined => {
  const value = target.properties.get(STATE_PROPERTY);

  return typeof value === 'string' ? value : undefined;
};

/** Lifts the transport out of a button, the way a click does. */
const press = (target: FakeEntity, viewer: FakePlayer, slot: number): void => {
  viewer.cursor.hold(target.container.getItem(slot));
  target.container.setItem(slot, undefined);
};

let screen: ContainerScreen | undefined;
let error: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  vi.useFakeTimers();
  effectRuns = 0;
  cleanups = 0;
  onInsert.mockReset();
  error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
});

afterEach(() => {
  screen?.detach();
  screen = undefined;
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('createContainerScreen', () => {
  it('reads the entity off the screen and listens for it', () => {
    screen = createContainerScreen(Screen);

    expect(screen.entity).toBe('core:test');
    expect(world.beforeEvents.playerInteractWithEntity.__count).toBe(1);
    expect(world.afterEvents.entityContainerOpened.__count).toBe(1);
    expect(world.afterEvents.entityContainerClosed.__count).toBe(1);
    expect(world.afterEvents.playerSpawn.__count).toBe(1);

    screen.detach();
    screen = undefined;

    expect(world.beforeEvents.playerInteractWithEntity.__count).toBe(0);
    expect(world.afterEvents.entityContainerOpened.__count).toBe(0);
    expect(world.afterEvents.entityContainerClosed.__count).toBe(0);
    expect(world.afterEvents.playerSpawn.__count).toBe(0);
  });

  it('rejects a screen that breaks the container rules before anything is served', () => {
    const Bare = (): JSX.Element => Text({ children: 'no container' });

    expect(() => createContainerScreen(Bare)).toThrow(ContainerScreenError);
    expect(world.beforeEvents.playerInteractWithEntity.__count).toBe(0);
  });

  it('does not run effects for the build it validates with', () => {
    screen = createContainerScreen(Screen);

    expect(effectRuns).toBe(0);
  });
});

describe('a session', () => {
  it('populates the container a tick after the interact, before the screen opens', async () => {
    screen = createContainerScreen(Screen);

    const target = createEntity('e1', SIZE, 3);
    const viewer = createPlayer('p1');

    interact(target, viewer);

    expect(target.container.getItem(0)).toBeUndefined();

    await vi.advanceTimersByTimeAsync(TICK);

    const key = target.container.getItem(0);
    const first = target.container.getItem(1);

    expect(key?.typeId).toBe(PROTOCOL_ITEM);
    expect(first && isTransport(first)).toBe(true);
    expect(target.container.getItem(2)?.typeId).toBe(PROTOCOL_ITEM);
    expect(target.container.getItem(3)).toBeUndefined();
    expect([4, 5, 6, 7].map(slot => target.container.getItem(slot)?.amount)).toEqual([
      code('n'), code(' '), code('0'), 1,
    ]);
    expect(effectRuns).toBe(1);
    expect(stateOf(target)).toContain('[[0,0]]');
  });

  it('turns a press into state, channels, buttons and persistence within the tick', async () => {
    screen = createContainerScreen(Screen);

    const target = createEntity('e1', SIZE, 3);
    const viewer = createPlayer('p1');

    interact(target, viewer);
    await vi.advanceTimersByTimeAsync(TICK);

    press(target, viewer, 1);
    await vi.advanceTimersByTimeAsync(TICK);

    expect(viewer.cursor.item).toBeUndefined();
    expect(target.container.getItem(6)?.amount).toBe(code('1'));
    expect(isGuard(target.container.getItem(2)!)).toBe(true);

    const first = target.container.getItem(1);

    expect(first && isTransport(first)).toBe(true);
    expect(stateOf(target)).toContain('[[0,1]]');

    // Nothing left in flight: the next tick is quiet.
    await vi.advanceTimersByTimeAsync(TICK);

    expect(stateOf(target)).toContain('[[0,1]]');
    expect(target.container.getItem(6)?.amount).toBe(code('1'));
    expect(error).not.toHaveBeenCalled();
  });

  it('hands an insert to the component with the viewer and re-renders what it changed', async () => {
    screen = createContainerScreen(Screen);

    const target = createEntity('e1', SIZE, 3);
    const viewer = createPlayer('p1');

    interact(target, viewer);
    await vi.advanceTimersByTimeAsync(TICK);

    target.container.setItem(3, new ItemStack('minecraft:coal', 2));
    await vi.advanceTimersByTimeAsync(TICK);

    expect(onInsert).toHaveBeenCalledTimes(1);
    expect(onInsert.mock.calls[0]?.[0]).toBe(viewer.player);
    expect(onInsert.mock.calls[0]?.[1]?.typeId).toBe('minecraft:coal');
    expect(onInsert.mock.calls[0]?.[2]).toBe(target.entity);

    // An input slot keeps what it was given: the take is undone a tick later.
    viewer.cursor.hold(target.container.getItem(3));
    target.container.setItem(3, undefined);
    await vi.advanceTimersByTimeAsync(TICK);

    expect(target.container.getItem(3)?.typeId).toBe('minecraft:coal');
    expect(viewer.cursor.item).toBeUndefined();
  });

  it('runs effects while viewed, cleans up on the last close, and hydrates on the next open', async () => {
    screen = createContainerScreen(Screen);

    const target = createEntity('e1', SIZE, 3);
    const viewer = createPlayer('p1');
    const owner = entityOwner(target.entity);

    interact(target, viewer);
    await vi.advanceTimersByTimeAsync(TICK);
    press(target, viewer, 1);
    await vi.advanceTimersByTimeAsync(TICK);

    expect(getFibersForOwner(owner).length).toBeGreaterThan(0);

    closeFor(target, viewer);

    expect(cleanups).toBe(1);
    expect(getFibersForOwner(owner)).toHaveLength(0);

    // The interval is gone: a change in the container is nobody's business.
    press(target, viewer, 1);
    await vi.advanceTimersByTimeAsync(TICK * 3);

    expect(stateOf(target)).toContain('[[0,1]]');
    expect(viewer.cursor.item?.typeId).toBe(PROTOCOL_ITEM);

    viewer.cursor.clear();
    interact(target, viewer);
    await vi.advanceTimersByTimeAsync(TICK);

    expect(effectRuns).toBe(2);
    expect(target.container.getItem(6)?.amount).toBe(code('1'));
    expect(isGuard(target.container.getItem(2)!)).toBe(true);
  });

  it('keeps serving while any viewer remains, and sweeps the one who left', async () => {
    screen = createContainerScreen(Screen);

    const target = createEntity('e1', SIZE, 3);
    const first = createPlayer('p1');
    const second = createPlayer('p2');
    const owner = entityOwner(target.entity);

    interact(target, first);
    await vi.advanceTimersByTimeAsync(TICK);
    world.afterEvents.entityContainerOpened.__emit({ entity: target.entity, openSource: { entity: second.player } });

    expect(effectRuns).toBe(1);

    first.inventory.setItem(2, target.container.getItem(1));
    closeFor(target, first);

    expect(first.inventory.getItem(2)).toBeUndefined();
    expect(cleanups).toBe(0);
    expect(getFibersForOwner(owner).length).toBeGreaterThan(0);

    press(target, second, 1);
    await vi.advanceTimersByTimeAsync(TICK);

    expect(stateOf(target)).toContain('[[0,1]]');

    closeFor(target, second);

    expect(cleanups).toBe(1);
  });

  it('hears an effect that sets state on mount', async () => {
    const Eager = (): JSX.Element => {
      const [label, setLabel] = useState('a');

      useEffect(() => {
        setLabel('b');
      }, []);

      return Container({ entity: 'core:test', children: [Text({ maxLength: 1, children: label })] });
    };

    screen = createContainerScreen(Eager);

    const target = createEntity('e1', 2, 3);
    const viewer = createPlayer('p1');

    interact(target, viewer);
    await vi.advanceTimersByTimeAsync(TICK);

    expect(target.container.getItem(1)?.amount).toBe(code('b'));
    expect(stateOf(target)).toContain('[[0,"b"]]');
  });

  it('ends when the entity goes away', async () => {
    screen = createContainerScreen(Screen);

    const target = createEntity('e1', SIZE, 3);
    const viewer = createPlayer('p1');

    interact(target, viewer);
    await vi.advanceTimersByTimeAsync(TICK);

    target.invalidate();
    await vi.advanceTimersByTimeAsync(TICK);

    expect(cleanups).toBe(1);
    expect(getFibersForOwner(entityOwner(target.entity))).toHaveLength(0);
  });

  it('sweeps a returning player', () => {
    screen = createContainerScreen(Screen);

    const viewer = createPlayer('p1');

    viewer.inventory.setItem(0, new ItemStack('minecraft:stone', 1));
    viewer.inventory.setItem(1, new ItemStack(PROTOCOL_ITEM, 1));

    const escaped = new ItemStack(PROTOCOL_ITEM, 1);

    escaped.setDynamicProperty(OWNED_PROPERTY, true);
    viewer.inventory.setItem(2, escaped);
    world.afterEvents.playerSpawn.__emit({ initialSpawn: true, player: viewer.player });

    expect(viewer.inventory.getItem(0)?.typeId).toBe('minecraft:stone');
    expect(viewer.inventory.getItem(1)?.typeId).toBe(PROTOCOL_ITEM);
    expect(viewer.inventory.getItem(2)).toBeUndefined();
  });

  it('reports the snapshot when debugging', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    screen = createContainerScreen(Screen, { debug: true });

    const target = createEntity('e1', SIZE, 3);
    const viewer = createPlayer('p1');

    interact(target, viewer);
    await vi.advanceTimersByTimeAsync(TICK);

    expect(warn).toHaveBeenCalledWith(expect.stringMatching(/\[core\.ui\] open p1/));
    expect(warn).toHaveBeenCalledWith(expect.stringMatching(/p1: inv 0 item\(s\) cur -/));
  });
});

describe('refusing to serve', () => {
  it('an entity without a layout key', async () => {
    screen = createContainerScreen(Screen);

    const target = createEntity('e1', SIZE, undefined);
    const viewer = createPlayer('p1');

    interact(target, viewer);
    await vi.advanceTimersByTimeAsync(TICK * 2);

    expect(error).toHaveBeenCalledWith(expect.stringMatching(/core:ui_layout.*\n.*ui-compile/));
    expect(target.container.getItem(0)).toBeUndefined();
    expect(effectRuns).toBe(0);
  });

  it('an entity whose inventory does not match the screen', async () => {
    screen = createContainerScreen(Screen);

    const target = createEntity('e1', SIZE + 1, 3);
    const viewer = createPlayer('p1');

    interact(target, viewer);
    await vi.advanceTimersByTimeAsync(TICK * 2);

    expect(error).toHaveBeenCalledWith(expect.stringMatching(/9 inventory slots and its screen needs 8/));
    expect(target.container.getItem(0)).toBeUndefined();
    expect(getFibersForOwner(entityOwner(target.entity))).toHaveLength(0);
  });

  it('an entity of another type', async () => {
    screen = createContainerScreen(Screen);

    const target = createEntity('e1', SIZE, 3, 'core:other');
    const viewer = createPlayer('p1');

    interact(target, viewer);
    await vi.advanceTimersByTimeAsync(TICK * 2);

    expect(target.container.getItem(0)).toBeUndefined();
    expect(error).not.toHaveBeenCalled();
  });
});
