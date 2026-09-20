import {
  type Container as EngineContainer, type Entity, EntityComponentTypes, ItemStack,
} from '@minecraft/server';
import { describe, expect, it } from 'vitest';
import { Container as MockContainer } from '../../../__mocks__/@minecraft/server';
import { Button } from '../../../components/Button';
import { Container } from '../../../components/Container';
import { Slot } from '../../../components/Slot';
import { Text } from '../../../components/Text';
import { ContainerScreenError } from '../../../core/types';
import { inventoryOf } from '../../../entity';
import type { JSX } from '../../../jsx';
import { allocate } from '../allocate';
import { buildContainerTree } from '../build';
import { protocolItems } from '../runtime/items';
import { screenContainer } from '../runtime/view';
import { createWatch, resync, sameStack } from '../runtime/watch';

const items = protocolItems('core');

/** The mock container, typed as the engine's: that is what it stands in for at runtime. */
const createContainer = (size: number): EngineContainer => new MockContainer(size) as unknown as EngineContainer;

const createEntity = (container: EngineContainer | undefined): Entity => {
  const fake = {
    id: 'e1',
    typeId: 'core:test',
    isValid: true,
    getComponent: (componentId: string): unknown =>
      (componentId === EntityComponentTypes.Inventory && container ? { container } : undefined),
  };

  return fake as unknown as Entity;
};

/**
 * An input, a button, ordinary storage and a named output, plus a live label:
 * the sentinel takes 0, the cells 1–4 and the label the bank at 5–8.
 * The three own cells are therefore container 1, 3 and 4.
 */
const Screen = (): JSX.Element => Container({
  entity: 'core:test',
  children: [
    Slot({ role: 'input' }),
    Button({}),
    Slot({}),
    Slot({ name: 'output', role: 'output' }),
    Text({ maxLength: 4, children: 'hi' }),
  ],
});

const SIZE = 9;

/** An item that never stacks, so a fill takes one cell per unit. */
const UNSTACKABLE = 'minecraft:netherite_pickaxe';

/** A settled container: the output cell holds the guard, as the runtime leaves it. */
const settled = (): EngineContainer => {
  const container = createContainer(SIZE);

  container.setItem(4, items.guard());

  return container;
};

const rig = (container: EngineContainer | undefined = settled()) => {
  const { slots } = allocate(buildContainerTree(Screen));

  return { container, slots, cells: screenContainer(createEntity(container), slots, items) };
};

describe('a named slot', () => {
  it('carries its name into the allocation, and leaves every other cell unnamed', () => {
    const { slots } = allocate(buildContainerTree(Screen));

    expect(slots.map(entry => [entry.slot, entry.role, entry.name])).toEqual([
      [1, 'input', undefined],
      [2, 'button', undefined],
      [3, 'both', undefined],
      [4, 'output', 'output'],
    ]);
  });

  it('is refused on a foreign slot', () => {
    const Foreign = (): JSX.Element => Container({
      entity: 'core:test',
      children: Slot({ name: 'peek', collection: 'hotbar_items', index: 0 }),
    });

    expect(() => buildContainerTree(Foreign)).toThrow(ContainerScreenError);
    expect(() => buildContainerTree(Foreign)).toThrow(/cannot be combined with `collection`/);
  });

  it('is refused when two own slots share it', () => {
    const Twice = (): JSX.Element => Container({
      entity: 'core:test',
      children: [Slot({ name: 'result', role: 'output' }), Slot({ name: 'result' })],
    });

    expect(() => buildContainerTree(Twice)).toThrow(ContainerScreenError);
    expect(() => buildContainerTree(Twice)).toThrow(/both named "result"/);
  });

  it('lets two screens use the same name', () => {
    expect(() => buildContainerTree(Screen)).not.toThrow();
    expect(() => buildContainerTree(Screen)).not.toThrow();
  });
});

describe('the container over a screen own cells', () => {
  it('is the own slots in document order, and nothing else', () => {
    const { container, cells } = rig();

    expect(cells.size).toBe(3);
    expect(cells.isValid).toBe(true);

    cells.setItem(0, new ItemStack('minecraft:coal', 1));
    cells.setItem(1, new ItemStack('minecraft:paper', 2));

    // View 0 and 1 are container 1 and 3: the sentinel, the button slot and
    // the bank are not addressable through the view at all.
    expect(container.getItem(1)?.typeId).toBe('minecraft:coal');
    expect(container.getItem(3)?.typeId).toBe('minecraft:paper');
    expect(container.getItem(2)).toBeUndefined();
    expect(cells.getSlot(3).isValid).toBe(false);
  });

  it('reaches the named cell by name, and reports the view index back', () => {
    const { container, cells } = rig();

    cells.setItem('output', new ItemStack('minecraft:crafting_table', 1));

    expect(container.getItem(4)?.typeId).toBe('minecraft:crafting_table');
    expect(cells.names).toEqual({ output: 2 });
    expect(cells.getSlot(2).name).toBe('output');
    expect(cells.getSlot(0).name).toBeUndefined();
  });

  it('shows nothing where the runtime placed something, through every reader', () => {
    const { container, cells } = rig();

    // The guard in the output cell, and a transport a previous layout left
    // in an ordinary cell: both are the runtime's, so both read as empty.
    container.setItem(3, items.transport());

    const output = cells.getSlot('output');

    expect(cells.getItem('output')).toBeUndefined();
    expect(output.hasItem()).toBe(false);
    expect(output.typeId).toBeUndefined();
    expect(output.amount).toBe(0);
    expect(output.maxAmount).toBe(0);
    expect(output.isStackable).toBe(false);
    expect(output.getLore()).toEqual([]);
    expect(output.getTags()).toEqual([]);
    expect(output.getDynamicProperty('core:owned')).toBeUndefined();
    expect(cells.getItem(1)).toBeUndefined();
    expect(cells.emptySlotsCount).toBe(3);
    expect(cells.firstItem()).toBeUndefined();
    expect(cells.firstEmptySlot()).toBe(0);

    // The cell still holds the marker; it is the view that does not show it.
    expect(items.isGuard(container.getItem(4)!)).toBe(true);
  });

  it('puts the guard back the moment an output cell is emptied', () => {
    const { container, cells } = rig();

    cells.setItem('output', new ItemStack('minecraft:crafting_table', 1));
    cells.setItem('output');

    expect(items.isGuard(container.getItem(4)!)).toBe(true);
    expect(cells.getItem('output')).toBeUndefined();

    // An ordinary cell just empties.
    cells.setItem(0, new ItemStack('minecraft:coal', 1));
    cells.getSlot(0).setItem();

    expect(container.getItem(1)).toBeUndefined();
  });

  it('clears the screen own cells and leaves the rest of the container alone', () => {
    const { container, cells } = rig();

    container.setItem(0, items.sentinel(4));
    container.setItem(2, items.transport());
    container.setItem(5, new ItemStack('minecraft:paper', 7));
    cells.setItem(0, new ItemStack('minecraft:coal', 1));
    cells.setItem(1, new ItemStack('minecraft:coal', 1));
    cells.setItem('output', new ItemStack('minecraft:crafting_table', 1));

    cells.clearAll();

    expect(container.getItem(1)).toBeUndefined();
    expect(container.getItem(3)).toBeUndefined();
    expect(items.isGuard(container.getItem(4)!)).toBe(true);
    expect(items.valueOf(container.getItem(0)!)).toBe(4);
    expect(items.isTransport(container.getItem(2)!)).toBe(true);
    expect(container.getItem(5)?.amount).toBe(7);
  });

  it('fills the own cells in view order, topping up before taking an empty one', () => {
    const { container, cells } = rig();

    cells.setItem(0, new ItemStack('minecraft:coal', 60));

    expect(cells.addItem(new ItemStack('minecraft:coal', 10))).toBeUndefined();
    expect(container.getItem(1)?.amount).toBe(64);
    expect(container.getItem(3)?.amount).toBe(6);
  });

  it('never fills an output cell, and answers with what did not fit', () => {
    const { container, cells } = rig();
    const over = cells.addItem(new ItemStack(UNSTACKABLE, 3));

    // Two fillable cells take one each; the output cell is the screen's
    // result, so the third never lands there.
    expect(container.getItem(1)?.typeId).toBe(UNSTACKABLE);
    expect(container.getItem(3)?.typeId).toBe(UNSTACKABLE);
    expect(items.isGuard(container.getItem(4)!)).toBe(true);
    expect(over?.amount).toBe(1);
  });

  it('reads empty and writes nowhere once the entity has no container', () => {
    const { slots } = allocate(buildContainerTree(Screen));
    const cells = screenContainer(createEntity(undefined), slots, items);

    expect(cells.isValid).toBe(false);
    expect(cells.size).toBe(0);
    expect(cells.emptySlotsCount).toBe(0);
    expect(cells.getSlot('output').isValid).toBe(false);
    expect(cells.getItem('output')).toBeUndefined();
    expect(cells.addItem(new ItemStack('minecraft:coal', 1))?.amount).toBe(1);
    expect(() => {
      cells.clearAll();
    }).not.toThrow();
  });

  it('resizes a stack in place through the view', () => {
    const { container, cells } = rig();

    cells.setItem(0, new ItemStack('minecraft:coal', 4));
    cells.getSlot(0).amount = 9;

    expect(container.getItem(1)?.amount).toBe(9);
  });

  it('exposes the same cells with no names when the screen declares none', () => {
    const Unnamed = (): JSX.Element => Container({
      entity: 'core:test',
      children: [Slot({}), Slot({})],
    });
    const { slots } = allocate(buildContainerTree(Unnamed));
    const container = createContainer(4);
    const cells = screenContainer(createEntity(container), slots, items);

    cells.setItem(1, new ItemStack('minecraft:coal', 1));

    expect(cells.size).toBe(2);
    expect(cells.names).toEqual({});
    expect(cells.getSlot(0).name).toBeUndefined();
    expect(cells.getSlot(1).name).toBeUndefined();
    expect(cells.find(new ItemStack('minecraft:coal', 1))).toBe(1);
  });

  it('re-reads the session watch after every write, so a poll sees no player move', () => {
    const { slots } = allocate(buildContainerTree(Screen));
    const container = settled();
    const watch = createWatch();

    resync(container, watch, slots.map(entry => entry.slot));

    const cells = screenContainer(createEntity(container), slots, items, watch);

    cells.setItem(0, new ItemStack('minecraft:coal', 4));

    expect(sameStack(watch.held[1], container.getItem(1))).toBe(true);
    expect(watch.held[1]?.typeId).toBe('minecraft:coal');

    cells.getSlot(0).amount = 9;

    expect(sameStack(watch.held[1], container.getItem(1))).toBe(true);

    // Emptying the result cell settles it on the guard, watch included.
    cells.setItem('output', new ItemStack('minecraft:crafting_table', 1));
    cells.setItem('output');

    expect(sameStack(watch.held[4], container.getItem(4))).toBe(true);
  });

  it('moves and transfers between the screen cells and a plain container', () => {
    const { container, cells } = rig();
    const bag = createContainer(4);

    cells.setItem(0, new ItemStack('minecraft:coal', 2));
    cells.moveItem(0, 0, bag);

    expect(bag.getItem(0)?.amount).toBe(2);
    expect(container.getItem(1)).toBeUndefined();

    // A result leaving the output cell settles it back on the guard.
    cells.setItem('output', new ItemStack('minecraft:crafting_table', 1));
    cells.moveItem('output', 1, bag);

    expect(bag.getItem(1)?.typeId).toBe('minecraft:crafting_table');
    expect(items.isGuard(container.getItem(4)!)).toBe(true);

    // The guard is the runtime's, so the cell has nothing to move.
    cells.moveItem('output', 2, bag);

    expect(bag.getItem(2)).toBeUndefined();

    // Transferring INTO the cells goes through their own fill, so the result
    // cell is skipped and only the two fillable cells take anything.
    const carried = inventoryOf(createEntity(bag));

    carried.setItem(2, new ItemStack(UNSTACKABLE, 3));

    expect(carried.transferItem(2, cells)?.amount).toBe(1);
    expect(container.getItem(1)?.typeId).toBe(UNSTACKABLE);
    expect(container.getItem(3)?.typeId).toBe(UNSTACKABLE);
    expect(items.isGuard(container.getItem(4)!)).toBe(true);
  });
});
