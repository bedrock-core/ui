/**
 * The chest host: the vanilla screens every compiled layout is served through.
 *
 * `container_type: container` on an entity's `minecraft:inventory` is the only
 * one that routes to the chest screen, so an entity-hosted screen opens as a
 * chest; a block's `minecraft:block_entity.container` opens the data-driven
 * container screen instead. The two are the same screen to everything above
 * this — the same collection, the same protocol items, the same layout keys —
 * so both are hooked the same way and both mount the one router root. Two
 * kinds of edit to a vanilla file put a layout there, and both are of a kind
 * the engine stacks across packs in whatever order they sit.
 *
 *  - The render pack's static copy of `chest_screen.json` points the chest
 *    screen's `$screen_content` at the CHEST ROOT, the way vanilla's own
 *    shulker-box and barrel screens point theirs elsewhere. The root holds
 *    vanilla's chest panel by reference behind a gate that opens for any
 *    chest no compiled screen claims, and behind the opposite gate the
 *    chrome plus a second reference to vanilla's chest top half, whose own
 *    label and grid that copy also gates. A modification cannot switch the
 *    content: `variables` is not an array modifications reach, and a
 *    `controls` insert on the screen creates an array that shadows the one
 *    the screen inherits, emptying every chest.
 *  - Each addon's HOOK, generated here into its own copy of the same file,
 *    inserts the addon's root into that top half — an array vanilla itself
 *    declares, so inserts from packs built apart all land, and nothing is
 *    defined that would replace another pack's.
 *  - Each addon's ROUTER, a file of its own, holds that root: one gated host
 *    per compiled screen.
 *
 * The routing reads the sentinel, the protocol item in the first two slots.
 * Its item id is the protocol key, shared by every compiled screen; the two
 * stack sizes are the layout key, high half then low, so each binding reads
 * a plain number straight back. A vanilla chest has no marker there, fails
 * the first check, and renders untouched — absence IS the vanilla path, so
 * nothing has to special-case it.
 *
 * Every number in a binding here is a literal on purpose. A `$variable` inside
 * a `source_property_name` is silently dropped in a subtree the engine
 * inserted through `modifications`, which cost six in-game attempts to
 * establish.
 */

import {
  CANONICAL_SCREEN, COLLECTION, ContainerScreenError, MAX_LAYOUT, PROTOCOL_ITEM_AUX, SENTINEL_SLOTS,
  splitKey,
} from '@bedrock-core/ui-runtime/compile';
import { BACKDROP_DEFINITION, SCREEN_DEFINITION } from '../../face';
import type { Binding, Control, ControlEntry, Document } from '../../jsonui';
import { CHEST } from '../../connectors/chest';

export { CHEST_EMIT } from './emit';
export { CELL, hidesTransport, TEXT_DEF, textDef } from '../../connectors/chest';

/** One vanilla file an addon hooks: the definition in it that every addon's root is inserted into. */
export interface ChestHook {
  /** Pack path — vanilla's own, which is what makes the edit stack with other packs'. */
  readonly file: string;
  /** JSON UI namespace of that file. */
  readonly namespace: string;
  /**
   * The definition the roots are inserted into. It has to declare its own
   * `controls`: an insert on a definition that only inherits the array creates
   * one, and that shadows the inherited one. Both UI profiles reach it, as the
   * chest root mounts it on either.
   */
  readonly target: string;
}

/**
 * A host: the vanilla screen a compiled layout is mounted on, and what the
 * compiler and the filter agree on to get it there.
 */
export interface ChestHost {
  readonly id: string;
  /** The vanilla files hooked. */
  readonly hooks: readonly ChestHook[];
  /** Pack directory an addon's router document is written into. */
  readonly routerDir: string;
  /** JSON UI namespace of the chest root and of every addon's router. */
  readonly routerNamespace: string;
  /** The collection every slot and channel reads from. */
  readonly collection: string;
  /** `minecraft:inventory.container_type` the entity needs to open this screen. */
  readonly containerType: string;
  /** The canvas a screen is laid out against, in texels. */
  readonly canvas: { readonly width: number; readonly height: number };
  /** The renderer that hides the runtime's transport item, fully qualified. */
  readonly ownedItemRenderer: string;
}

export const CHEST_HOST: ChestHost = {
  id: 'chest',
  // One per vanilla screen a compiled layout can be opened on: the chest, for a
  // screen an entity hosts, and the data-driven container, for a screen a block
  // hosts. Both take the same root, so an addon's router serves either.
  hooks: [
    { file: 'ui/chest_screen.json', namespace: 'chest', target: 'small_chest_panel_top_half' },
    { file: 'ui/data_driven_container_screen.json', namespace: 'data_driven_container', target: 'panel_top_half' },
  ],
  routerDir: 'ui/core-ui/screens',
  routerNamespace: 'core_ui_router',
  collection: COLLECTION,
  containerType: 'container',
  canvas: CANONICAL_SCREEN,
  ownedItemRenderer: `${CHEST}.gated_item`,
};

/** What the router needs to know about a compiled screen. */
export interface RoutedScreen {
  readonly name: string;
  readonly namespace: string;
  readonly layoutId: number;
  readonly hasBackdrop: boolean;
}

/** A document and the pack path it is written to. */
export interface PlacedDocument {
  readonly file: string;
  readonly document: Document;
}

/** The documents that route one addon's compiled screens onto the chest. */
export interface ChestRouting {
  /** The addon's copies of vanilla's chest files: one modification each, inserting the addon's root. */
  readonly hooks: readonly PlacedDocument[];
  /** The addon's router: its root, and a gated host per screen. */
  readonly router: Document;
  /** Pack path the router is written to — the addon's own, so two addons' routers never overwrite each other. */
  readonly routerFile: string;
}

/**
 * Where a compiled screen sits on the chest screen: centred both ways.
 *
 * A screen is laid out against the same canvas a server form is, but it is
 * not mounted the way a form is. A form's column hangs from the top because it
 * scrolls; a compiled screen cannot scroll, so its canvas is a fixed box that
 * belongs in the middle of whatever screen size the player has, the way the
 * vanilla chest panel is.
 */
export const MOUNT_ANCHOR = 'center';

/** Pack path of an addon's router document. */
export const routerFileOf = (addon: string, host: ChestHost = CHEST_HOST): string =>
  `${host.routerDir}/${addon}_router.json`;

/**
 * `collection_index` is only accepted on a direct child of a control declaring
 * `collection_name`, and that is only legal on stack_panel/grid. So anything
 * reading a slot gets a one-child host directly above it.
 */
const indexHost = (child: string, collection: string, index: number): Control => ({
  type: 'stack_panel',
  orientation: 'vertical',
  size: ['100%', '100%'],
  collection_name: collection,
  controls: [{ [child]: { collection_index: index } }],
});

const sentinelBindings = (collection: string): Binding[] => [
  { binding_type: 'collection_details', binding_collection_name: collection },
  {
    binding_name: '#item_id_aux',
    binding_name_override: '#aux',
    binding_type: 'collection',
    binding_collection_name: collection,
  },
  {
    binding_name: '#inventory_stack_count',
    binding_name_override: '#count',
    binding_type: 'collection',
    binding_collection_name: collection,
  },
];

/** A full-screen panel shown only while the slot it is hosted on satisfies `condition`. */
const gate = (collection: string, condition: string, controls: ControlEntry[], layer?: number): Control => ({
  type: 'panel',
  size: ['100%', '100%'],
  ...layer === undefined ? {} : { layer },
  controls,
  bindings: [
    ...sentinelBindings(collection),
    {
      binding_type: 'view',
      source_property_name: condition,
      target_property_name: '#visible',
    },
  ],
});

/** Every key a screen is routed by has to be usable and unique, or two screens share a chest. */
const checkKeys = (screens: readonly RoutedScreen[]): void => {
  const layouts = new Map<number, string>();
  const names = new Set<string>();

  for (const screen of screens) {
    if (!Number.isInteger(screen.layoutId) || screen.layoutId < 1 || screen.layoutId > MAX_LAYOUT) {
      throw new ContainerScreenError(
        `Layout id ${screen.layoutId} (${screen.name}) is outside 1..${MAX_LAYOUT}: `
        + 'the key rides two stack sizes of 2..64.',
      );
    }

    const taken = layouts.get(screen.layoutId);

    if (taken !== undefined) {
      throw new ContainerScreenError(
        `Screens "${taken}" and "${screen.name}" share layout key ${screen.layoutId}; both would claim the same chest. `
        + 'The key is derived from the screen\'s name: rename one of them.',
      );
    }

    if (names.has(screen.name)) {
      throw new ContainerScreenError(`Two screens are named "${screen.name}"; names become definition names and must be unique.`);
    }

    layouts.set(screen.layoutId, screen.name);
    names.add(screen.name);
  }
};

/**
 * The addon's hooks: its copies of vanilla's chest files, each holding one
 * modification that inserts the addon's root into the chest top half the
 * chest root mounts. Nothing is defined in them, so they stack with the
 * render pack's copies and with every other addon's, whatever order the
 * packs sit in.
 */
const hooksOf = (addon: string, host: ChestHost): PlacedDocument[] => host.hooks.map(hook => ({
  file: hook.file,
  document: {
    namespace: hook.namespace,
    [hook.target]: {
      modifications: [
        {
          array_name: 'controls',
          operation: 'insert_back',
          value: [{ [`${addon}@${host.routerNamespace}.${addon}_root`]: {} }],
        },
      ],
    },
  },
}));

/**
 * The hooks and the router, for every compiled screen of one addon.
 *
 * @param screens - Every compiled screen the router has to reach.
 * @param addon - The addon's namespace: it names the router's file and every definition in it.
 * @param host - The host the screens were compiled for.
 * @throws ContainerScreenError when a layout key is out of range or shared.
 */
export const chestRouter = (screens: readonly RoutedScreen[], addon: string, host: ChestHost = CHEST_HOST): ChestRouting => {
  checkKeys(screens);

  const ns = host.routerNamespace;
  const { collection } = host;
  const claimed = `(#aux = ${PROTOCOL_ITEM_AUX})`;
  const router: Document = { namespace: ns };

  // Every definition carries the addon's name: the router shares its
  // namespace with the chest root and with every other addon's router, and
  // the engine keeps one definition per name.
  //
  // A screen is gated twice, once per sentinel slot: the outer gate reads the
  // high half of the key off the first, and hosts the inner gate, which reads
  // the low half off the second. Both check the protocol id. Two nested gates
  // are an AND without an expression that would have to read two slots at
  // once, which no single control can.
  //
  // The stack size is a STRING in a binding expression — measured: of every
  // numeric form, only `(#count = '19')` held on a stack of 19; arithmetic on
  // it and comparisons against a number are all false — so each key half is
  // compared as a quoted literal.
  const [highSlot, lowSlot] = SENTINEL_SLOTS;

  for (const screen of screens) {
    const { high, low } = splitKey(screen.layoutId);
    const mounted: ControlEntry[] = [
      ...screen.hasBackdrop
        ? [{ [`backdrop@${screen.namespace}.${BACKDROP_DEFINITION}`]: {} }]
        : [],
      {
        [`screen@${screen.namespace}.${SCREEN_DEFINITION}`]: {
          anchor_from: MOUNT_ANCHOR,
          anchor_to: MOUNT_ANCHOR,
        },
      },
    ];

    router[`${addon}_low_gate_${screen.name}`] = gate(collection, `(${claimed} and (#count = '${low}'))`, mounted, 5);
    router[`${addon}_low_host_${screen.name}`] = indexHost(`gate@${ns}.${addon}_low_gate_${screen.name}`, collection, lowSlot);
    router[`${addon}_gate_${screen.name}`] = gate(collection, `(${claimed} and (#count = '${high}'))`, [
      { [`low@${ns}.${addon}_low_host_${screen.name}`]: {} },
    ]);
    router[`${addon}_host_${screen.name}`] = indexHost(`gate@${ns}.${addon}_gate_${screen.name}`, collection, highSlot);
  }

  // The addon's root fills the screen like the chest root does; only the host
  // whose gate is open draws anything.
  router[`${addon}_root`] = {
    type: 'panel',
    size: ['100%', '100%'],
    controls: screens.map(screen => ({ [`${screen.name}@${ns}.${addon}_host_${screen.name}`]: {} })),
  };

  return { hooks: hooksOf(addon, host), router, routerFile: routerFileOf(addon, host) };
};
