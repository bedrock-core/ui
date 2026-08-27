import { type Container as EngineContainer, ItemStack } from '@minecraft/server';
import { describe, expect, it, vi } from 'vitest';
import { Container as MockContainer } from '../../__mocks__/@minecraft/server';
import { Button } from '../../components/Button';
import { Container } from '../../components/Container';
import { Slot } from '../../components/Slot';
import { Text } from '../../components/Text';
import type { JSX } from '../../jsx';
import { allocate, type SlotEntry } from '../allocate';
import { buildContainerTree } from '../build';
import { PROTOCOL_ITEM, splitKey, TRANSPORT_ITEM } from '../contract';
import { isGuard, isOwned, isTransport, transport } from '../items';
import { buttonSlots, reconcile, writeButtons } from '../reconcile';

/** The mock container, typed as the engine's: that is what it stands in for at runtime. */
const createContainer = (size: number): EngineContainer => new MockContainer(size) as unknown as EngineContainer;

/** Two sentinel slots, a button on, a button off, a real slot, and a two-cell label: size 7. */
const Screen = (): JSX.Element => Container({
  entity: 'core:test',
  children: [
    Button({ onPress: () => undefined }),
    Button({ enabled: false }),
    Slot({}),
    Text({ maxLength: 2, children: 'ok' }),
  ],
});

const button = (enabled: boolean, slot: number): SlotEntry => ({
  element: Button({ enabled }),
  slot,
  role: 'button',
});

describe('writeButtons', () => {
  it('puts a transport in an enabled button and nothing in a disabled one', () => {
    const container = createContainer(4);

    writeButtons(container, [button(true, 1), button(false, 2)]);

    const item = container.getItem(1);

    expect(item && isTransport(item)).toBe(true);
    expect(item?.typeId).toBe(TRANSPORT_ITEM);
    expect(item?.nameTag).toBe(' ');
    // A disabled button is not empty: it holds the invisible placeholder, so a
    // shift-click cannot auto-place into it.
    expect(isGuard(container.getItem(2)!)).toBe(true);
  });

  it('follows the flag as it changes, and costs nothing when it does not', () => {
    const container = createContainer(4);

    writeButtons(container, [button(true, 1)]);

    const setItem = vi.spyOn(container, 'setItem');

    writeButtons(container, [button(true, 1)]);

    expect(setItem).not.toHaveBeenCalled();

    writeButtons(container, [button(false, 1)]);

    expect(isGuard(container.getItem(1)!)).toBe(true);

    writeButtons(container, [button(true, 1)]);

    expect(container.getItem(1)?.typeId).toBe(TRANSPORT_ITEM);
    expect(setItem).toHaveBeenCalledTimes(2);
  });

  it('does not count a player’s own block as a transport', () => {
    const container = createContainer(4);

    container.setItem(1, new ItemStack(TRANSPORT_ITEM, 1));
    writeButtons(container, [button(true, 1)]);

    const item = container.getItem(1);

    expect(item && isOwned(item)).toBe(true);
  });

  it('names the button slots a render writes', () => {
    const { slots } = allocate(buildContainerTree(Screen));

    expect(buttonSlots(slots)).toEqual([2, 3]);
  });
});

describe('reconcile', () => {
  it('writes the sentinel with the layout key in two stack sizes', () => {
    const allocation = allocate(buildContainerTree(Screen));
    const container = createContainer(allocation.size);

    reconcile(container, allocation, 70, new Map());

    const high = container.getItem(0);
    const low = container.getItem(1);

    expect(high?.typeId).toBe(PROTOCOL_ITEM);
    expect(low?.typeId).toBe(PROTOCOL_ITEM);
    expect(high && isOwned(high)).toBe(true);
    expect(low && isOwned(low)).toBe(true);
    expect([high?.amount, low?.amount]).toEqual([splitKey(70).high, splitKey(70).low]);
    expect([high?.amount, low?.amount]).toEqual([3, 8]);
  });

  it('settles every button and channel', () => {
    const allocation = allocate(buildContainerTree(Screen));
    const container = createContainer(allocation.size);
    const written = new Map<number, number>();

    reconcile(container, allocation, 1, written);

    expect(container.getItem(2)?.typeId).toBe(TRANSPORT_ITEM);
    expect(isGuard(container.getItem(3)!)).toBe(true);
    expect(container.getItem(5)?.amount).toBeGreaterThan(1);
    expect(container.getItem(6)?.amount).toBeGreaterThan(1);
    expect([...written.keys()]).toEqual([5, 6]);
  });

  it('keeps a player’s item in a drawn slot and clears an owned one', () => {
    const allocation = allocate(buildContainerTree(Screen));
    const container = createContainer(allocation.size);

    container.setItem(4, new ItemStack('minecraft:stone', 12));
    reconcile(container, allocation, 1, new Map());

    expect(container.getItem(4)?.typeId).toBe('minecraft:stone');
    expect(container.getItem(4)?.amount).toBe(12);

    container.setItem(4, transport());
    reconcile(container, allocation, 1, new Map());

    expect(container.getItem(4)).toBeUndefined();
  });

  it('never clears the whole container', () => {
    const allocation = allocate(buildContainerTree(Screen));
    const container = createContainer(allocation.size + 2);
    const clearAll = vi.spyOn(container, 'clearAll');

    container.setItem(allocation.size, new ItemStack('minecraft:dirt', 1));
    container.setItem(allocation.size + 1, transport());
    reconcile(container, allocation, 1, new Map());

    expect(clearAll).not.toHaveBeenCalled();
    expect(container.getItem(allocation.size)?.typeId).toBe('minecraft:dirt');
    expect(container.getItem(allocation.size + 1)?.typeId).toBe(TRANSPORT_ITEM);
  });
});
