/**
 * What the compiled JSON UI and the runtime have to agree on.
 *
 * Every value here is baked into a layout at build time and written into a
 * container at runtime, so it lives in one place and both sides import it —
 * the ui-compiler filter bundles the project's own copy of this module, which
 * is what keeps a screen compiled against the runtime it ships with.
 *
 * The items the protocol rides are custom items the addon registers, one per
 * role, and a compiled screen tells them apart by their MAX DURABILITY
 * (`#item_durability_total_amount`). That number comes from the item's own
 * definition, so it is the same in every world — unlike `#item_id_aux`, which
 * the engine assigns to a custom item at load. The CURRENT durability is the
 * per-slot value on top of it: the layout key on the sentinel, the look a
 * button wears on its transport. `max_durability` is a signed 16-bit field, so
 * both stay within 1..32767.
 */

import { ContainerScreenError } from '../../core/types';

/** What each item the runtime places is for. */
export const PROTOCOL_ROLES = ['sentinel', 'transport', 'guard', 'count'] as const;

export type ProtocolRole = typeof PROTOCOL_ROLES[number];

/**
 * Each role's identity: its item's max durability, which is what a compiled
 * screen compares against.
 *
 * Odd values just under the 32767 ceiling, and no round ones, so a tool another
 * addon registers is unlikely to share one.
 *
 *  - `sentinel`: slot 0 of a compiled screen's container. Its current
 *    durability is the layout key.
 *  - `transport`: behind an enabled button. A press drops it; its current
 *    durability is the look the button wears.
 *  - `guard`: behind a disabled button, and an output slot's placeholder. It
 *    keeps the slot from ever being empty, so a shift-click cannot auto-place
 *    into it; a look rides it as it does the transport.
 *  - `count`: a bank cell. A character rides its stack size, a look its
 *    current durability.
 */
export const IDENTITY: Readonly<Record<ProtocolRole, number>> = {
  sentinel: 32749,
  transport: 32719,
  guard: 32717,
  count: 32713,
};

/** FNV-1a over a string, as an unsigned 32-bit number. */
const fnv1a = (text: string): number => {
  let hash = 0x811c9dc5;

  for (const char of text) {
    hash ^= char.codePointAt(0) ?? 0;
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }

  return hash;
};

/** The namespace of an identifier: `drav0011_shop` for `drav0011_shop:counter`. */
export const namespaceOf = (identifier: string): string => identifier.split(':')[0] ?? identifier;

/**
 * The item a role rides in one namespace.
 *
 * Registered by each addon under the namespace of the entity or block its
 * screen opens from, so two addons never define the same item. The name is a
 * hash of the namespace and the role: the same on every build, so a world
 * keeps the items its hosts already hold.
 */
export const protocolItemId = (namespace: string, role: ProtocolRole): string =>
  `${namespace}:core_${fnv1a(`${namespace}:${role}`).toString(36)}`;

/** The texture shortname every protocol item draws: fully transparent, shipped by the render pack. */
export const BLANK_ICON = 'core_ui_blank';

/** One protocol item, as the build writes it into the addon's behaviour pack. */
export interface ProtocolItemDefinition {
  readonly role: ProtocolRole;
  readonly identifier: string;
  readonly document: Readonly<Record<string, unknown>>;
}

/**
 * The items one namespace registers.
 *
 * Invisible everywhere: a blank icon, so a dropped one leaves nothing on the
 * ground, a blank name, and no creative or command entry. The count item
 * stacks because a character is its stack size, and a button's transport and
 * guard because a press drops one and leaves the rest; the sentinel is a single
 * item.
 */
export const protocolItemDefinitions = (namespace: string): ProtocolItemDefinition[] => PROTOCOL_ROLES.map((role) => {
  const identifier = protocolItemId(namespace, role);

  return {
    role,
    identifier,
    document: {
      'format_version': '1.21.50',
      'minecraft:item': {
        description: {
          identifier,
          menu_category: { category: 'none', is_hidden_in_commands: true },
        },
        components: {
          'minecraft:icon': { textures: { default: BLANK_ICON } },
          'minecraft:display_name': { value: ' ' },
          'minecraft:max_stack_size': role === 'sentinel' ? 1 : 64,
          'minecraft:durability': { max_durability: IDENTITY[role] },
        },
      },
    },
  };
});

/** Container index of the sentinel, never drawn. */
export const SENTINEL_SLOTS = [0] as const;

/** Highest layout key a screen can be assigned: the sentinel's current durability. Keys run from 1. */
export const MAX_LAYOUT = IDENTITY.sentinel;

/**
 * How many looks one element can carry: every current durability of the
 * smallest carrier, from 0.
 */
export const LOOK_LIMIT = Math.min(IDENTITY.transport, IDENTITY.guard, IDENTITY.count) + 1;

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
export const layoutKey = (namespace: string, name: string): number =>
  1 + (fnv1a(`${namespace}_${name}`) % MAX_LAYOUT);

/**
 * Where the build stamps a screen's layout key, and the runtime reads it at
 * open. The host owns its screen, so it carries the key to it: an entity
 * property on an entity, and a block STATE of the same name on a block — a
 * string state whose default is the key, since an integer state is stored by
 * value in bits the key would overflow.
 */
export const LAYOUT_PROPERTY = 'core:ui_layout';

/** Dynamic property a screen's hook state is persisted under, on its host. */
export const STATE_PROPERTY = 'core:ui_state';

/**
 * Slots a block container can have. `minecraft:block_entity.container.slot_count`
 * takes 1..54, which is the whole of a screen's allocation: its sentinel, its
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
    + '  Every element of a compiled screen costs container slots: 1 for the routing\n'
    + '  sentinel, 1 for each own <Slot> and each Button, and one per character of\n'
    + '  every live <Text maxLength>.\n'
    + '  Two ways out: draw fewer of them and shorten the live text, or host the\n'
    + '  screen on an entity with `<Container entity>`, whose inventory has no limit.',
  );

/**
 * Prefix of the `.lang` keys a live label resolves its character codes
 * through: cell code `n` becomes `core.ui.c.n`.
 */
export const KEY_PREFIX = 'core.ui.c.';

/** The JSON UI collection a chest screen reads its slots from. */
export const COLLECTION = 'container_items';
