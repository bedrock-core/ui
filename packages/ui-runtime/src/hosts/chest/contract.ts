/**
 * What the compiled JSON UI and the runtime have to agree on.
 *
 * Every value here is baked into a layout at build time and written into a
 * container at runtime, so it lives in one place and both sides import it —
 * the ui-compiler filter bundles the project's own copy of this module, which
 * is what keeps a screen compiled against the runtime it ships with.
 *
 * The items the protocol rides are all vanilla BLOCKS from the legacy id
 * range. A compiled screen tells them apart by `#item_id_aux`, the item's
 * numeric id shifted by 16, and that number has to be the same in every
 * world the pack is installed in: custom items registered by any addon take
 * numeric ids from 256 upward and shift every vanilla item above them, so a
 * tool or any other item would change its id the moment another addon
 * shipped an item. Block ids below 256 are fixed and never move. Blocks stack
 * and have no durability, so what a block-based marker can carry is its stack
 * size — which is what the layout key rides, over two slots.
 */

import { ContainerScreenError } from '../../core/types';

/** The numeric id of a legacy-range block, as the engine publishes it through `#item_id_aux`. */
const aux = (id: number): number => id * 65536;

/**
 * The sentinel item, in the first two slots of a compiled screen's container.
 * Its id is the protocol key every compiled screen shares; the two stack
 * sizes are the layout key. Operator-only in vanilla, so no survival chest
 * ever carries one.
 */
export const PROTOCOL_ITEM = 'minecraft:command_block';
export const PROTOCOL_ITEM_AUX = aux(137);

/**
 * The item behind a button. A press reaches script only as the item leaving
 * its slot, and the item is never drawn: the compiled face hides it, and the
 * screen's own inventory grids hide a copy in flight.
 */
export const TRANSPORT_ITEM = 'minecraft:repeating_command_block';
export const TRANSPORT_ITEM_AUX = aux(188);

/**
 * An output slot's placeholder, the guard. It keeps the slot from ever being
 * empty, so a shift-click cannot auto-place into it, and the compiled output
 * cell swaps its whole cell for an empty fake while it sits there — nothing
 * rendered, nothing hoverable, no button to take it with.
 */
export const GUARD_ITEM = 'minecraft:chain_command_block';
export const GUARD_ITEM_AUX = aux(189);

/** Container indices carrying the routing keys, never drawn: the high half of the layout key, then the low. */
export const SENTINEL_SLOTS = [0, 1] as const;

/**
 * The stack sizes a sentinel half can take: 2..64. A stack of one publishes
 * no `#inventory_stack_count` at all — measured — so the smallest readable
 * size is two, and each half is stored two up.
 */
const KEY_FLOOR = 2;
const KEY_RADIX = 64 - KEY_FLOOR + 1;

/** Highest layout key a screen can be assigned. Keys run from 1. */
export const MAX_LAYOUT = KEY_RADIX * KEY_RADIX;

/** The two stack sizes a layout key is written as, high half first. */
export const splitKey = (key: number): { readonly high: number; readonly low: number } => ({
  high: Math.floor((key - 1) / KEY_RADIX) + KEY_FLOOR,
  low: ((key - 1) % KEY_RADIX) + KEY_FLOOR,
});

/** The layout key two sentinel stack sizes spell, the inverse of {@link splitKey}. */
export const joinKey = (high: number, low: number): number => (high - KEY_FLOOR) * KEY_RADIX + (low - KEY_FLOOR) + 1;

/**
 * The layout key of a screen: what the router picks its layout by, and what
 * the build stamps on its entity.
 *
 * Derived from the screen's full name rather than handed out in sequence,
 * because addons are built apart and meet in a world: two addons numbering
 * their screens from 1 would both claim key 1, and the chest would open the
 * wrong one. A hash of `<namespace>_<name>` — the JSON UI namespace, unique
 * across addons — gives every screen a key that depends on nothing but its own
 * name, so it is the same on every build machine and every rebuild, and an
 * entity placed in a world keeps opening the screen it was stamped with.
 * FNV-1a, folded into 1..MAX_LAYOUT.
 */
export const layoutKey = (namespace: string, name: string): number => {
  let hash = 0x811c9dc5;

  for (const char of `${namespace}_${name}`) {
    hash ^= char.codePointAt(0) ?? 0;
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }

  return 1 + (hash % MAX_LAYOUT);
};

/**
 * The item backing a text channel. Stackable on purpose: a character IS the
 * stack size, and an unstackable item pins every cell to 1.
 */
export const COUNT_ITEM = 'minecraft:paper';

/**
 * Where the build stamps a screen's layout key, and the runtime reads it at
 * open. The host owns its screen, so it carries the key to it: an entity
 * property on an entity, and a block STATE of the same name on a block — a
 * state declared with the one value, as a string, since a block has one screen
 * and an integer state is stored by value in bits the key would overflow.
 */
export const LAYOUT_PROPERTY = 'core:ui_layout';

/** Dynamic property a screen's hook state is persisted under, on its host. */
export const STATE_PROPERTY = 'core:ui_state';

/**
 * Slots a block container can have. `minecraft:block_entity.container.slot_count`
 * takes 1..54, which is the whole of a screen's allocation: its sentinels, its
 * drawn cells and the bank behind them. An entity's inventory has no such cap,
 * so a screen that outgrows a block still fits an entity.
 */
export const BLOCK_SLOT_LIMIT = 54;

/**
 * A block-hosted screen that does not fit its block, said once for the build
 * and the runtime alike: the build refuses to compile one, and
 * `createContainerScreen` refuses to serve one.
 */
export const blockCapacityError = (name: string, size: number): ContainerScreenError =>
  new ContainerScreenError(
    `"${name}" needs ${size} container slots and a block holds ${BLOCK_SLOT_LIMIT}.\n`
    + '  Every element of a compiled screen costs container slots: 2 for the routing\n'
    + '  sentinel, 1 for each own <Slot> and each Button, and one per character of\n'
    + '  every live <Text maxLength>.\n'
    + '  Two ways out: draw fewer of them and shorten the live text, or host the\n'
    + '  screen on an entity with `<Container entity>`, whose inventory has no limit.',
  );

/** Dynamic property marking an item the runtime placed, where the item can hold one. */
export const OWNED_PROPERTY = 'core:ui_owned';

/** Lore line marking an item the runtime placed, for items that cannot hold a property. */
export const OWNED_LORE = '§8core.ui';

/**
 * Prefix of the `.lang` keys a live label resolves its character codes
 * through: cell code `n` becomes `core.ui.c.n`.
 */
export const KEY_PREFIX = 'core.ui.c.';

/** The JSON UI collection a chest screen reads its slots from. */
export const COLLECTION = 'container_items';
