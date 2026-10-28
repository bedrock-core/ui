/**
 * The chest host: the vanilla screens every compiled layout is served through.
 *
 * `container_type: container` on an entity's `minecraft:inventory` is the only
 * one that routes to the chest screen, so an entity-hosted screen opens as a
 * chest; a block's `minecraft:block_entity.container` opens the data-driven
 * container screen instead. The two are the same screen to everything above
 * this — the same collection, the same protocol items, the same layout keys —
 * so both are hooked the same way and both mount the one router root.
 *
 * This module emits the addon's router and additive insertions into vanilla's
 * top-half panels. `buildContainerPack` completes those hooks with the desktop
 * and pocket shells, and links their templates into the addon's support file.
 * Each shell mounts vanilla's panel for ordinary containers and the insertion
 * panel for compiled containers, so every addon's registered root is reachable.
 *
 * The routing reads the sentinel, the protocol item in slot 0. Its max
 * durability is the protocol key, shared by every compiled screen; its current
 * durability is the layout key, so one binding reads each straight back. A
 * vanilla chest has no sentinel there, fails the check, and renders untouched
 * — absence IS the vanilla path, so nothing has to special-case it.
 *
 * Every number in a binding here is a literal on purpose. A `$variable` inside
 * a `source_property_name` does not reliably resolve in a subtree inserted
 * through `modifications`.
 */

import {
  CANONICAL_SCREEN, COLLECTION, ContainerScreenError, IDENTITY, MAX_LAYOUT, SENTINEL_SLOTS,
} from '@bedrock-core/ui-runtime/compile';
import { BACKDROP_DEFINITION, SCREEN_DEFINITION } from '../../face';
import type { Binding, Control, ControlEntry, Document } from '../../jsonui';

export { CHEST_EMIT } from './emit';
export { CELL, TEXT_DEF, textDef } from '../../connectors/chest';

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
  /** JSON UI namespace used for the router definitions. */
  readonly routerNamespace: string;
  /** The collection every slot and channel reads from. */
  readonly collection: string;
  /** `minecraft:inventory.container_type` the entity needs to open this screen. */
  readonly containerType: string;
  /** The canvas a screen is laid out against, in texels. */
  readonly canvas: { readonly width: number; readonly height: number };
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
};

/** What the router needs to know about a compiled screen. */
export interface RoutedScreen {
  readonly name: string;
  readonly namespace: string;
  readonly layoutId: number;
  readonly hasBackdrop: boolean;
  /** Compiled controls used to place cursor chrome above the screen's authored layers. */
  readonly document?: Document;
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
    binding_name: '#item_durability_total_amount',
    binding_name_override: '#identity',
    binding_type: 'collection',
    binding_collection_name: collection,
  },
  {
    binding_name: '#item_durability_current_amount',
    binding_name_override: '#layout',
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
        + 'the key rides the sentinel\'s current durability.',
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
 * chest root mounts. Nothing is defined in these insertions. Pack linking adds
 * the shell properties and resolves helper names separately.
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

/** The highest parent-relative layer in the authored canvas, before native cell and cursor details. */
const contentLayer = (document?: Document): number => {
  if (document === undefined) { return 0; }

  const definitions = new Map<string, { base: string; control: Control }>();

  for (const [key, value] of Object.entries(document)) {
    if (typeof value === 'string' || 'modifications' in value) { continue; }

    const [name = '', base = ''] = key.split('@');

    definitions.set(String(document.namespace) + '.' + name, { base, control: value });
  }

  const resolve = (reference: string, override: Control): Control => {
    const found = definitions.get(reference);

    return found === undefined ? override : { ...resolve(found.base, found.control), ...override };
  };

  const highest = (reference: string, override: Control, parent: number): number => {
    const control = resolve(reference, override);
    const layer = parent + (control.layer ?? 0);
    const children = (control.controls ?? []).flatMap(entry => Object.entries(entry)
      .map(([key, child]) => highest(key.split('@')[1] ?? '', child, layer)));

    if (control.grid_item_template !== undefined) { children.push(highest(control.grid_item_template, {}, layer)); }

    return Math.max(layer, ...children);
  };

  return highest(String(document.namespace) + '.' + SCREEN_DEFINITION, {}, 0);
};

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
  const claimed = `(#identity = ${IDENTITY.sentinel})`;
  const router: Document = { namespace: ns };

  // Every definition carries the addon's name: the router shares its
  // namespace with the chest root and with every other addon's router, and
  // the engine keeps one definition per name.
  //
  // A screen is gated once, on the sentinel: its identity and the layout key
  // both ride durability, which is a number in a binding expression, so both
  // are compared unquoted. An empty slot or a player's item fails both.
  const [sentinelSlot] = SENTINEL_SLOTS;

  for (const screen of screens) {
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
      { 'chrome@core_ui_chest.chrome': { $cursor_visual_layer: contentLayer(screen.document) + 1 } },
    ];

    router[`${addon}_gate_${screen.name}`] = gate(collection, `(${claimed} and (#layout = ${screen.layoutId}))`, mounted, 5);
    router[`${addon}_host_${screen.name}`] = indexHost(`gate@${ns}.${addon}_gate_${screen.name}`, collection, sentinelSlot);
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
