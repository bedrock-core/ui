import { type Entity, EntityComponentTypes, type ItemStack } from '@minecraft/server';

/**
 * Slot-addressed inventory access, by name.
 *
 * An entity's container sits behind an optional component whose own container
 * is optional again, and every slot is a bare index — so three hops and an
 * unexplained number repeat at every call site. This resolves the hops once
 * and lets a layout name the indices, so `slot('output')` says what slot 6 is
 * and a misspelled name is a compile error rather than an `undefined`.
 *
 * An entity with no inventory is the accessor's problem, never the caller's:
 * an absent container yields an inventory of size 0 whose slots read empty and
 * whose writes do nothing, and {@link Inventory.present} is the one place that
 * fact is visible. A slot outside the container behaves the same way and says
 * so through {@link InventorySlot.exists} — an absent inventory is exactly the
 * case where every index is out of range, so the two answers are one answer.
 *
 * Nothing here touches the UI: it is entity API only, so entity logic with no
 * screen in sight can use it.
 */

/**
 * Slot names mapped to container indices. Declared once — as a literal at the
 * call, or as a shared const — and every name comes back typed.
 */
export type SlotLayout = Readonly<Record<string, number>>;

/**
 * The face of a `Container` this reads and writes. An entity's inventory, a
 * player's and a block's are all one, so the same accessor wraps any of them.
 */
export interface SlotContainer {
  readonly size: number;
  readonly emptySlotsCount: number;
  /** False once the container, or whatever holds it, is gone. */
  readonly isValid?: boolean;
  getItem(slot: number): ItemStack | undefined;
  setItem(slot: number, itemStack?: ItemStack): void;
  getSlot(slot: number): { amount: number };
  addItem(itemStack: ItemStack): ItemStack | undefined;
  clearAll(): void;
}

/** One slot of a container, addressed by index and carrying its layout name. */
export interface InventorySlot {
  /** The container index. */
  readonly index: number;
  /** The layout name for this index, when the layout gave it one. */
  readonly name: string | undefined;
  /**
   * Whether the container actually has this slot. False for an index past its
   * end, and for every index of an absent inventory.
   */
  readonly exists: boolean;
  readonly isEmpty: boolean;
  readonly typeId: string | undefined;
  /**
   * The stack size, 0 when the slot is empty. Assigning resizes the stack in
   * place instead of replacing it; an empty slot has no stack to resize, so
   * assigning to one does nothing.
   */
  amount: number;
  get(): ItemStack | undefined;
  set(itemStack?: ItemStack): void;
  clear(): void;
  holds(typeId: string): boolean;
}

/**
 * A container addressed by name and by index.
 *
 * `L` is the layout the accessor was built with, so `slot()` takes only names
 * that layout declares. Iterating yields every slot the container has, in
 * index order.
 */
export interface Inventory<L extends SlotLayout = Record<never, number>> {
  /**
   * Whether there is a container behind this at all. False for an entity with
   * no inventory component, for one the engine has already removed, and for an
   * invalid container — all of which read as an inventory of size 0 whose
   * writes do nothing.
   */
  readonly present: boolean;
  readonly size: number;
  /** How many slots are empty. 0 when there is no container. */
  readonly emptyCount: number;
  /** The slot the layout named. A name the layout does not declare is a compile error. */
  slot<K extends keyof L & string>(name: K): InventorySlot;
  /** The slot at a raw index, for code that genuinely has one. */
  at(index: number): InventorySlot;
  /** The first slot whose stack matches. */
  first(match: (itemStack: ItemStack, slot: InventorySlot) => boolean): InventorySlot | undefined;
  /** Puts a stack in the first slot it fits. Returns what did not fit. */
  add(itemStack: ItemStack): ItemStack | undefined;
  /** Empties every slot. */
  clear(): void;
  [Symbol.iterator](): IterableIterator<InventorySlot>;
}

/**
 * Reads something the engine throws on once its container is invalid. An
 * entity removed between the lookup and the read is a world fact rather than a
 * caller's mistake, so it reads as "nothing here".
 */
const readOr = <T>(read: () => T, fallback: T): T => {
  try {
    return read();
  } catch {
    return fallback;
  }
};

/** A slot the container does not have: reads empty, writes nowhere. */
const missing = (index: number, name: string | undefined): InventorySlot => ({
  index,
  name,
  exists: false,
  isEmpty: true,
  typeId: undefined,

  get amount(): number {
    return 0;
  },

  set amount(_value: number) {
    // No stack, so nothing to resize.
  },

  get: () => undefined,
  set: () => undefined,
  clear: () => undefined,
  holds: () => false,
});

/** A slot the container has. Every read goes to the container, so nothing goes stale. */
const live = (container: SlotContainer, index: number, name: string | undefined): InventorySlot => ({
  index,
  name,
  exists: true,

  get isEmpty(): boolean {
    return container.getItem(index) === undefined;
  },

  get typeId(): string | undefined {
    return container.getItem(index)?.typeId;
  },

  get amount(): number {
    return container.getItem(index)?.amount ?? 0;
  },

  set amount(value: number) {
    if (container.getItem(index) !== undefined) {
      container.getSlot(index).amount = value;
    }
  },

  get: () => container.getItem(index),
  set: (itemStack?: ItemStack) => container.setItem(index, itemStack),
  clear: () => container.setItem(index, undefined),
  holds: (typeId: string) => container.getItem(index)?.typeId === typeId,
});

/**
 * Wraps a container, named by a layout.
 *
 * Takes the container possibly-undefined on purpose: that is what the engine
 * hands back for anything that is gone, and absorbing it here is what keeps
 * the optional hops out of every caller.
 */
export const containerInventory = <const L extends SlotLayout = Record<never, number>>(
  container: SlotContainer | undefined,
  layout?: L,
): Inventory<L> => {
  const held = container?.isValid === false ? undefined : container;
  let names: Map<number, string> | undefined;

  const nameAt = (index: number): string | undefined => {
    names ??= new Map(Object.entries<number>(layout ?? {}).map(([name, slot]) => [slot, name]));

    return names.get(index);
  };

  const size = (): number => (held === undefined ? 0 : readOr(() => held.size, 0));

  const at = (index: number): InventorySlot =>
    (held !== undefined && Number.isInteger(index) && index >= 0 && index < size()
      ? live(held, index, nameAt(index))
      : missing(index, nameAt(index)));

  return {
    // Read live, so a container that goes invalid while the accessor is held
    // answers the same as one that was never there.
    get present(): boolean {
      return held !== undefined && held.isValid !== false;
    },

    get size(): number {
      return size();
    },

    get emptyCount(): number {
      return held === undefined ? 0 : readOr(() => held.emptySlotsCount, 0);
    },

    // A name the layout does not declare cannot reach this, so the lookup is
    // only ever undefined for an accessor built without a layout at all.
    slot: <K extends keyof L & string>(name: K): InventorySlot => at(layout?.[name] ?? -1),
    at,

    first: (match): InventorySlot | undefined => {
      for (let index = 0; index < size(); index += 1) {
        const slot = at(index);
        const itemStack = slot.get();

        if (itemStack !== undefined && match(itemStack, slot)) {
          return slot;
        }
      }

      return undefined;
    },

    // Nothing fits in a container that is not there, so the whole stack is
    // what did not fit.
    add: (itemStack: ItemStack): ItemStack | undefined =>
      (held === undefined ? itemStack : held.addItem(itemStack)),

    clear: (): void => {
      held?.clearAll();
    },

    * [Symbol.iterator](): IterableIterator<InventorySlot> {
      for (let index = 0; index < size(); index += 1) {
        yield at(index);
      }
    },
  };
};

/**
 * The entity's inventory, named by a layout.
 *
 * The component, its container and the entity's validity are all resolved
 * here, so a call site says what it means to do and nothing about what might
 * not be there:
 *
 * ```ts
 * const CELLS = { key: 0, input: 1, output: 6 };
 *
 * inventoryOf(host, CELLS).slot('output').set(result);
 * ```
 */
export const inventoryOf = <const L extends SlotLayout = Record<never, number>>(
  entity: Entity,
  layout?: L,
): Inventory<L> => containerInventory(
  readOr(
    () => (entity.isValid ? entity.getComponent(EntityComponentTypes.Inventory)?.container : undefined),
    undefined,
  ),
  layout,
);
