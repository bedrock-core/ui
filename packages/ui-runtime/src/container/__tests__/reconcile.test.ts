import { type Container as EngineContainer, ItemComponentTypes, ItemStack } from '@minecraft/server';
import { describe, expect, it, vi } from 'vitest';
import { Container as MockContainer } from '../../__mocks__/@minecraft/server';
import { Button } from '../../components/Button';
import { Container } from '../../components/Container';
import { Slot } from '../../components/Slot';
import { Text } from '../../components/Text';
import type { JSX } from '../../jsx';
import { allocate, type SlotEntry } from '../allocate';
import { buildContainerTree } from '../build';
import { PROTOCOL_ITEM, TRANSPORT_ORDINAL } from '../contract';
import { isGuard, isOwned, isTransport, transport } from '../items';
import { buttonSlots, reconcile, writeButtons } from '../reconcile';

/** The mock container, typed as the engine's: that is what it stands in for at runtime. */
const createContainer = (size: number): EngineContainer => new MockContainer(size) as unknown as EngineContainer;

/** A button on, a button off, a real slot, and a two-cell label: size 6. */
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

const damageOf = (container: EngineContainer, slot: number): number | undefined =>
  container.getItem(slot)?.getComponent(ItemComponentTypes.Durability)?.damage;

describe('writeButtons', () => {
  it('puts a transport in an enabled button and nothing in a disabled one', () => {
    const container = createContainer(4);

    writeButtons(container, [button(true, 1), button(false, 2)]);

    const item = container.getItem(1);

    expect(item && isTransport(item)).toBe(true);
    expect(item?.typeId).toBe(PROTOCOL_ITEM);
    expect(item?.nameTag).toBe(' ');
    expect(damageOf(container, 1)).toBe(2031 - TRANSPORT_ORDINAL);
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

    expect(container.getItem(1)?.typeId).toBe(PROTOCOL_ITEM);
    expect(setItem).toHaveBeenCalledTimes(2);
  });

  it('does not count a player’s own tool as a transport', () => {
    const container = createContainer(4);

    container.setItem(1, new ItemStack(PROTOCOL_ITEM, 1));
    writeButtons(container, [button(true, 1)]);

    const item = container.getItem(1);

    expect(item && isOwned(item)).toBe(true);
  });

  it('names the button slots a render writes', () => {
    const { slots } = allocate(buildContainerTree(Screen));

    expect(buttonSlots(slots)).toEqual([1, 2]);
  });
});

describe('reconcile', () => {
  it('writes the sentinel with the layout key in its durability', () => {
    const allocation = allocate(buildContainerTree(Screen));
    const container = createContainer(allocation.size);

    reconcile(container, allocation, 7, new Map());

    const key = container.getItem(0);

    expect(key?.typeId).toBe(PROTOCOL_ITEM);
    expect(key && isOwned(key)).toBe(true);
    expect(damageOf(container, 0)).toBe(2031 - 7);
  });

  it('settles every button and channel', () => {
    const allocation = allocate(buildContainerTree(Screen));
    const container = createContainer(allocation.size);
    const written = new Map<number, number>();

    reconcile(container, allocation, 1, written);

    expect(container.getItem(1)?.typeId).toBe(PROTOCOL_ITEM);
    expect(isGuard(container.getItem(2)!)).toBe(true);
    expect(container.getItem(4)?.amount).toBeGreaterThan(1);
    expect(container.getItem(5)?.amount).toBeGreaterThan(1);
    expect([...written.keys()]).toEqual([4, 5]);
  });

  it('keeps a player’s item in a drawn slot and clears an owned one', () => {
    const allocation = allocate(buildContainerTree(Screen));
    const container = createContainer(allocation.size);

    container.setItem(3, new ItemStack('minecraft:stone', 12));
    reconcile(container, allocation, 1, new Map());

    expect(container.getItem(3)?.typeId).toBe('minecraft:stone');
    expect(container.getItem(3)?.amount).toBe(12);

    container.setItem(3, transport());
    reconcile(container, allocation, 1, new Map());

    expect(container.getItem(3)).toBeUndefined();
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
    expect(container.getItem(allocation.size + 1)?.typeId).toBe(PROTOCOL_ITEM);
  });
});
