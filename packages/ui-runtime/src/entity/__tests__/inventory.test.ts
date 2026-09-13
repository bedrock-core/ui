import {
  type Container as EngineContainer, type Entity, EntityComponentTypes, ItemStack,
} from '@minecraft/server';
import { describe, expect, it } from 'vitest';
import { Container as MockContainer } from '../../__mocks__/@minecraft/server';
import { containerInventory, inventoryOf } from '../inventory';

/** The chest host's shape: the routing key, an input cell and an output cell. */
const CELLS = { key: 0, input: 1, output: 6 };

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
  it('round-trips a named slot', () => {
    const container = createContainer(9);
    const inventory = inventoryOf(createEntity(container), CELLS);

    inventory.slot('output').set(new ItemStack('minecraft:coal', 3));

    expect(inventory.slot('output').typeId).toBe('minecraft:coal');
    expect(inventory.slot('output').amount).toBe(3);
    expect(inventory.slot('output').holds('minecraft:coal')).toBe(true);
    expect(inventory.slot('output').isEmpty).toBe(false);

    // The same slot by index, and the index carries the name back.
    expect(inventory.at(6).typeId).toBe('minecraft:coal');
    expect(inventory.at(6).name).toBe('output');
    expect(inventory.at(6).index).toBe(6);

    // The name is the only thing that moved: the container holds it at 6.
    expect(container.getItem(6)?.typeId).toBe('minecraft:coal');
    expect(inventory.slot('input').isEmpty).toBe(true);

    inventory.slot('output').clear();

    expect(inventory.slot('output').get()).toBeUndefined();
  });

  it('resizes a stack in place, and does nothing to an empty slot', () => {
    const container = createContainer(9);
    const inventory = inventoryOf(createEntity(container), CELLS);
    const output = inventory.slot('output');

    output.set(new ItemStack('minecraft:paper', 1));
    output.amount = 40;

    expect(container.getItem(6)?.amount).toBe(40);
    expect(container.getItem(6)?.typeId).toBe('minecraft:paper');

    const input = inventory.slot('input');

    input.amount = 5;

    expect(input.get()).toBeUndefined();
    expect(input.amount).toBe(0);
  });

  it('rejects a name the layout does not declare', () => {
    const inventory = inventoryOf(createEntity(createContainer(9)), CELLS);

    // @ts-expect-error 'outputt' is not one of the layout's names.
    expect(() => inventory.slot('outputt')).not.toThrow();

    const unnamed = inventoryOf(createEntity(createContainer(9)));

    // @ts-expect-error an accessor built without a layout names nothing.
    expect(() => unnamed.slot('output')).not.toThrow();
  });

  it('reads and writes nowhere when the entity has no inventory', () => {
    const inventory = inventoryOf(createEntity(undefined), CELLS);

    expect(inventory.present).toBe(false);
    expect(inventory.size).toBe(0);
    expect(inventory.emptyCount).toBe(0);

    const output = inventory.slot('output');

    expect(output.exists).toBe(false);
    expect(output.name).toBe('output');
    expect(output.isEmpty).toBe(true);
    expect(output.typeId).toBeUndefined();
    expect(output.amount).toBe(0);
    expect(output.holds('minecraft:coal')).toBe(false);

    // Every write is a no-op rather than a throw, and reads back as empty.
    output.set(new ItemStack('minecraft:coal', 3));
    output.amount = 7;
    output.clear();
    inventory.clear();

    expect(output.get()).toBeUndefined();
    expect(inventory.first(() => true)).toBeUndefined();
    expect([...inventory]).toEqual([]);

    // Nothing fits in an inventory that is not there, so the stack comes back.
    const stack = new ItemStack('minecraft:coal', 3);

    expect(inventory.add(stack)).toBe(stack);
  });

  it('treats an invalid container as no inventory', () => {
    const container = createContainer(9);

    container.getItem = (): undefined => {
      throw new Error('invalid container');
    };
    Object.defineProperty(container, 'isValid', { value: false });

    expect(containerInventory(container, CELLS).present).toBe(false);
    expect(containerInventory(container, CELLS).slot('output').get()).toBeUndefined();
  });

  it('treats an index outside the container as a slot that is not there', () => {
    const container = createContainer(9);
    const inventory = inventoryOf(createEntity(container), CELLS);

    for (const index of [9, 99, -1, 1.5]) {
      const slot = inventory.at(index);

      expect(slot.exists).toBe(false);
      expect(slot.index).toBe(index);
      expect(slot.get()).toBeUndefined();

      slot.set(new ItemStack('minecraft:coal', 1));

      expect(slot.get()).toBeUndefined();
    }

    // The write went nowhere: the container is still empty.
    expect(inventory.emptyCount).toBe(9);
  });

  it('names a slot a layout points past the end of, and still writes nowhere', () => {
    const inventory = inventoryOf(createEntity(createContainer(3)), CELLS);
    const output = inventory.slot('output');

    expect(output.name).toBe('output');
    expect(output.exists).toBe(false);

    output.set(new ItemStack('minecraft:coal', 1));

    expect(inventory.emptyCount).toBe(3);
  });

  it('finds the first matching stack and iterates every slot', () => {
    const container = createContainer(4);
    const inventory = containerInventory(container, CELLS);

    inventory.at(2).set(new ItemStack('minecraft:coal', 1));
    inventory.at(3).set(new ItemStack('minecraft:paper', 2));

    expect(inventory.first(stack => stack.typeId === 'minecraft:paper')?.index).toBe(3);
    expect(inventory.first((_stack, slot) => slot.index > 0)?.index).toBe(2);
    expect(inventory.first(stack => stack.typeId === 'minecraft:diamond')).toBeUndefined();

    expect([...inventory].map(slot => slot.name)).toEqual(['key', 'input', undefined, undefined]);
    expect([...inventory].map(slot => slot.typeId)).toEqual([
      undefined, undefined, 'minecraft:coal', 'minecraft:paper',
    ]);
  });

  it('hands back what did not fit', () => {
    const inventory = containerInventory(createContainer(1), CELLS);
    const first = new ItemStack('minecraft:coal', 1);
    const second = new ItemStack('minecraft:paper', 1);

    expect(inventory.add(first)).toBeUndefined();
    expect(inventory.add(second)).toBe(second);
    expect(inventory.emptyCount).toBe(0);

    inventory.clear();

    expect(inventory.emptyCount).toBe(1);
  });
});
