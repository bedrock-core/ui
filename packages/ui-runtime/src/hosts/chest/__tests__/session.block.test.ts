import {
  type Block, BlockComponentTypes, type Container as EngineContainer, EntityComponentTypes,
  ItemStack, type Player,
} from '@minecraft/server';
import {
  afterEach, beforeEach, describe, expect, it, vi,
} from 'vitest';
import { Container as MockContainer, world } from '../../../__mocks__/@minecraft/server';
import { Button } from '../../../components/Button';
import { Container } from '../../../components/Container';
import { Text } from '../../../components/Text';
import { blockKey, blockOwner, getFibersForOwner } from '../../../core/fabric';
import { ContainerScreenError } from '../../../core/types';
import { useState } from '../../../hooks';
import type { JSX } from '../../../jsx';
import { CHARSET } from '../charset';
import { LAYOUT_PROPERTY, STATE_PROPERTY } from '../contract';
import { protocolItems } from '../runtime/items';
import { type ContainerScreen, createContainerScreen } from '../runtime/session';

/**
 * The block half of the container runtime.
 *
 * Everything a block screen does differently is in `target.ts`: it is keyed by
 * where it stands rather than by an id, it reads its layout key off a block
 * STATE, its container comes from the block-entity inventory component and its
 * state lives in the block-entity dynamic properties. What the session does
 * with those four facts is the entity path's, tested there — so what is checked
 * here is that each of the four reaches the same place, and that a block in an
 * unloaded chunk is treated as absent rather than cached as broken.
 */

/** One tick of the system shim, in fake-timer milliseconds. */
const TICK = 50;

const code = (glyph: string): number => CHARSET.indexOf(glyph) + 1;

const createContainer = (size: number): EngineContainer => new MockContainer(size) as unknown as EngineContainer;

const BLOCK_TYPE = 'core:test_block';

const items = protocolItems('core');

interface FakeBlock {
  readonly container: EngineContainer;
  readonly properties: Map<string, boolean | number | string>;
  readonly block: Block;
  /** An unloaded chunk: every component read throws, and the block reads as absent. */
  unload(): void;
  load(): void;
  invalidate(): void;
}

const createBlock = (
  location: { x: number; y: number; z: number },
  size: number,
  layout: number | undefined,
  typeId = BLOCK_TYPE,
): FakeBlock => {
  const container = createContainer(size);
  const properties = new Map<string, boolean | number | string>();
  let loaded = true;
  const dynamicProperties = {
    get: (key: string): boolean | number | string | undefined => properties.get(key),
    set: (key: string, value?: boolean | number | string): void => {
      if (value === undefined) {
        properties.delete(key);
      } else {
        properties.set(key, value);
      }
    },
    totalByteCount: (): number => 0,
  };
  const fake = {
    typeId,
    isValid: true,
    dimension: { id: 'minecraft:overworld' },
    location,
    x: location.x,
    y: location.y,
    z: location.z,
    permutation: {
      // The build stamps the key as the state's one STRING value.
      getAllStates: (): Record<string, boolean | number | string> =>
        (layout === undefined ? {} : { [LAYOUT_PROPERTY]: String(layout) }),
    },

    getComponent: (componentId: string): unknown => {
      if (!loaded) {
        throw new Error('LocationInUnloadedChunkError');
      }

      if (componentId === BlockComponentTypes.Inventory) {
        return { container };
      }

      return componentId === BlockComponentTypes.DynamicProperties ? dynamicProperties : undefined;
    },
  };

  return {
    container,
    properties,
    block: fake as unknown as Block,
    unload: (): void => {
      loaded = false;
    },
    load: (): void => {
      loaded = true;
    },
    invalidate: (): void => {
      fake.isValid = false;
    },
  };
};

interface FakePlayer {
  readonly id: string;
  readonly inventory: EngineContainer;
  readonly cursor: {
    readonly item: ItemStack | undefined;
    clear(): void;
    hold(stack: ItemStack | undefined): void;
  };
  readonly player: Player;
}

const createPlayer = (id: string): FakePlayer => {
  const inventory = createContainer(9);
  let held: ItemStack | undefined;
  const cursor = {
    get item(): ItemStack | undefined {
      return held?.clone();
    },
    clear: (): void => {
      held = undefined;
    },
    hold: (stack: ItemStack | undefined): void => {
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

const onPress = vi.fn();

/** A button and a four-cell readout: sentinel 0, button 1, channel 2-5. Size 6. */
const Workbench = (): JSX.Element => {
  const [count, setCount] = useState(0);

  return Container({
    block: BLOCK_TYPE,
    onOpen: vi.fn(),
    children: [
      Button({
        onPress: (event) => {
          onPress(event);
          setCount(value => value + 1);
        },
      }),
      Text({ maxLength: 4, children: `n ${count}` }),
    ],
  });
};

const SIZE = 6;

const interact = (target: FakeBlock, viewer: FakePlayer): void => {
  world.beforeEvents.playerInteractWithBlock.__emit({ cancel: false, player: viewer.player, block: target.block });
};

const closeFor = (target: FakeBlock, viewer: FakePlayer): void => {
  world.afterEvents.blockContainerClosed.__emit({ block: target.block, closeSource: { entity: viewer.player } });
};

/** Presses a button the way every input does: its transport is dropped, and the drop event names the player. */
const press = (target: FakeBlock, viewer: FakePlayer, slot: number): void => {
  const dropped = target.container.getItem(slot);

  target.container.setItem(slot, undefined);

  if (dropped !== undefined) {
    const entity = {
      typeId: 'minecraft:item',
      isValid: true,
      getComponent: (id: string): unknown => (id === EntityComponentTypes.Item ? { itemStack: dropped } : undefined),
    };

    world.afterEvents.entityItemDrop.__emit({ entity: viewer.player, items: [entity] });
  }
};

const stateOf = (target: FakeBlock): string | undefined => {
  const value = target.properties.get(STATE_PROPERTY);

  return typeof value === 'string' ? value : undefined;
};

let screen: ContainerScreen | undefined;
let error: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  vi.useFakeTimers();
  onPress.mockReset();
  error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
});

afterEach(() => {
  screen?.detach();
  screen = undefined;
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('a block-hosted screen', () => {
  it('reads the block off the screen and listens for the block events', () => {
    screen = createContainerScreen(Workbench);

    expect(screen.host).toEqual({ kind: 'block', type: BLOCK_TYPE });
    expect(world.beforeEvents.playerInteractWithBlock.__count).toBe(1);
    expect(world.afterEvents.blockContainerOpened.__count).toBe(1);
    expect(world.afterEvents.blockContainerClosed.__count).toBe(1);

    // The entity events belong to the other host; a block screen takes none.
    expect(world.beforeEvents.playerInteractWithEntity.__count).toBe(0);
    expect(world.afterEvents.entityContainerOpened.__count).toBe(0);

    screen.detach();
    screen = undefined;

    expect(world.beforeEvents.playerInteractWithBlock.__count).toBe(0);
    expect(world.afterEvents.blockContainerOpened.__count).toBe(0);
    expect(world.afterEvents.blockContainerClosed.__count).toBe(0);
  });

  it('refuses a `<Container>` that names both an entity and a block', () => {
    const Both = (): JSX.Element => Container({ entity: 'core:test', block: BLOCK_TYPE });

    expect(() => createContainerScreen(Both)).toThrow(ContainerScreenError);
    expect(() => createContainerScreen(Both)).toThrow(/names both an entity/);
  });

  it('names a block by what it is and where it stands', () => {
    const target = createBlock({ x: 12, y: 64, z: -3 }, SIZE, 7);

    expect(blockKey(target.block)).toBe(`${BLOCK_TYPE}@overworld 12,64,-3`);
    expect(blockOwner(target.block)).toMatchObject({ kind: 'block', id: `${BLOCK_TYPE}@overworld 12,64,-3` });
  });

  it('refuses to serve a screen that does not fit a block, naming the two ways out', () => {
    // 54 slots is the whole allocation, sentinel and bank included, so a live
    // string of 60 characters cannot ride a block.
    const Wide = (): JSX.Element => Container({
      block: BLOCK_TYPE,
      children: [Text({ maxLength: 60, children: 'x' })],
    });

    expect(() => createContainerScreen(Wide)).toThrow(ContainerScreenError);
    expect(() => createContainerScreen(Wide)).toThrow(/needs 61 container slots and a block holds 54/);
    expect(() => createContainerScreen(Wide)).toThrow(/host the[\s\S]*screen on an entity/);

    // The same screen on an entity is served without complaint.
    const Entity = (): JSX.Element => Container({
      entity: 'core:wide',
      children: [Text({ maxLength: 60, children: 'x' })],
    });

    expect(() => createContainerScreen(Entity).detach()).not.toThrow();
  });

  it('refuses a `<Container>` that names neither', () => {
    const Neither = (): JSX.Element => Container({});

    expect(() => createContainerScreen(Neither)).toThrow(/needs `entity` or `block`/);
  });

  it('populates the block container a tick after the interact', async () => {
    screen = createContainerScreen(Workbench);

    const target = createBlock({ x: 10, y: 64, z: -3 }, SIZE, 7);
    const viewer = createPlayer('p1');

    interact(target, viewer);

    expect(target.container.getItem(0)).toBeUndefined();

    await vi.advanceTimersByTimeAsync(TICK);

    expect(items.roleOf(target.container.getItem(0)!)).toBe('sentinel');
    expect(items.valueOf(target.container.getItem(0)!)).toBe(7);
    expect(items.isTransport(target.container.getItem(1)!)).toBe(true);
    expect([2, 3, 4, 5].map(slot => target.container.getItem(slot)?.amount)).toEqual([
      code('n'), code(' '), code('0'), 1,
    ]);

    // The state landed in the block entity's own dynamic properties.
    expect(stateOf(target)).toContain('[[0,0]]');
  });

  it('turns a press into state on the block, and hands the block to the handler', async () => {
    screen = createContainerScreen(Workbench);

    const target = createBlock({ x: 1, y: 2, z: 3 }, SIZE, 7);
    const viewer = createPlayer('p1');

    interact(target, viewer);
    await vi.advanceTimersByTimeAsync(TICK);

    press(target, viewer, 1);
    await vi.advanceTimersByTimeAsync(TICK);

    expect(onPress).toHaveBeenCalledTimes(1);
    expect(onPress.mock.calls[0]?.[0]?.host).toBe(target.block);
    expect(onPress.mock.calls[0]?.[0]?.player).toBe(viewer.player);
    expect(target.container.getItem(4)?.amount).toBe(code('1'));
    expect(stateOf(target)).toContain('[[0,1]]');

    const transport = target.container.getItem(1);

    expect(transport && items.isTransport(transport)).toBe(true);
    expect(error).not.toHaveBeenCalled();
  });

  it('keys a session by where the block stands, so two of them are two screens', async () => {
    screen = createContainerScreen(Workbench);

    const first = createBlock({ x: 0, y: 64, z: 0 }, SIZE, 7);
    const second = createBlock({ x: 0, y: 64, z: 1 }, SIZE, 7);
    const viewer = createPlayer('p1');

    interact(first, viewer);
    interact(second, viewer);
    await vi.advanceTimersByTimeAsync(TICK);

    press(first, viewer, 1);
    await vi.advanceTimersByTimeAsync(TICK);

    expect(stateOf(first)).toContain('[[0,1]]');
    expect(stateOf(second)).toContain('[[0,0]]');

    closeFor(first, viewer);
    closeFor(second, viewer);

    expect(getFibersForOwner(blockOwner(first.block))).toHaveLength(0);
    expect(getFibersForOwner(blockOwner(second.block))).toHaveLength(0);
  });

  it('hydrates the block\'s own state at the next open', async () => {
    screen = createContainerScreen(Workbench);

    const target = createBlock({ x: 4, y: 64, z: 4 }, SIZE, 7);
    const viewer = createPlayer('p1');

    interact(target, viewer);
    await vi.advanceTimersByTimeAsync(TICK);
    press(target, viewer, 1);
    await vi.advanceTimersByTimeAsync(TICK);
    closeFor(target, viewer);

    interact(target, viewer);
    await vi.advanceTimersByTimeAsync(TICK);

    expect(target.container.getItem(4)?.amount).toBe(code('1'));
  });

  it('opens from the after event too, for anything that skips the interact', async () => {
    screen = createContainerScreen(Workbench);

    const target = createBlock({ x: 9, y: 9, z: 9 }, SIZE, 7);
    const viewer = createPlayer('p1');

    world.afterEvents.blockContainerOpened.__emit({ block: target.block, openSource: { entity: viewer.player } });

    expect(items.roleOf(target.container.getItem(0)!)).toBe('sentinel');
  });

  it('leaves a block of another type alone', async () => {
    screen = createContainerScreen(Workbench);

    const target = createBlock({ x: 2, y: 2, z: 2 }, SIZE, 7, 'minecraft:chest');
    const viewer = createPlayer('p1');

    interact(target, viewer);
    world.afterEvents.blockContainerOpened.__emit({ block: target.block, openSource: { entity: viewer.player } });
    await vi.advanceTimersByTimeAsync(TICK * 2);

    expect(target.container.getItem(0)).toBeUndefined();
    expect(error).not.toHaveBeenCalled();
  });

  it('refuses a block the build stamped no layout state on', async () => {
    screen = createContainerScreen(Workbench);

    const target = createBlock({ x: 5, y: 5, z: 5 }, SIZE, undefined);
    const viewer = createPlayer('p1');

    interact(target, viewer);
    await vi.advanceTimersByTimeAsync(TICK * 2);

    expect(error).toHaveBeenCalledWith(expect.stringMatching(/core:ui_layout` block state[\s\S]*ui-compiler/));
    expect(target.container.getItem(0)).toBeUndefined();
  });

  it('refuses a block whose container does not match the screen', async () => {
    screen = createContainerScreen(Workbench);

    const target = createBlock({ x: 6, y: 6, z: 6 }, SIZE + 1, 7);
    const viewer = createPlayer('p1');

    interact(target, viewer);
    await vi.advanceTimersByTimeAsync(TICK * 2);

    expect(error).toHaveBeenCalledWith(expect.stringMatching(/7 container slots and its screen needs 6/));
    expect(error).toHaveBeenCalledWith(expect.stringMatching(/slot_count/));

    // The message names the block, not just its type: two of them may stand
    // in the same world with the same stamp.
    expect(error).toHaveBeenCalledWith(expect.stringContaining(`${BLOCK_TYPE}@overworld 6,6,6`));
  });

  it('treats an unloaded chunk as absent, and serves the block again once it is back', async () => {
    screen = createContainerScreen(Workbench);

    const target = createBlock({ x: 7, y: 7, z: 7 }, SIZE, 7);
    const viewer = createPlayer('p1');

    // Nothing is cached from the failure: a component read that throws is a
    // block that is not there right now, not a block that is broken forever.
    target.unload();
    interact(target, viewer);
    await vi.advanceTimersByTimeAsync(TICK * 2);

    expect(target.container.getItem(0)).toBeUndefined();
    expect(error).not.toHaveBeenCalled();

    target.load();
    interact(target, viewer);
    await vi.advanceTimersByTimeAsync(TICK);

    expect(items.roleOf(target.container.getItem(0)!)).toBe('sentinel');
  });

  it('ends the session when the chunk goes while the screen is open', async () => {
    screen = createContainerScreen(Workbench);

    const target = createBlock({ x: 8, y: 8, z: 8 }, SIZE, 7);
    const viewer = createPlayer('p1');

    interact(target, viewer);
    await vi.advanceTimersByTimeAsync(TICK);

    expect(getFibersForOwner(blockOwner(target.block)).length).toBeGreaterThan(0);

    target.unload();
    await vi.advanceTimersByTimeAsync(TICK * 2);

    expect(getFibersForOwner(blockOwner(target.block))).toHaveLength(0);
  });

  it('opens the block\'s own cells with nobody viewing', () => {
    screen = createContainerScreen(Workbench);

    const target = createBlock({ x: 3, y: 3, z: 3 }, SIZE, 7);

    // A button is not one of the screen's own cells, so this screen has none.
    expect(screen.container(target.block).size).toBe(0);
    expect(screen.container(target.block).isValid).toBe(true);

    target.invalidate();

    expect(screen.container(target.block).isValid).toBe(false);
  });
});
