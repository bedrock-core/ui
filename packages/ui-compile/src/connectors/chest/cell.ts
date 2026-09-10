import { TRANSPORT_ITEM_AUX } from '@bedrock-core/ui-runtime/compile';
import { topLeft } from '../../faces';
import { entryControl } from '../../nodes/utils/shared';
import type { Binding, ButtonMapping, Control, ControlEntry } from '../../jsonui';

/**
 * The namespace of the library's own container definitions — the cells, text
 * hosts, scroll, transport-hiding renderer and chrome — shipped as static
 * files in the render pack. A compiled screen references them by name and
 * emits only what varies per screen.
 */
export const CHEST = 'core_ui_chest';

/** The variable a slot host passes to its child. An ordinary property, so legal. */
export const SLOT_VAR = '$slot';

/** Which cell definition a slot host instantiates: an item, or a button face. */
export const CELL_VAR = '$cell';

/**
 * Vanilla's `common.container_slot_button_prototype` routes, verbatim.
 *
 * A derived control's `button_mappings` REPLACES its base's rather than
 * merging, so any slot that changes one route has to restate the whole table.
 * This is the table, and the variants are derived from it rather than typed
 * twice.
 *
 * The last two have no source: they are self-routed, and the engine needs them
 * for pointer hover and touch shape-drawing.
 */
const PROTOTYPE_MAPPINGS: readonly ButtonMapping[] = [
  { from_button_id: 'button.menu_select', to_button_id: 'button.container_take_all_place_all', mapping_type: 'pressed' },
  { from_button_id: 'button.menu_ok', to_button_id: 'button.container_take_all_place_all', mapping_type: 'pressed' },
  { from_button_id: 'button.controller_back', to_button_id: 'button.container_take_all_place_all', mapping_type: 'pressed', ignored: '(not $is_ps4)' },
  { from_button_id: 'button.menu_secondary_select', to_button_id: 'button.container_take_half_place_one', mapping_type: 'pressed' },
  { from_button_id: 'button.controller_select', to_button_id: 'button.container_take_half_place_one', mapping_type: 'pressed' },
  { from_button_id: 'button.menu_auto_place', to_button_id: 'button.container_auto_place', mapping_type: 'pressed' },
  { from_button_id: 'button.controller_secondary_select', to_button_id: 'button.container_auto_place', mapping_type: 'pressed' },
  { from_button_id: 'button.menu_inventory_drop', to_button_id: 'button.drop_one', mapping_type: 'pressed' },
  { from_button_id: 'button.menu_inventory_drop_all', to_button_id: 'button.drop_all', mapping_type: 'pressed' },
  { from_button_id: 'button.menu_select', to_button_id: 'button.coalesce_stack', mapping_type: 'double_pressed' },
  { from_button_id: 'button.menu_ok', to_button_id: 'button.coalesce_stack', mapping_type: 'double_pressed' },
  { to_button_id: 'button.shape_drawing', mapping_type: 'pressed' },
  { to_button_id: 'button.container_slot_hovered', mapping_type: 'pressed' },
];

/** Self-routed entries carry no source and are never rewritten. */
const isSelfRouted = (mapping: ButtonMapping): boolean => mapping.from_button_id === undefined;

/**
 * What every mechanism on a chest is made of: a container slot, and the ways
 * to read one.
 *
 * A chest screen carries everything through slots the runtime polls a tick at
 * a time. A press can only reach script as an item move — JSON UI's button
 * mappings produce game actions, and the container transaction is the only one
 * the server sees — and a string can only cross as numbers, one slot's stack
 * size per character. Every mechanism here is one of those two facts spelled
 * out as JSON UI.
 *
 * Every number in a binding is a literal on purpose. A `$variable` inside a
 * `source_property_name` is silently dropped in a subtree the engine inserted
 * through `modifications`, which is how every compiled screen is mounted.
 */

/**
 * The library's own cell definitions a slot mounts, from the static
 * `core_ui_chest` file the render pack ships. One per control shape, never one
 * per node.
 */
export const CELL = {
  host: `${CHEST}.slot_host`,
  slot: `${CHEST}.slot`,
  /** Vanilla's container button, extended rather than replaced: the transaction is the point. */
  slotButton: `${CHEST}.slot_button`,
  item: `${CHEST}.cell`,
  lockedSlot: `${CHEST}.locked_slot`,
  outputSlot: `${CHEST}.output_slot`,
  displayStates: `${CHEST}.display_states`,
  empty: `${CHEST}.empty`,
} as const;

/** The static host one character cell mounts, and the per-screen name a channel definition takes. */
export const TEXT_DEF = {
  textHost: `${CHEST}.text_host`,
  text: 'text_channel',
} as const;

/** The face's placement, restated on the mechanism that replaces it. */
export const placed = (face: ControlEntry): Control => {
  const control = entryControl(face);

  return {
    size: control.size,
    offset: control.offset,
    ...topLeft,
    ...control.layer === undefined ? {} : { layer: control.layer },
    ...control.visible === false ? { visible: false } : {},
  };
};

/**
 * A button slot's routes: every item-moving route becomes AUTO-PLACE.
 *
 * Vanilla's default, take-to-cursor, hangs the transport item on the mouse
 * where the engine draws it HARDCODED — no JSON UI control renders the held
 * stack, so nothing can hide it there. Auto-place sends it to the player's
 * inventory instead, which IS ours to draw: the router's own grids render a
 * transport as nothing, so the press becomes invisible end to end.
 *
 * The drop routes fold in too, because Q over a button would throw the
 * transport on the GROUND — the one place the runtime cannot reach it. So does
 * the double-click coalesce, which would otherwise gather transports from
 * every other button onto the cursor.
 *
 * Two costs, both accepted: a press with a completely FULL inventory has
 * nowhere to auto-place and does nothing, and a double-click auto-places twice,
 * harmlessly, since the slot is already empty the second time.
 */
export const BUTTON_MAPPINGS: ButtonMapping[] = PROTOTYPE_MAPPINGS.map(mapping => (
  isSelfRouted(mapping) ? mapping : { ...mapping, to_button_id: 'button.container_auto_place' }
));

/**
 * Where a button's enabled state is read from: whether its slot holds the
 * TRANSPORT, by its item id.
 *
 * The runtime keeps a transport in the slot exactly while the button is
 * enabled and the guard while it is not. The two are different blocks, so the
 * id alone tells them apart, and a legacy-range block's id never shifts.
 */
const ENABLED_PROPERTY = `(#btn_aux = ${TRANSPORT_ITEM_AUX})`;

/**
 * Reads the slot item's id, which the enabled test compares against the
 * transport's. Every control that draws differently by state carries its own
 * copy, since a binding cannot be shared.
 */
const enabledBindings = (collection: string): Binding[] => [
  { binding_type: 'collection_details', binding_collection_name: collection },
  {
    binding_name: '#item_id_aux',
    binding_name_override: '#btn_aux',
    binding_type: 'collection',
    binding_collection_name: collection,
  },
];

/** Visible only while the slot holds the transport, which is what enabled means here. */
export const whenEnabled = (collection: string): Binding[] => [
  ...enabledBindings(collection),
  { binding_type: 'view', source_property_name: ENABLED_PROPERTY, target_property_name: '#visible' },
];

/** Visible only while it does not. */
export const whenDisabled = (collection: string): Binding[] => [
  ...enabledBindings(collection),
  { binding_type: 'view', source_property_name: `(not ${ENABLED_PROPERTY})`, target_property_name: '#visible' },
];
