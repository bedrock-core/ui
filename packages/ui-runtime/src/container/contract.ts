/**
 * What the compiled JSON UI and the runtime have to agree on.
 *
 * Every value here is baked into a layout at build time and written into a
 * container at runtime, so it lives in one place and both sides import it —
 * the ui-compile filter bundles the project's own copy of this module, which
 * is what keeps a screen compiled against the runtime it ships with.
 */

/**
 * The item in the sentinel slot. Its numeric id is the protocol key every
 * compiled screen shares; its durability carries the layout key, so it has to
 * be damageable. Also the transport item behind every button.
 */
export const PROTOCOL_ITEM = 'minecraft:netherite_pickaxe';

/**
 * `#item_id_aux` the router compares against for {@link PROTOCOL_ITEM}: the
 * item's numeric id shifted by 16. Measured in game; Mojang does not promise
 * the numbering, so this is the one constant a game update can move.
 */
export const PROTOCOL_ITEM_AUX = 40763392;

/**
 * The item backing a text channel. Stackable on purpose: a character IS the
 * stack size, and an unstackable item pins every cell to 1.
 */
export const COUNT_ITEM = 'minecraft:paper';

/**
 * Durability reading a button's transport item is pinned to, so the screen's
 * own inventory grids can tell one from a player's tool and draw it as
 * nothing. Neither 0 nor max — a pristine or a worn-out real tool reads
 * those — and above every layout key, so the two never meet.
 */
export const TRANSPORT_ORDINAL = 2001;

/** Highest layout key a screen can be assigned. Keys grow upward from 1. */
export const MAX_LAYOUT = TRANSPORT_ORDINAL - 1;

/**
 * Durability reading of an output slot's placeholder, the guard: the protocol
 * item at a second reserved ordinal. It keeps the slot from ever being empty,
 * so a shift-click cannot auto-place into it. The compiled output cell reads
 * this ordinal — with the protocol aux, the same two-literal check the router
 * runs — to swap the real cell for an empty fake, so the guard is never
 * rendered, never hovered and never takeable: no visible cell, no button.
 */
export const GUARD_ORDINAL = TRANSPORT_ORDINAL + 1;

/** Container index carrying the routing keys. Never drawn. */
export const SENTINEL_SLOT = 0;

/**
 * Entity property the build stamps with a screen's layout key, and the runtime
 * reads at open. The entity owns its screen, so it carries the key to it.
 */
export const LAYOUT_PROPERTY = 'core:ui_layout';

/** Dynamic property a screen's hook state is persisted under, on its entity. */
export const STATE_PROPERTY = 'core:ui_state';

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
