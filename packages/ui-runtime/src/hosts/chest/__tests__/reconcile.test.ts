import { type Container as EngineContainer, ItemStack } from '@minecraft/server';
import { describe, expect, it, vi } from 'vitest';
import { Container as MockContainer } from '../../../__mocks__/@minecraft/server';
import { Button } from '../../../components/Button';
import { Container } from '../../../components/Container';
import { Slot } from '../../../components/Slot';
import { Text } from '../../../components/Text';
import type { JSX } from '../../../jsx';
import { allocate, type SlotEntry } from '../allocate';
import { buildContainerTree } from '../build';
import { protocolItemId } from '../contract';
import { protocolItems, BUTTON_STACK } from '../runtime/items';
import { buttonSlots, reconcile, writeButtons } from '../runtime/reconcile';

const items = protocolItems('core');
const TRANSPORT = protocolItemId('core', 'transport');

/** The mock container, typed as the engine's: that is what it stands in for at runtime. */
const createContainer = (size: number): EngineContainer => new MockContainer(size) as unknown as EngineContainer;

/** The sentinel slot, a button on, a button off, a real slot, and a two-cell label: size 6. */
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
  it('puts a transport in an enabled button and the guard in a disabled one', () => {
    const container = createContainer(4);

    writeButtons(container, [button(true, 1), button(false, 2)], items);

    const item = container.getItem(1);

    expect(item && items.isTransport(item)).toBe(true);
    expect(item?.typeId).toBe(TRANSPORT);
    expect(item?.nameTag).toBe(' ');
    // A disabled button is not empty: it holds the guard, so a shift-click
    // cannot auto-place into it.
    expect(items.isGuard(container.getItem(2)!)).toBe(true);
  });

  it('carries the look a button wears as its item\'s current durability, disabled or not', () => {
    const container = createContainer(4);
    const wearing = (enabled: boolean, slot: number, look: number): SlotEntry => ({ ...button(enabled, slot), look });

    writeButtons(container, [wearing(true, 1, 1), wearing(false, 2, 3)], items);

    expect(items.valueOf(container.getItem(1)!)).toBe(1);
    expect(container.getItem(1)?.amount).toBe(BUTTON_STACK);
    expect(items.isGuard(container.getItem(2)!)).toBe(true);
    expect(items.valueOf(container.getItem(2)!)).toBe(3);

    // A look that changes rewrites the item; a button drawn one way wears the first.
    writeButtons(container, [wearing(true, 1, 0), button(true, 2)], items);

    expect(items.valueOf(container.getItem(1)!)).toBe(0);
    expect(items.valueOf(container.getItem(2)!)).toBe(0);
    expect(items.isTransport(container.getItem(2)!)).toBe(true);
  });

  it('follows the flag as it changes, and costs nothing when it does not', () => {
    const container = createContainer(4);

    writeButtons(container, [button(true, 1)], items);

    const setItem = vi.spyOn(container, 'setItem');

    writeButtons(container, [button(true, 1)], items);

    expect(setItem).not.toHaveBeenCalled();

    writeButtons(container, [button(false, 1)], items);

    expect(items.isGuard(container.getItem(1)!)).toBe(true);

    writeButtons(container, [button(true, 1)], items);

    expect(container.getItem(1)?.typeId).toBe(TRANSPORT);
    expect(setItem).toHaveBeenCalledTimes(2);
  });

  it('names the button slots a render writes', () => {
    const { slots } = allocate(buildContainerTree(Screen));

    expect(buttonSlots(slots)).toEqual([1, 2]);
  });
});

describe('reconcile', () => {
  it('writes the sentinel with the layout key as its current durability', () => {
    const allocation = allocate(buildContainerTree(Screen));
    const container = createContainer(allocation.size);

    reconcile(container, allocation, 70, new Map(), items);

    const sentinel = container.getItem(0);

    expect(sentinel && items.roleOf(sentinel)).toBe('sentinel');
    expect(sentinel && items.valueOf(sentinel)).toBe(70);
    expect(sentinel?.amount).toBe(1);
  });

  it('settles every button and channel', () => {
    const allocation = allocate(buildContainerTree(Screen));
    const container = createContainer(allocation.size);
    const written = new Map<number, number>();

    reconcile(container, allocation, 1, written, items);

    expect(container.getItem(1)?.typeId).toBe(TRANSPORT);
    expect(items.isGuard(container.getItem(2)!)).toBe(true);
    expect(container.getItem(4)?.amount).toBeGreaterThan(1);
    expect(container.getItem(5)?.amount).toBeGreaterThan(1);
    expect([...written.keys()]).toEqual([4, 5]);
  });

  it('keeps a player’s item in a drawn slot and clears an owned one', () => {
    const allocation = allocate(buildContainerTree(Screen));
    const container = createContainer(allocation.size);

    container.setItem(3, new ItemStack('minecraft:stone', 12));
    reconcile(container, allocation, 1, new Map(), items);

    expect(container.getItem(3)?.typeId).toBe('minecraft:stone');
    expect(container.getItem(3)?.amount).toBe(12);

    container.setItem(3, items.transport());
    reconcile(container, allocation, 1, new Map(), items);

    expect(container.getItem(3)).toBeUndefined();
  });

  it('never clears the whole container', () => {
    const allocation = allocate(buildContainerTree(Screen));
    const container = createContainer(allocation.size + 2);
    const clearAll = vi.spyOn(container, 'clearAll');

    container.setItem(allocation.size, new ItemStack('minecraft:dirt', 1));
    container.setItem(allocation.size + 1, items.transport());
    reconcile(container, allocation, 1, new Map(), items);

    expect(clearAll).not.toHaveBeenCalled();
    expect(container.getItem(allocation.size)?.typeId).toBe('minecraft:dirt');
    expect(container.getItem(allocation.size + 1)?.typeId).toBe(TRANSPORT);
  });
});
