import {
  type Container, type ContainerSlot, type Entity, EntityComponentTypes, ItemLockMode,
  type ItemStack, type RawMessage, type Vector3,
} from '@minecraft/server';

/**
 * The vanilla `Container`, named and masked.
 *
 * Every container this library hands out mirrors `@minecraft/server`'s
 * `Container` member for member, so there is one vocabulary to learn and the
 * engine's own documentation is the documentation. Two things are added:
 *
 *  - **Names.** Every slot parameter takes an index or a name the author
 *    assigned, so `getItem('output')` reaches the cell that declared that name
 *    and nobody counts container indices.
 *  - **Masking.** A view may own stacks of its own — a screen's markers, its
 *    routing key — and what the runtime placed is not the author's. A masked
 *    stack reads as an empty slot through every reader.
 *
 * `weight` and `containerRules` are the two members left off: a view over part
 * of a container has no honest answer for either.
 *
 * An absent or invalid container is the wrapper's problem, never the caller's:
 * `isValid` is false, `size` is 0, every reader answers empty and every writer
 * does nothing. An entity that died between the lookup and the call is a world
 * fact rather than a mistake.
 *
 * Nothing here touches the UI: it is entity API only, so entity logic with no
 * screen in sight can use it.
 */

/**
 * Slot names mapped to container indices. Declared once — as a literal at the
 * call, or as a shared const — and every name comes back typed.
 */
export type SlotLayout = Readonly<Record<string, number>>;

/** A dynamic property's value, as the engine stores one. */
type PropertyValue = boolean | number | string | Vector3;

/**
 * One slot of a {@link NamedContainer}: the vanilla `ContainerSlot`, plus the
 * name the author gave it.
 *
 * Readers answer for an empty slot rather than throwing, which is why `typeId`
 * is `string | undefined` where the engine's own slot declares `string`. A
 * masked stack reads as an empty slot too. Writers go straight to the
 * container and write whatever actually stands there.
 */
export interface NamedSlot<N extends string = never> {
  /** The name the author gave this slot, when they gave one. */
  readonly name: N | undefined;
  /**
   * The stack size, 0 when the slot reads empty. Assigning resizes the stack
   * in place instead of replacing it; a slot that reads empty has no stack to
   * resize, so assigning to one does nothing.
   */
  amount: number;
  readonly isStackable: boolean;
  readonly isValid: boolean;
  readonly maxAmount: number;
  readonly typeId: string | undefined;
  keepOnDeath: boolean;
  lockMode: ItemLockMode;
  nameTag: string | undefined;
  clearDynamicProperties(): void;
  getCanDestroy(): string[];
  getCanPlaceOn(): string[];
  getDynamicProperty(identifier: string): PropertyValue | undefined;
  getDynamicPropertyIds(): string[];
  getItem(): ItemStack | undefined;
  getLore(): string[];
  getTags(): string[];
  hasItem(): boolean;
  hasTag(tag: string): boolean;
  isStackableWith(itemStack: ItemStack): boolean;
  setCanDestroy(blockIdentifiers?: string[]): void;
  setCanPlaceOn(blockIdentifiers?: string[]): void;
  setDynamicProperty(identifier: string, value?: PropertyValue): void;
  setItem(itemStack?: ItemStack): void;
  setLore(loreList?: (RawMessage | string)[]): void;
}

/**
 * A container addressed by index or by name.
 *
 * `N` is the set of names the view declares, so a name it does not declare is
 * a compile error rather than an `undefined`.
 */
export interface NamedContainer<N extends string = never> {
  readonly emptySlotsCount: number;
  readonly isValid: boolean;
  readonly size: number;
  /** Every name the author gave, and the slot index it reaches. */
  readonly names: Readonly<Record<N, number>>;
  /**
   * Puts a stack in, topping up matching stacks before taking empty slots, and
   * answers with what did not fit.
   */
  addItem(itemStack: ItemStack): ItemStack | undefined;
  clearAll(): void;
  /** Whether any slot holds a stack that would stack with this one. */
  contains(itemStack: ItemStack): boolean;
  /** The first slot holding a stack that would stack with this one. */
  find(itemStack: ItemStack): number | undefined;
  /** The last slot holding a stack that would stack with this one. */
  findLast(itemStack: ItemStack): number | undefined;
  firstEmptySlot(): number | undefined;
  firstItem(): number | undefined;
  getItem(slot: number | N): ItemStack | undefined;
  getSlot(slot: number | N): NamedSlot<N>;
  /** Moves a slot's stack into a slot of another container. A masked slot moves nothing. */
  moveItem(fromSlot: number | N, toSlot: number | string, toContainer: ContainerSide): void;
  setItem(slot: number | N, itemStack?: ItemStack): void;
  /** Swaps two slots' stacks. A masked slot swaps nothing. */
  swapItems(slot: number | N, otherSlot: number | string, otherContainer: ContainerSide): void;
  /**
   * Moves a slot's stack into the slots of another container it fits, leaves
   * whatever did not fit where it was, and answers with it.
   */
  transferItem(fromSlot: number | N, toContainer: ContainerSide): ItemStack | undefined;
}

/** The other side of a move: the engine's own container, or another view over one. */
export type ContainerSide = Container | NamedContainer<string>;

/**
 * What a {@link NamedContainer} is built over: the container, the slots of it
 * the view exposes, what it hides, and what has to follow a write.
 */
export interface ContainerSource<N extends string = never> {
  /** The names the view declares, as view indices. */
  readonly names: Readonly<Record<N, number>>;
  /** The container behind the view, or nothing once it is gone. */
  open(): Container | undefined;
  /** How many slots the view has. */
  size(container: Container): number;
  /** The container index a view index reaches, or -1 when the view has no such slot. */
  map(container: Container, index: number): number;
  /** A stack the view must not show: its slot reads empty instead. */
  hidden?(itemStack: ItemStack): boolean;
  /** What a view index is left holding once emptied, for a slot that may not stand empty. */
  vacated?(index: number): ItemStack | undefined;
  /** Whether a bulk {@link NamedContainer.addItem} may fill a view index. */
  fillable?(index: number): boolean;
  /** Runs after a write, with the container index it landed on. */
  wrote?(container: Container, slot: number): void;
}

/** A container and the index behind one of a view's slots. */
interface Reached {
  readonly container: Container;
  readonly index: number;
}

/** What a view lends the other side of a move: where a slot leads, and how to fill it. */
interface Bridge {
  reach(slot: number | string): Reached | undefined;
  wrote(reached: Reached): void;
  add(itemStack: ItemStack): ItemStack | undefined;
}

/**
 * Every view built here, so the other side of a move resolves to the container
 * and index behind it rather than being written to blind.
 */
const bridges = new WeakMap<object, Bridge>();

/** Whether the other side of a move is one of these views rather than a plain container. */
const isNamed = (side: ContainerSide): side is NamedContainer<string> => bridges.has(side);

/**
 * Reads something the engine throws on once its container is invalid. A
 * container removed between the lookup and the read is a world fact rather
 * than a caller's mistake, so it reads as "nothing here".
 */
const readOr = <T>(read: () => T, fallback: T): T => {
  try {
    return read();
  } catch {
    return fallback;
  }
};

/** Whether a string is one of the names a view declares. */
const declares = <K extends string>(names: Readonly<Record<K, number>>, value: string): value is K =>
  Object.hasOwn(names, value);

/**
 * An empty name table, typed as the set of names a view declares.
 *
 * A view's names come from what the author wrote — a `<Slot name>`, a layout
 * literal — so the table is filled at runtime while its type is the name set
 * the caller stated. Prototype-less, so nothing inherited is ever mistaken for
 * a name.
 */
export const nameTable = <K extends string>(): Record<K, number> => Object.create(null);

/** A source over the whole of a container: every slot at its own index, nothing hidden. */
const wholeOf = <N extends string>(
  open: () => Container | undefined,
  names: Readonly<Record<N, number>>,
): ContainerSource<N> => ({
  names,
  open,
  size: (container: Container): number => container.size,
  map: (_container: Container, index: number): number => index,
});

/**
 * The other side of a move seen as a plain container, addressed by raw index.
 * Nothing reaches and nothing fits when there is no container at all.
 */
const plainBridge = (container: Container | undefined): Bridge => ({
  reach: (slot: number | string): Reached | undefined =>
    (container !== undefined
      && typeof slot === 'number' && Number.isInteger(slot)
      && slot >= 0 && slot < readOr(() => container.size, 0)
      ? { container, index: slot }
      : undefined),
  wrote: (): void => undefined,
  add: (itemStack: ItemStack): ItemStack | undefined =>
    (container === undefined ? itemStack : container.addItem(itemStack)),
});

/** The bridge the other side of a move lends: its own when it is a view, one built over it when it is not. */
const bridgeOf = (side: ContainerSide): Bridge =>
  bridges.get(side) ?? plainBridge(isNamed(side) ? undefined : side);

/**
 * Wraps a container as a {@link NamedContainer}.
 *
 * The source decides which slots the view has, what it hides and what follows
 * a write; the whole vanilla surface is answered from those few facts, so an
 * entity's whole inventory and a screen's own cells are the one wrapper.
 */
export const namedContainer = <N extends string = never>(source: ContainerSource<N>): NamedContainer<N> => {
  const names: Readonly<Record<string, number>> = source.names;
  let namesByIndex: Map<number, N> | undefined;

  const open = (): Container | undefined => {
    const container = readOr(() => source.open(), undefined);

    return container === undefined || !readOr(() => container.isValid, false) ? undefined : container;
  };

  const length = (container: Container): number => readOr(() => source.size(container), 0);

  const size = (): number => {
    const container = open();

    return container === undefined ? 0 : length(container);
  };

  /** The view index a name or a raw index addresses, or -1 for neither. */
  const viewIndex = (slot: number | string): number => {
    if (typeof slot === 'number') {
      return Number.isInteger(slot) && slot >= 0 ? slot : -1;
    }

    return names[slot] ?? -1;
  };

  /** The name the view gave an index, when it gave one. */
  const nameAt = (index: number): N | undefined => {
    if (namesByIndex === undefined) {
      namesByIndex = new Map<number, N>();

      for (const [name, at] of Object.entries(names)) {
        if (declares(source.names, name)) {
          namesByIndex.set(at, name);
        }
      }
    }

    return namesByIndex.get(index);
  };

  /** The container and index a view index reaches right now, or nothing. */
  const reachAt = (index: number): Reached | undefined => {
    const container = open();

    if (container === undefined || index < 0 || index >= length(container)) {
      return undefined;
    }

    const slot = readOr(() => source.map(container, index), -1);

    return slot < 0 ? undefined : { container, index: slot };
  };

  /** What the view shows at a container index: whatever it hides is not there. */
  const shown = (at: Reached): ItemStack | undefined => {
    const stack = readOr(() => at.container.getItem(at.index), undefined);

    return stack !== undefined && source.hidden?.(stack) === true ? undefined : stack;
  };

  /** What the view shows at a view index. */
  const shownAt = (index: number): ItemStack | undefined => {
    const at = reachAt(index);

    return at === undefined ? undefined : shown(at);
  };

  /**
   * Puts a stack at a view index, or empties it. A slot that may not stand
   * empty is left holding whatever the view says it must, so emptying a
   * screen's result cell restores its marker in the same call.
   */
  const put = (index: number, itemStack: ItemStack | undefined): void => {
    const at = reachAt(index);

    if (at === undefined) {
      return;
    }

    at.container.setItem(at.index, itemStack ?? source.vacated?.(index));
    source.wrote?.(at.container, at.index);
  };

  /** Runs a write against the engine's own slot handle, then settles the view. */
  const write = (index: number, run: (handle: ContainerSlot) => void): void => {
    const at = reachAt(index);

    if (at === undefined) {
      return;
    }

    run(at.container.getSlot(at.index));
    source.wrote?.(at.container, at.index);
  };

  const slotAt = (index: number): NamedSlot<N> => {
    const item = (): ItemStack | undefined => shownAt(index);

    return {
      name: nameAt(index),

      get amount(): number {
        return item()?.amount ?? 0;
      },

      set amount(value: number) {
        if (item() !== undefined) {
          write(index, (handle) => {
            handle.amount = value;
          });
        }
      },

      get isStackable(): boolean {
        return item()?.isStackable ?? false;
      },

      get isValid(): boolean {
        return reachAt(index) !== undefined;
      },

      get maxAmount(): number {
        return item()?.maxAmount ?? 0;
      },

      get typeId(): string | undefined {
        return item()?.typeId;
      },

      get keepOnDeath(): boolean {
        return item()?.keepOnDeath ?? false;
      },

      set keepOnDeath(value: boolean) {
        write(index, (handle) => {
          handle.keepOnDeath = value;
        });
      },

      get lockMode(): ItemLockMode {
        return item()?.lockMode ?? ItemLockMode.none;
      },

      set lockMode(value: ItemLockMode) {
        write(index, (handle) => {
          handle.lockMode = value;
        });
      },

      get nameTag(): string | undefined {
        return item()?.nameTag;
      },

      set nameTag(value: string | undefined) {
        write(index, (handle) => {
          handle.nameTag = value;
        });
      },

      clearDynamicProperties: (): void => {
        write(index, (handle) => {
          handle.clearDynamicProperties();
        });
      },

      getCanDestroy: (): string[] => item()?.getCanDestroy() ?? [],
      getCanPlaceOn: (): string[] => item()?.getCanPlaceOn() ?? [],
      getDynamicProperty: (identifier: string): PropertyValue | undefined => item()?.getDynamicProperty(identifier),
      getDynamicPropertyIds: (): string[] => item()?.getDynamicPropertyIds() ?? [],
      getItem: (): ItemStack | undefined => item(),
      getLore: (): string[] => item()?.getLore() ?? [],
      getTags: (): string[] => item()?.getTags() ?? [],
      hasItem: (): boolean => item() !== undefined,
      hasTag: (tag: string): boolean => item()?.hasTag(tag) ?? false,
      isStackableWith: (itemStack: ItemStack): boolean => item()?.isStackableWith(itemStack) ?? false,

      setCanDestroy: (blockIdentifiers?: string[]): void => {
        write(index, (handle) => {
          handle.setCanDestroy(blockIdentifiers);
        });
      },

      setCanPlaceOn: (blockIdentifiers?: string[]): void => {
        write(index, (handle) => {
          handle.setCanPlaceOn(blockIdentifiers);
        });
      },

      setDynamicProperty: (identifier: string, value?: PropertyValue): void => {
        write(index, (handle) => {
          handle.setDynamicProperty(identifier, value);
        });
      },

      setItem: (itemStack?: ItemStack): void => {
        put(index, itemStack);
      },

      setLore: (loreList?: (RawMessage | string)[]): void => {
        write(index, (handle) => {
          handle.setLore(loreList);
        });
      },
    };
  };

  /** The first view index the match answers for, walking from either end. */
  const search = (match: (stack: ItemStack) => boolean, fromEnd: boolean): number | undefined => {
    const count = size();

    for (let step = 0; step < count; step += 1) {
      const index = fromEnd ? count - 1 - step : step;
      const stack = shownAt(index);

      if (stack !== undefined && match(stack)) {
        return index;
      }
    }

    return undefined;
  };

  /** The view indices a bulk add may fill, in view order. */
  const fillable = (): number[] => {
    const indices: number[] = [];

    for (let index = 0; index < size(); index += 1) {
      if (source.fillable?.(index) !== false) {
        indices.push(index);
      }
    }

    return indices;
  };

  const view: NamedContainer<N> = {
    names: source.names,

    get emptySlotsCount(): number {
      let empty = 0;

      for (let index = 0; index < size(); index += 1) {
        if (shownAt(index) === undefined) {
          empty += 1;
        }
      }

      return empty;
    },

    get isValid(): boolean {
      return open() !== undefined;
    },

    get size(): number {
      return size();
    },

    addItem(itemStack: ItemStack): ItemStack | undefined {
      const indices = fillable();
      let remaining = itemStack.amount;

      for (const index of indices) {
        const standing = shownAt(index);

        if (standing === undefined || !standing.isStackableWith(itemStack) || standing.amount >= standing.maxAmount) {
          continue;
        }

        const fits = Math.min(standing.maxAmount - standing.amount, remaining);

        standing.amount += fits;
        remaining -= fits;
        put(index, standing);

        if (remaining === 0) {
          return undefined;
        }
      }

      for (const index of indices) {
        if (shownAt(index) !== undefined) {
          continue;
        }

        const placed = itemStack.clone();

        placed.amount = Math.min(itemStack.maxAmount, remaining);
        remaining -= placed.amount;
        put(index, placed);

        if (remaining === 0) {
          return undefined;
        }
      }

      const over = itemStack.clone();

      over.amount = remaining;

      return over;
    },

    clearAll(): void {
      for (let index = 0; index < size(); index += 1) {
        put(index, undefined);
      }
    },

    contains: (itemStack: ItemStack): boolean =>
      search(stack => stack.isStackableWith(itemStack), false) !== undefined,

    find: (itemStack: ItemStack): number | undefined => search(stack => stack.isStackableWith(itemStack), false),
    findLast: (itemStack: ItemStack): number | undefined => search(stack => stack.isStackableWith(itemStack), true),

    firstEmptySlot(): number | undefined {
      for (let index = 0; index < size(); index += 1) {
        if (shownAt(index) === undefined) {
          return index;
        }
      }

      return undefined;
    },

    firstItem: (): number | undefined => search(() => true, false),
    getItem: (slot: number | N): ItemStack | undefined => shownAt(viewIndex(slot)),
    getSlot: (slot: number | N): NamedSlot<N> => slotAt(viewIndex(slot)),

    moveItem(fromSlot: number | N, toSlot: number | string, toContainer: ContainerSide): void {
      const here = reachAt(viewIndex(fromSlot));
      const bridge = bridgeOf(toContainer);
      const there = bridge.reach(toSlot);

      if (here === undefined || there === undefined || shown(here) === undefined) {
        return;
      }

      here.container.moveItem(here.index, there.index, there.container);

      // The slot the stack left may be one that must never stand empty.
      const vacated = source.vacated?.(viewIndex(fromSlot));

      if (vacated !== undefined && shown(here) === undefined) {
        here.container.setItem(here.index, vacated);
      }

      source.wrote?.(here.container, here.index);
      bridge.wrote(there);
    },

    setItem(slot: number | N, itemStack?: ItemStack): void {
      put(viewIndex(slot), itemStack);
    },

    swapItems(slot: number | N, otherSlot: number | string, otherContainer: ContainerSide): void {
      const here = reachAt(viewIndex(slot));
      const bridge = bridgeOf(otherContainer);
      const there = bridge.reach(otherSlot);

      if (here === undefined || there === undefined || shown(here) === undefined) {
        return;
      }

      here.container.swapItems(here.index, there.index, there.container);
      source.wrote?.(here.container, here.index);
      bridge.wrote(there);
    },

    transferItem(fromSlot: number | N, toContainer: ContainerSide): ItemStack | undefined {
      const index = viewIndex(fromSlot);
      const stack = shownAt(index);

      if (stack === undefined) {
        return undefined;
      }

      const over = bridgeOf(toContainer).add(stack);

      put(index, over);

      return over;
    },
  };

  bridges.set(view, {
    reach: (slot: number | string): Reached | undefined => reachAt(viewIndex(slot)),
    wrote: (reached: Reached): void => source.wrote?.(reached.container, reached.index),
    add: (itemStack: ItemStack): ItemStack | undefined => view.addItem(itemStack),
  });

  return view;
};

/**
 * The entity's whole inventory, named by a layout.
 *
 * The component, its container and the entity's validity are all resolved
 * here, so a call site says what it means to do and nothing about what might
 * not be there:
 *
 * ```ts
 * const CELLS = { key: 0, input: 1, output: 6 };
 *
 * inventoryOf(host, CELLS).setItem('output', result);
 * ```
 */
export const inventoryOf = <const L extends SlotLayout = Record<never, number>>(
  entity: Entity,
  layout?: L,
): NamedContainer<keyof L & string> => {
  const names: Readonly<Record<keyof L & string, number>> = layout ?? nameTable();

  return namedContainer(wholeOf(
    () => readOr(
      () => (entity.isValid ? entity.getComponent(EntityComponentTypes.Inventory)?.container : undefined),
      undefined,
    ),
    names,
  ));
};
