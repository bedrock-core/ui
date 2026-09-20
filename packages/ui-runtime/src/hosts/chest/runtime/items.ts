import { ItemComponentTypes, ItemStack } from '@minecraft/server';
import { MAX_CODE } from '../charset';
import { IDENTITY, PROTOCOL_ROLES, type ProtocolRole, protocolItemId } from '../contract';

/**
 * The items the runtime places, and how they are told apart from a player's.
 *
 * Each is a custom item the addon registers under its host's namespace (see
 * `protocolItemDefinitions`), so its TYPE alone says it is ours: no player can
 * hold one by any other route. Its current durability carries a value — the
 * layout key, a look — which a compiled screen reads straight off the slot.
 */

/**
 * The face of a `Container` the runtime reads and writes. An entity's
 * inventory and a player's are both one, which is what lets the same search
 * run over either.
 */
export interface ItemContainer {
  readonly size: number;
  getItem(slot: number): ItemStack | undefined;
  setItem(slot: number, stack?: ItemStack): void;
  getSlot(slot: number): { amount: number };
}

/**
 * How many items a button's slot holds, transports or guards. A press drops one
 * and the stack is topped up in place, so the slot is never empty and keeps its
 * item however fast the clicks come.
 */
export const BUTTON_STACK = 64;

/** One namespace's protocol items: how to make each, and how to recognise them. */
export interface ProtocolItems {
  /** Anything the runtime placed, wherever it turned up. */
  isOwned(stack: ItemStack): boolean;
  /** The item behind an enabled button. */
  isTransport(stack: ItemStack): boolean;
  /** The item behind a disabled button or an empty output slot. */
  isGuard(stack: ItemStack): boolean;
  /** A bank cell. */
  isCount(stack: ItemStack): boolean;
  /** Which of ours an item is, or undefined for a player's. */
  roleOf(stack: ItemStack): ProtocolRole | undefined;
  /** The sentinel, its current durability the layout key. */
  sentinel(layout: number): ItemStack;
  /** A button's stack of transports, wearing look `look`. */
  transport(look?: number): ItemStack;
  /** `amount` guards, wearing look `look`: one in an output slot, a stack in a disabled button's. */
  guard(look?: number, amount?: number): ItemStack;
  /** A bank cell: `amount` items, carrying `value` as its current durability. */
  count(amount: number, value?: number): ItemStack;
  /** The value an item carries: its current durability. */
  valueOf(stack: ItemStack): number;
}

/** Sets the current durability of a protocol item to `value`, counting down from its identity. */
const carry = (stack: ItemStack, role: ProtocolRole, value: number): ItemStack => {
  const durability = stack.getComponent(ItemComponentTypes.Durability);

  if (durability !== undefined) {
    durability.damage = IDENTITY[role] - value;
  }

  return stack;
};

const cache = new Map<string, ProtocolItems>();

/**
 * The protocol items of one namespace: the one its screen's host is declared
 * in, which is the one the build registered them under.
 */
export const protocolItems = (namespace: string): ProtocolItems => {
  const cached = cache.get(namespace);

  if (cached !== undefined) {
    return cached;
  }

  const ids = {
    sentinel: protocolItemId(namespace, 'sentinel'),
    transport: protocolItemId(namespace, 'transport'),
    guard: protocolItemId(namespace, 'guard'),
    count: protocolItemId(namespace, 'count'),
  } satisfies Record<ProtocolRole, string>;
  const roles = new Map<string, ProtocolRole>(PROTOCOL_ROLES.map(role => [ids[role], role]));

  /** A blank-named item of one role, so nothing about it shows on hover. */
  const make = (role: ProtocolRole, amount: number, value: number): ItemStack => {
    const stack = new ItemStack(ids[role], amount);

    stack.nameTag = ' ';

    return carry(stack, role, value);
  };

  const items: ProtocolItems = {
    isOwned: stack => roles.has(stack.typeId),
    isTransport: stack => stack.typeId === ids.transport,
    isGuard: stack => stack.typeId === ids.guard,
    isCount: stack => stack.typeId === ids.count,
    roleOf: stack => roles.get(stack.typeId),
    sentinel: layout => make('sentinel', 1, layout),
    transport: (look = 0) => make('transport', BUTTON_STACK, look),
    guard: (look = 0, amount = 1) => make('guard', amount, look),
    count: (amount, value = 0) => make('count', amount, value),

    valueOf: (stack) => {
      const durability = stack.getComponent(ItemComponentTypes.Durability);

      return durability === undefined ? 0 : durability.maxDurability - durability.damage;
    },
  };

  cache.set(namespace, items);

  return items;
};

/**
 * Writes one character cell.
 *
 * The cheap path, and the reason a string costs so little to update: the code
 * rides the stack size, which is a settable property, so it lands with ONE
 * native call and nothing allocated.
 */
export const writeCell = (container: ItemContainer, items: ProtocolItems, slot: number, code: number): void => {
  const amount = Math.max(1, Math.min(MAX_CODE, Math.round(code)));
  const item = container.getItem(slot);

  if (item !== undefined && items.isCount(item) && items.valueOf(item) === 0) {
    container.getSlot(slot).amount = amount;

    return;
  }

  container.setItem(slot, items.count(amount));
};

/** Writes one look cell: a single bank item whose current durability names the look worn. */
export const writeLook = (container: ItemContainer, items: ProtocolItems, slot: number, look: number): void => {
  container.setItem(slot, items.count(1, look));
};
