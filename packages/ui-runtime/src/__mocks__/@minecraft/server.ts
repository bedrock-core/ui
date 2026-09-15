/**
 * Mock for @minecraft/server
 * Provides minimal implementation for testing purposes
 */

export class Player {
  private constructor() {
    // Mock player instance - private constructor to match real API
  }
}

/** Mirror of the engine enum, used by the input-lock util. Values are arbitrary. */
export enum InputPermissionCategory {
  Camera = 1,
  Movement = 2,
}

// ─── World events ────────────────────────────────────────────────────────────

/** A subscribable signal with a test-side `__emit` to fire it. */
export class MockSignal<T> {
  private readonly _callbacks = new Set<(event: T) => void>();

  get __count(): number {
    return this._callbacks.size;
  }

  subscribe(callback: (event: T) => void): (event: T) => void {
    this._callbacks.add(callback);

    return callback;
  }

  unsubscribe(callback: (event: T) => void): void {
    this._callbacks.delete(callback);
  }

  __emit(event: T): void {
    for (const callback of [...this._callbacks]) {
      callback(event);
    }
  }
}

/** Event shapes, loosely typed: a test hands in whatever the code under test reads. */
export interface PlayerInteractWithEntityBeforeEvent {
  cancel: boolean;
  readonly player: unknown;
  readonly target: unknown;
}

export interface EntityContainerOpenedAfterEvent {
  readonly entity: unknown;
  readonly openSource: { entity?: unknown };
}

export interface EntityContainerClosedAfterEvent {
  readonly entity: unknown;
  readonly closeSource: { entity?: unknown };
}

export interface PlayerSpawnAfterEvent {
  readonly initialSpawn: boolean;
  readonly player: unknown;
}

export interface EntitySpawnAfterEvent {
  readonly entity: unknown;
  readonly cause: string;
}

export interface PlayerLeaveAfterEvent {
  readonly playerId: string;
  readonly playerName: string;
}

class World {
  readonly beforeEvents = {
    playerInteractWithEntity: new MockSignal<PlayerInteractWithEntityBeforeEvent>(),
  };

  readonly afterEvents = {
    entityContainerOpened: new MockSignal<EntityContainerOpenedAfterEvent>(),
    entityContainerClosed: new MockSignal<EntityContainerClosedAfterEvent>(),
    playerSpawn: new MockSignal<PlayerSpawnAfterEvent>(),
    entitySpawn: new MockSignal<EntitySpawnAfterEvent>(),
    playerLeave: new MockSignal<PlayerLeaveAfterEvent>(),
    worldLoad: new MockSignal<Record<string, never>>(),
  };

  getAllPlayers(): Player[] {
    // Return a single mock player for testing
    return [Reflect.construct(Player, [])];
  }

  /** The engine's filtered read; the mock takes no options and answers the same one player. */
  getPlayers(): Player[] {
    return this.getAllPlayers();
  }
}

export const world = new World();

/**
 * Ticks per second used by the system shim to translate ticks into real time.
 * Defaults to Bedrock's 20 TPS; override with {@link __setTPS} in tests.
 */
export let TPS = 20;

/** Test helper: change the shim's TPS (and reset to 20 between tests). */
export function __setTPS(tps: number): void {
  TPS = tps;
}

const ticksToMs = (ticks: number): number => (ticks / TPS) * 1000;

/**
 * Shim of the `system` API backed by real timers. Tick-based scheduling is
 * converted to wall-clock time via {@link TPS}, so callbacks fire after the same
 * real delay the engine would produce (e.g. 1 tick ≈ 50ms at 20 TPS) instead of
 * resolving instantly.
 */
class System {
  private _nextId = 1;
  private readonly _handles = new Map<number, ReturnType<typeof setTimeout>>();

  run(callback: () => void): number {
    return this.runTimeout(callback, 1);
  }

  runTimeout(callback: () => void, ticks: number = 1): number {
    const id = this._nextId++;
    const handle = setTimeout(() => {
      this._handles.delete(id);
      callback();
    }, ticksToMs(ticks));

    this._handles.set(id, handle);

    return id;
  }

  runInterval(callback: () => void, ticks: number = 1): number {
    const id = this._nextId++;
    const handle = setInterval(callback, ticksToMs(ticks));

    this._handles.set(id, handle);

    return id;
  }

  clearRun(id: number): void {
    const handle = this._handles.get(id);

    if (handle !== undefined) {
      clearTimeout(handle);
      clearInterval(handle);
      this._handles.delete(id);
    }
  }

  waitTicks(ticks: number): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(resolve, ticksToMs(ticks));
    });
  }
}

export const system = new System();

// ─── Items and containers ────────────────────────────────────────────────────
// Enough of the item and container API for the container runtime to run
// against: stacks with lore, dynamic properties and durability, and a
// slot-addressed container. Tests type them as the engine's classes, since the
// alias makes these the classes at runtime.

/** Mirror of the engine enum: the entity components the container runtime reads. */
export enum EntityComponentTypes {
  CursorInventory = 'minecraft:cursor_inventory',
  Inventory = 'minecraft:inventory',
  Item = 'minecraft:item',
}

/** Mirror of the engine enum: the item components the container runtime reads. */
export enum ItemComponentTypes {
  Durability = 'minecraft:durability',
}

export enum ItemLockMode {
  inventory = 'inventory',
  none = 'none',
  slot = 'slot',
}

export interface ItemTypeShape {
  /** Stack limit. 1 makes the type unstackable, which is what lets it hold dynamic properties. */
  maxAmount: number;
  /** Present for damageable types. */
  maxDurability?: number;
}

const ITEM_TYPES = new Map<string, ItemTypeShape>([
  ['minecraft:netherite_pickaxe', { maxAmount: 1, maxDurability: 2031 }],
]);

/** Test helper: describe an item type. Unknown types stack to 64 and have no durability. */
export function __defineItemType(typeId: string, shape: ItemTypeShape): void {
  ITEM_TYPES.set(typeId, shape);
}

export class ItemDurabilityComponent {
  damage = 0;
  readonly maxDurability: number;

  constructor(maxDurability: number) {
    this.maxDurability = maxDurability;
  }
}

export class ItemStack {
  amount: number;
  readonly typeId: string;
  readonly maxAmount: number;
  nameTag?: string;
  lockMode: ItemLockMode = ItemLockMode.none;
  keepOnDeath = false;
  private _lore: string[] = [];
  private readonly _properties = new Map<string, boolean | number | string>();
  private readonly _durability: ItemDurabilityComponent | undefined;

  constructor(typeId: string, amount: number = 1) {
    const shape = ITEM_TYPES.get(typeId);

    this.typeId = typeId;
    this.maxAmount = shape?.maxAmount ?? 64;
    this.amount = amount;
    this._durability = shape?.maxDurability === undefined
      ? undefined
      : new ItemDurabilityComponent(shape.maxDurability);
  }

  get isStackable(): boolean {
    return this.maxAmount > 1;
  }

  clone(): ItemStack {
    const copy = new ItemStack(this.typeId, this.amount);

    copy.nameTag = this.nameTag;
    copy.lockMode = this.lockMode;
    copy.keepOnDeath = this.keepOnDeath;
    copy._lore = [...this._lore];

    for (const [key, value] of this._properties) {
      copy._properties.set(key, value);
    }

    if (copy._durability && this._durability) {
      copy._durability.damage = this._durability.damage;
    }

    return copy;
  }

  getLore(): string[] {
    return [...this._lore];
  }

  setLore(lore?: string[]): void {
    this._lore = lore ? [...lore] : [];
  }

  getDynamicProperty(identifier: string): boolean | number | string | undefined {
    return this._properties.get(identifier);
  }

  /** Throws for a stackable type, as the engine does. */
  setDynamicProperty(identifier: string, value?: boolean | number | string): void {
    if (this.isStackable) {
      throw new Error('Cannot set dynamic properties on stackable items');
    }

    if (value === undefined) {
      this._properties.delete(identifier);
    } else {
      this._properties.set(identifier, value);
    }
  }

  getComponent(componentId: string): ItemDurabilityComponent | undefined {
    return componentId === ItemComponentTypes.Durability ? this._durability : undefined;
  }
}

/** A live view of one container slot, the way the engine hands one out. */
export class ContainerSlot {
  private readonly _container: Container;
  private readonly _slot: number;

  constructor(container: Container, slot: number) {
    this._container = container;
    this._slot = slot;
  }

  get amount(): number {
    return this._container.getItem(this._slot)?.amount ?? 0;
  }

  /** Writes the stack size in place, without replacing the stack. */
  set amount(value: number) {
    this._container.__setAmount(this._slot, value);
  }

  get typeId(): string | undefined {
    return this._container.getItem(this._slot)?.typeId;
  }
}

/** A slot-addressed container. `getItem` returns a copy, as the engine's does. */
export class Container {
  readonly size: number;
  isValid = true;
  private readonly _items: (ItemStack | undefined)[];

  constructor(size: number) {
    this.size = size;
    this._items = new Array<ItemStack | undefined>(size).fill(undefined);
  }

  get emptySlotsCount(): number {
    return this._items.filter(item => item === undefined).length;
  }

  getItem(slot: number): ItemStack | undefined {
    return this._items[slot]?.clone();
  }

  setItem(slot: number, itemStack?: ItemStack): void {
    this._items[slot] = itemStack?.clone();
  }

  getSlot(slot: number): ContainerSlot {
    return new ContainerSlot(this, slot);
  }

  /** Puts the stack in the first empty slot. Returns what did not fit. */
  addItem(itemStack: ItemStack): ItemStack | undefined {
    const slot = this._items.findIndex(item => item === undefined);

    if (slot === -1) {
      return itemStack;
    }

    this.setItem(slot, itemStack);

    return undefined;
  }

  clearAll(): void {
    for (let slot = 0; slot < this.size; slot += 1) {
      this.setItem(slot, undefined);
    }
  }

  /** The in-place amount write behind `ContainerSlot.amount`, which replaces no stack. */
  __setAmount(slot: number, amount: number): void {
    const item = this._items[slot];

    if (item) {
      item.amount = amount;
    }
  }
}
