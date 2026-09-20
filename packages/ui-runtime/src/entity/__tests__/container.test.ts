import {
  type Container as EngineContainer, type Entity, EntityComponentTypes, ItemLockMode, ItemStack,
} from '@minecraft/server';
import { describe, expect, it } from 'vitest';
import { Container as MockContainer, __defineItemType } from '../../__mocks__/@minecraft/server';
import { inventoryOf } from '../container';

/** The chest host's shape: the routing key, an input cell and an output cell. */
const CELLS = { key: 0, input: 1, output: 6 };

/** A type carrying item tags, so a tag reader has something to answer with. */
const TAGGED = 'core:tagged';

__defineItemType(TAGGED, { maxAmount: 1, tags: ['minecraft:is_food'] });

/** The mock container, typed as the engine's: that is what it stands in for at runtime. */
const createContainer = (size: number): EngineContainer => new MockContainer(size) as unknown as EngineContainer;

/** An entity whose inventory component is there, or is not. */
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

describe('inventoryOf', () => {
  it('round-trips a slot by name and by index', () => {
    const container = createContainer(9);
    const inventory = inventoryOf(createEntity(container), CELLS);

    inventory.setItem('output', new ItemStack('minecraft:coal', 3));

    expect(inventory.getItem('output')?.typeId).toBe('minecraft:coal');
    expect(inventory.getItem('output')?.amount).toBe(3);
    expect(inventory.getSlot('output').typeId).toBe('minecraft:coal');
    expect(inventory.getSlot('output').hasItem()).toBe(true);

    // The same slot by index, and the index carries the name back.
    expect(inventory.getItem(6)?.typeId).toBe('minecraft:coal');
    expect(inventory.getSlot(6).name).toBe('output');
    expect(inventory.names).toEqual(CELLS);

    // The name is the only thing that moved: the container holds it at 6.
    expect(container.getItem(6)?.typeId).toBe('minecraft:coal');
    expect(inventory.getItem('input')).toBeUndefined();
    expect(inventory.size).toBe(9);
    expect(inventory.isValid).toBe(true);

    inventory.setItem('output');

    expect(inventory.getItem('output')).toBeUndefined();
  });

  it('resizes a stack in place, and does nothing to an empty slot', () => {
    const container = createContainer(9);
    const inventory = inventoryOf(createEntity(container), CELLS);
    const output = inventory.getSlot('output');

    output.setItem(new ItemStack('minecraft:paper', 1));
    output.amount = 40;

    expect(container.getItem(6)?.amount).toBe(40);
    expect(container.getItem(6)?.typeId).toBe('minecraft:paper');

    const input = inventory.getSlot('input');

    input.amount = 5;

    expect(input.getItem()).toBeUndefined();
    expect(input.amount).toBe(0);
  });

  it('mirrors the rest of the engine slot, reading and writing', () => {
    const container = createContainer(4);
    const inventory = inventoryOf(createEntity(container), CELLS);
    const slot = inventory.getSlot('input');

    slot.setItem(new ItemStack(TAGGED, 1));

    expect(slot.isStackable).toBe(false);
    expect(slot.isValid).toBe(true);
    expect(slot.maxAmount).toBe(1);
    expect(slot.getTags()).toEqual(['minecraft:is_food']);
    expect(slot.hasTag('minecraft:is_food')).toBe(true);
    expect(slot.hasTag('minecraft:planks')).toBe(false);
    expect(slot.isStackableWith(new ItemStack(TAGGED, 1))).toBe(true);

    slot.setLore(['§7bound']);
    slot.setDynamicProperty('core:bound', true);
    slot.setCanDestroy(['minecraft:dirt']);
    slot.setCanPlaceOn(['minecraft:stone']);
    slot.nameTag = 'Bound';
    slot.keepOnDeath = true;
    slot.lockMode = ItemLockMode.inventory;

    expect(slot.getLore()).toEqual(['§7bound']);
    expect(slot.getDynamicProperty('core:bound')).toBe(true);
    expect(slot.getDynamicPropertyIds()).toEqual(['core:bound']);
    expect(slot.getCanDestroy()).toEqual(['minecraft:dirt']);
    expect(slot.getCanPlaceOn()).toEqual(['minecraft:stone']);
    expect(slot.nameTag).toBe('Bound');
    expect(slot.keepOnDeath).toBe(true);
    expect(slot.lockMode).toBe(ItemLockMode.inventory);

    slot.clearDynamicProperties();

    expect(slot.getDynamicPropertyIds()).toEqual([]);
  });

  it('rejects a name the layout does not declare', () => {
    const inventory = inventoryOf(createEntity(createContainer(9)), CELLS);

    // @ts-expect-error 'outputt' is not one of the layout's names.
    expect(inventory.getItem('outputt')).toBeUndefined();

    const unnamed = inventoryOf(createEntity(createContainer(9)));

    // @ts-expect-error an inventory built without a layout names nothing.
    expect(unnamed.getItem('output')).toBeUndefined();
    expect(unnamed.names).toEqual({});
  });

  it('reads and writes nowhere when the entity has no inventory', () => {
    const inventory = inventoryOf(createEntity(undefined), CELLS);

    expect(inventory.isValid).toBe(false);
    expect(inventory.size).toBe(0);
    expect(inventory.emptySlotsCount).toBe(0);
    expect(inventory.firstItem()).toBeUndefined();
    expect(inventory.firstEmptySlot()).toBeUndefined();

    const output = inventory.getSlot('output');

    expect(output.isValid).toBe(false);
    expect(output.name).toBe('output');
    expect(output.hasItem()).toBe(false);
    expect(output.typeId).toBeUndefined();
    expect(output.amount).toBe(0);
    expect(output.maxAmount).toBe(0);
    expect(output.isStackable).toBe(false);
    expect(output.getLore()).toEqual([]);
    expect(output.getTags()).toEqual([]);
    expect(output.getDynamicProperty('core:bound')).toBeUndefined();
    expect(output.lockMode).toBe(ItemLockMode.none);
    expect(output.keepOnDeath).toBe(false);

    // Every write is a no-op rather than a throw, and reads back as empty.
    output.setItem(new ItemStack('minecraft:coal', 3));
    output.amount = 7;
    output.setLore(['§7bound']);
    output.setItem();
    inventory.clearAll();

    expect(output.getItem()).toBeUndefined();

    // Nothing fits in an inventory that is not there, so the stack comes back.
    const stack = new ItemStack('minecraft:coal', 3);

    expect(inventory.addItem(stack)?.amount).toBe(3);
  });

  it('treats an invalid container as no inventory', () => {
    const container = createContainer(9);

    container.getItem = (): undefined => {
      throw new Error('invalid container');
    };
    Object.defineProperty(container, 'isValid', { value: false });

    const inventory = inventoryOf(createEntity(container), CELLS);

    expect(inventory.isValid).toBe(false);
    expect(inventory.getItem('output')).toBeUndefined();
    expect(inventory.size).toBe(0);
  });

  it('treats an index outside the container as a slot that is not there', () => {
    const container = createContainer(9);
    const inventory = inventoryOf(createEntity(container), CELLS);

    for (const index of [9, 99, -1, 1.5]) {
      const slot = inventory.getSlot(index);

      expect(slot.isValid).toBe(false);
      expect(slot.getItem()).toBeUndefined();

      slot.setItem(new ItemStack('minecraft:coal', 1));

      expect(slot.getItem()).toBeUndefined();
    }

    // The write went nowhere: the container is still empty.
    expect(inventory.emptySlotsCount).toBe(9);
  });

  it('names a slot a layout points past the end of, and still writes nowhere', () => {
    const inventory = inventoryOf(createEntity(createContainer(3)), CELLS);
    const output = inventory.getSlot('output');

    expect(output.name).toBe('output');
    expect(output.isValid).toBe(false);

    output.setItem(new ItemStack('minecraft:coal', 1));

    expect(inventory.emptySlotsCount).toBe(3);
  });

  it('searches from either end, and reports the first item and the first gap', () => {
    const container = createContainer(4);
    const inventory = inventoryOf(createEntity(container), CELLS);
    const coal = new ItemStack('minecraft:coal', 1);

    inventory.setItem(2, coal);
    inventory.setItem(3, new ItemStack('minecraft:coal', 2));

    expect(inventory.find(coal)).toBe(2);
    expect(inventory.findLast(coal)).toBe(3);
    expect(inventory.contains(coal)).toBe(true);
    expect(inventory.contains(new ItemStack('minecraft:diamond', 1))).toBe(false);
    expect(inventory.find(new ItemStack('minecraft:diamond', 1))).toBeUndefined();
    expect(inventory.firstItem()).toBe(2);
    expect(inventory.firstEmptySlot()).toBe(0);
  });

  it('tops up before filling, and hands back what did not fit', () => {
    const container = createContainer(2);
    const inventory = inventoryOf(createEntity(container), CELLS);

    inventory.setItem(0, new ItemStack('minecraft:coal', 60));

    expect(inventory.addItem(new ItemStack('minecraft:coal', 10))).toBeUndefined();
    expect(container.getItem(0)?.amount).toBe(64);
    expect(container.getItem(1)?.amount).toBe(6);
    expect(inventory.emptySlotsCount).toBe(0);

    expect(inventory.addItem(new ItemStack('minecraft:paper', 1))?.amount).toBe(1);

    inventory.clearAll();

    expect(inventory.emptySlotsCount).toBe(2);
  });

  it('moves, swaps and transfers to a plain container and to another inventory', () => {
    const here = createContainer(9);
    const there = createContainer(3);
    const inventory = inventoryOf(createEntity(here), CELLS);
    const other = inventoryOf(createEntity(there));

    inventory.setItem('input', new ItemStack('minecraft:coal', 3));
    inventory.moveItem('input', 0, other);

    expect(other.getItem(0)?.amount).toBe(3);
    expect(inventory.getItem('input')).toBeUndefined();

    inventory.setItem('output', new ItemStack('minecraft:paper', 1));
    inventory.swapItems('output', 0, other);

    expect(inventory.getItem('output')?.typeId).toBe('minecraft:coal');
    expect(other.getItem(0)?.typeId).toBe('minecraft:paper');

    // The plain engine container is the other side just as readily.
    expect(inventory.transferItem('output', there)).toBeUndefined();
    expect(inventory.getItem('output')).toBeUndefined();
    expect(there.getItem(1)?.typeId).toBe('minecraft:coal');

    // An empty slot has nothing to move, so every one of them is a no-op.
    expect(inventory.transferItem('input', other)).toBeUndefined();
    inventory.moveItem('input', 2, other);
    inventory.swapItems('input', 2, other);

    expect(other.getItem(2)).toBeUndefined();
  });
});
