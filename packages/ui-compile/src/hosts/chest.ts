/**
 * The chest host: the vanilla screen every compiled layout is served through.
 *
 * `container_type: container` on an entity's `minecraft:inventory` is the only
 * one that routes to the chest screen, so every compiled screen opens as a
 * chest and this document decides what the chest draws. Two cheap checks do
 * the routing: one decides whether a chest is ours at all, the next decides
 * which layout it is.
 *
 * Both keys ride the sentinel in slot 0. Its item id is the protocol key,
 * shared by every compiled screen; its remaining durability is the layout key,
 * so the binding reads the id straight back without arithmetic. A vanilla
 * chest has no marker there, fails the first check, and renders untouched —
 * absence IS the vanilla path, so nothing has to special-case it.
 *
 * Every number in a binding here is a literal on purpose. A `$variable` inside
 * a `source_property_name` is silently dropped in a subtree the engine
 * inserted through `modifications`, which cost six in-game attempts to
 * establish.
 */

import {
  CANONICAL_SCREEN, COLLECTION, ContainerScreenError, MAX_LAYOUT, PROTOCOL_ITEM_AUX,
  TRANSPORT_ORDINAL,
} from '@bedrock-core/ui-runtime/compile';
import { BACKDROP_DEFINITION, SCREEN_DEFINITION } from '../emit';
import type { Binding, Control, ControlEntry, Document } from '../jsonui';

/**
 * A host: the vanilla screen a compiled layout is mounted on, and what the
 * compiler and the filter agree on to get it there.
 */
export interface ChestHost {
  readonly id: string;
  /**
   * Pack path of the router document. It has to be vanilla's own file: JSON UI
   * resolves a definition from the file that owns it, so replacing
   * `chest.small_chest_panel` from any other path — same namespace or not — is
   * silently ignored and the ordinary chest renders instead.
   */
  readonly file: string;
  /** JSON UI namespace of the router document — vanilla's, for the same reason. */
  readonly namespace: string;
  /** The collection every slot and channel reads from. */
  readonly collection: string;
  /** `minecraft:inventory.container_type` the entity needs to open this screen. */
  readonly containerType: string;
  /** The canvas a screen is laid out against, in texels. */
  readonly canvas: { readonly width: number; readonly height: number };
  /** Router definitions a compiled screen references for the player's own grids. */
  readonly grids: { readonly inventory: string; readonly hotbar: string };
}

export const CHEST_HOST: ChestHost = {
  id: 'chest',
  file: 'ui/chest_screen.json',
  namespace: 'chest',
  collection: COLLECTION,
  containerType: 'container',
  canvas: CANONICAL_SCREEN,
  grids: { inventory: 'core_ui_inventory_grid', hotbar: 'core_ui_hotbar_grid' },
};

/** What the router needs to know about a compiled screen. */
export interface RoutedScreen {
  readonly name: string;
  readonly namespace: string;
  readonly layoutId: number;
  readonly hasBackdrop: boolean;
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

/**
 * The router's item renderer that hides the runtime's transport item. A
 * `hideOwned` grid in a compiled screen draws its cells with it, so a button's
 * auto-placed transport never flashes in the player's own grids.
 */
export const GATED_ITEM = 'core_ui_gated_item';

/**
 * `collection_index` is only accepted on a direct child of a control declaring
 * `collection_name`, and that is only legal on stack_panel/grid. So anything
 * reading a slot gets a one-child host directly above it.
 */
const indexHost = (child: string, collection: string): Control => ({
  type: 'stack_panel',
  orientation: 'vertical',
  size: ['100%', '100%'],
  collection_name: collection,
  controls: [{ [child]: { collection_index: 0 } }],
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
    binding_name: '#item_durability_current_amount',
    binding_name_override: '#layout',
    binding_type: 'collection',
    binding_collection_name: collection,
  },
];

/**
 * The player's inventory and hotbar, redrawn so a transport item is invisible.
 *
 * A button press auto-places its transport into the player's inventory, and
 * vanilla's grids would draw it there for the tick it takes the script to pull
 * it back. These are clones of vanilla's own grids with ONE swap: the item
 * renderer is wrapped in a panel that reads the slot's id and durability and
 * hides itself when both match the transport — the same two-literal check the
 * router itself runs on the sentinel. The durability bar rides inside the same
 * wrapper (vanilla's own is turned off), so a damaged transport does not leave
 * a stray bar floating over an apparently empty cell.
 *
 * Cloned rather than modified: vanilla's `container_item` hardcodes its bar and
 * takes only the renderer as a variable, so the wrapper is the one seam wide
 * enough to carry both.
 *
 * The grids carry no anchors or offsets of their own: a compiled screen
 * references them and places them at the rect the author solved for.
 */
const hiddenItemGrids = (ns: string, grids: ChestHost['grids']): Record<string, Control> => ({
  // The seam: vanilla's item renderer plus its durability bar, gated together.
  // `$item_collection_name` flows down from the grid item exactly as it does
  // into vanilla's own bar — a variable is legal there, since this whole tree
  // is a normal replacement, not a `modifications` insert.
  [GATED_ITEM]: {
    type: 'panel',
    size: ['100%', '100%'],
    controls: [
      { 'renderer@common.item_renderer': { size: ['100%', '100%'] } },
      {
        'durability@common.durability_bar': {
          $durability_bar_required: true,
          offset: [0, 5],
          layer: 20,
        },
      },
    ],
    bindings: [
      { binding_type: 'collection_details', binding_collection_name: '$item_collection_name' },
      {
        binding_name: '#item_id_aux',
        binding_name_override: '#aux',
        binding_type: 'collection',
        binding_collection_name: '$item_collection_name',
      },
      {
        binding_name: '#item_durability_current_amount',
        binding_name_override: '#dur',
        binding_type: 'collection',
        binding_collection_name: '$item_collection_name',
      },
      {
        binding_type: 'view',
        source_property_name: `(not ((#aux = ${PROTOCOL_ITEM_AUX}) and (#dur = ${TRANSPORT_ORDINAL})))`,
        target_property_name: '#visible',
      },
    ],
  },

  'core_ui_inventory_item@common.container_item': {
    $item_collection_name: 'inventory_items',
    $item_renderer: `${ns}.core_ui_gated_item`,
    // Off so the only bar is the gated one inside the wrapper above.
    $durability_bar_required: false,
  },

  'core_ui_hotbar_item@common.container_item': {
    $item_collection_name: 'hotbar_items',
    $item_renderer: `${ns}.core_ui_gated_item`,
    $durability_bar_required: false,
  },

  // Vanilla's inventory grid, cell swapped.
  [grids.inventory]: {
    type: 'grid',
    size: [162, 54],
    grid_dimensions: [9, 3],
    grid_item_template: `${ns}.core_ui_inventory_item`,
    collection_name: 'inventory_items',
  },

  // Vanilla's `common.hotbar_grid_template`, cell swapped.
  [grids.hotbar]: {
    type: 'grid',
    size: [162, 18],
    grid_dimensions: [9, 1],
    grid_item_template: `${ns}.core_ui_hotbar_item`,
    collection_name: 'hotbar_items',
  },
});

/** Every key a screen is routed by has to be usable and unique, or two screens share a chest. */
const checkKeys = (screens: readonly RoutedScreen[]): void => {
  const layouts = new Map<number, string>();
  const names = new Set<string>();

  for (const screen of screens) {
    if (!Number.isInteger(screen.layoutId) || screen.layoutId < 1 || screen.layoutId > MAX_LAYOUT) {
      // The layout key and the transport's mark share the durability channel,
      // so they must never meet: a layout with the transport's reading would
      // make the grids hide the wrong item.
      throw new ContainerScreenError(
        `Layout id ${screen.layoutId} (${screen.name}) is outside 1..${MAX_LAYOUT}; `
        + `${TRANSPORT_ORDINAL} marks a button's transport item and the two ride the same durability value.`,
      );
    }

    const taken = layouts.get(screen.layoutId);

    if (taken !== undefined) {
      throw new ContainerScreenError(
        `Screens "${taken}" and "${screen.name}" share layout id ${screen.layoutId}; both would claim the same chest.`,
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
 * The router document, in the host's own namespace.
 *
 * @param screens - Every compiled screen the router has to reach.
 * @param host - The host the screens were compiled for.
 * @throws ContainerScreenError when a layout key is out of range or shared.
 */
export const chestRouter = (screens: readonly RoutedScreen[], host: ChestHost = CHEST_HOST): Document => {
  checkKeys(screens);

  const ns = host.namespace;
  const { collection } = host;
  const document: Document = { namespace: ns, ...hiddenItemGrids(ns, host.grids) };

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
    ];

    document[`core_ui_gate_${screen.name}`] = {
      type: 'panel',
      size: ['100%', '100%'],
      layer: 5,
      controls: mounted,
      bindings: [
        ...sentinelBindings(collection),
        {
          binding_type: 'view',
          source_property_name: `((#aux = ${PROTOCOL_ITEM_AUX}) and (#layout = ${screen.layoutId}))`,
          target_property_name: '#visible',
        },
      ],
    };

    document[`core_ui_host_${screen.name}`] = indexHost(`gate@${ns}.core_ui_gate_${screen.name}`, collection);
  }

  // True only when no compiled layout claimed the screen, i.e. an ordinary
  // chest. Vanilla's own visual content is re-emitted here, behind the inverted
  // gate, because the replacement below takes the whole screen.
  document['core_ui_vanilla_gate'] = {
    type: 'panel',
    size: ['100%', '100%'],
    layer: 5,
    controls: [
      { 'common_panel@common.common_panel': {} },
      { [`small_chest_panel_top_half@${ns}.small_chest_panel_top_half`]: {} },
      { 'inventory_panel_bottom_half_with_label@common.inventory_panel_bottom_half_with_label': {} },
      { 'hotbar_grid@common.hotbar_grid_template': {} },
      // Vanilla keeps its fly animation; compiled screens do without — see the
      // root panel below.
      { 'flying_item_renderer@common.flying_item_renderer': { layer: 15 } },
    ],
    bindings: [
      ...sentinelBindings(collection),
      {
        binding_type: 'view',
        source_property_name: `(not (#aux = ${PROTOCOL_ITEM_AUX}))`,
        target_property_name: '#visible',
      },
    ],
  };

  document['core_ui_vanilla_host'] = indexHost(`gate@${ns}.core_ui_vanilla_gate`, collection);

  // The WHOLE screen, not the strip above the player's inventory.
  //
  // A compiled screen decides everything that is drawn, so the background, the
  // player's inventory and the hotbar are not free -- a screen asks for them
  // by name or does without. What is NOT optional is the functional chrome:
  // without the take-progress button touch controls cannot take, without the
  // selected-icon button a held item has no icon on touch, and without the
  // gamepad cursor a controller cannot move. Those stay in vanilla's
  // `root_panel`, which also carries the key routes every chest relies on, and
  // are emitted for both paths.
  //
  // Wholesale replacement rather than a modification: a replacement is a normal
  // control tree, so cross-namespace @-bases resolve inside it.
  document['small_chest_panel'] = {
    type: 'panel',
    controls: [
      { 'container_gamepad_helpers@common.container_gamepad_helpers': {} },
      { 'selected_item_details_factory@common.selected_item_details_factory': {} },
      { 'item_lock_notification_factory@common.item_lock_notification_factory': {} },
      {
        'root_panel@common.root_panel': {
          layer: 1,
          controls: [
            { [`vanilla@${ns}.core_ui_vanilla_host`]: {} },
            { 'inventory_take_progress_icon_button@common.inventory_take_progress_icon_button': {} },
            // No flyer here: it lives in the vanilla gate. The renderer draws
            // whatever flies with no way to filter by item, and on a compiled
            // screen the most frequent flier is a button's transport on its way
            // to the hidden grids. The cost is real items from input and output
            // slots arriving without the animation.
            { 'inventory_selected_icon_button@common.inventory_selected_icon_button': {} },
            { 'gamepad_cursor@common.gamepad_cursor_button': {} },
          ],
        },
      },
      // Screen level, not inside `root_panel`: the canvas is the whole screen,
      // the way a form's is, and `root_panel` is only 176 x 166.
      ...screens.map(screen => ({
        [`core_ui_${screen.name}@${ns}.core_ui_host_${screen.name}`]: {},
      })),
    ],
  };

  return document;
};
