/**
 * Helpers more than one node kind draws on.
 *
 * Every rule encoded here was measured in game, against a hand-written target
 * that rendered clean — see `emit.ts` for the list. Nothing in this module
 * dispatches on a kind; anything that does belongs to that kind's module.
 */

import type { ButtonMapping, Control, ControlEntry, Measure } from '../jsonui';
import type { Rect } from './types';

/**
 * Vanilla's `common.container_slot_button_prototype` routes, verbatim. A
 * derived control's `button_mappings` REPLACES its base's rather than merging,
 * so any slot that changes one route has to restate the whole table — this is
 * the table, and the variants are derived from it rather than typed twice.
 *
 * The last two have no source: they are self-routed, and the engine needs them
 * for pointer hover and touch shape-drawing.
 */
export const PROTOTYPE_MAPPINGS: readonly ButtonMapping[] = [
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

/**
 * The namespace of the library's own container definitions — the cells, text
 * hosts, scroll, transport-hiding renderer and chrome — shipped as static files
 * in the render pack. A compiled screen references them by name and emits
 * only what varies per screen.
 */
export const CHEST = 'core_ui_chest';

/**
 * The namespace of the controls no host owns: the ones that are the same
 * wherever they are drawn, because they read nothing and bind nothing. A
 * scrolling region is the first of them.
 */
export const SHAPES = 'core_ui_shapes';

/** Self-routed entries carry no source and are never rewritten. */
export const isSelfRouted = (mapping: ButtonMapping): boolean => mapping.from_button_id === undefined;

/** The variable a slot host passes to its child. Ordinary property, so legal. */
export const SLOT_VAR = '$slot';

/** Which cell definition a slot host instantiates: an item, or a button face. */
export const CELL_VAR = '$cell';

/**
 * Baked children of a button sit above the button, not just the face.
 * `container_item` mounts the button subtree at layer 5, and the hover and
 * pressed faces live in there — at 3 a caption vanished under them, measured.
 * Below the lock overlay (6) matters to nothing here, since a transport is
 * never locked, and bundles sit at 10.
 */
export const FACE_CONTENT_LAYER = 12;

/**
 * Every label is drawn at the form render pack's base size and scaled from
 * there, so the layout measured at build time is what the engine paints.
 */
export const FONT_SIZE = 'small';

/** A literal inside a JSON UI expression is single-quoted. */
export const literal = (value: string): string => `'${value.replaceAll(String.fromCharCode(39), '')}'`;

export const topLeft = {
  anchor_from: 'top_left',
  anchor_to: 'top_left',
} as const;

export const FULL: [Measure, Measure] = ['100%', '100%'];

export const offsetOf = (rect: Rect): [number, number] => [rect.x, rect.y];
export const sizeOf = (rect: Rect): [number, number] => [rect.width, rect.height];

/** Emitted only when the author asked, so nothing is layered by accident. */
export const layerOf = (node: { layer?: number }): { layer?: number } =>
  node.layer === undefined ? {} : { layer: node.layer };

/** Emitted only when the author hid the control, since visible is the default. */
export const visibilityOf = (node: { visible?: boolean }): { visible?: false } =>
  node.visible === false ? { visible: false } : {};

/** A nineslice stretched over the whole control, under whatever else it draws. */
export const backgroundOf = (node: { background?: string }): ControlEntry[] => (
  node.background === undefined || node.background === ''
    ? []
    : [{ bg: { type: 'image', texture: node.background, size: FULL, keep_ratio: false } }]
);

/** A collection name, made safe to sit in a definition name and a reference. */
export const collectionKey = (collection: string): string => collection.replaceAll(/[^A-Za-z0-9_]/g, '_');

export const num = (value: unknown, fallback = 0): number =>
  typeof value === 'number' && Number.isFinite(value) ? value : fallback;

export const str = (value: unknown, fallback = ''): string =>
  typeof value === 'string' ? value : fallback;

/**
 * The string a serializing component parks in its `value` tail, or undefined
 * when the tail is a RawMessage the client would have resolved.
 */
export const tailOf = (value: unknown): string | undefined => {
  if (typeof value !== 'object' || value === null || !('tail' in value)) {
    return undefined;
  }

  const { tail } = value;

  return typeof tail === 'string' ? tail : undefined;
};

/**
 * The name a shared face takes: its kind and a hash of everything that makes
 * it look the way it does. Two screens of one addon that draw the same look
 * therefore name the same definition, and the addon's `faces.json` holds it
 * once. FNV-1a, 32 bits, printed as eight hex digits; the face pass refuses
 * two different looks that land on one name.
 */
export const faceId = (kind: string, signature: string): string => {
  let hash = 0x811c9dc5;

  for (let index = 0; index < signature.length; index += 1) {
    hash ^= signature.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }

  return `${kind}_${hash.toString(16).padStart(8, '0')}`;
};

/**
 * Registers a shared face under its id, or checks that the one already there
 * is the same look — a hash collision is a build error, never a silent swap.
 */
export const shareFace = (faces: Record<string, Control>, id: string, control: Control): string => {
  const existing = faces[id];

  if (existing === undefined) {
    faces[id] = control;
  } else if (JSON.stringify(existing) !== JSON.stringify(control)) {
    throw new Error(`Two different looks hash to the face "${id}"; rename or restyle one of them.`);
  }

  return id;
};

/** The entry name of a single-control entry, without its `@base`. */
export const entryName = (entry: ControlEntry): string => {
  const [key] = Object.keys(entry);

  return (key ?? '').split('@')[0] ?? '';
};

/** The one control a single-control entry holds. */
export const entryControl = (entry: ControlEntry): Control => {
  const [control] = Object.values(entry);

  if (control === undefined) {
    throw new Error('An entry holds no control.');
  }

  return control;
};

/**
 * Where a control sits, as the layout decided it: the properties a host may
 * never change when it stands a mechanism in for a face.
 */
export const placementOf = (control: Control): Record<string, unknown> => ({
  size: control.size,
  offset: control.offset,
  anchor_from: control.anchor_from,
  anchor_to: control.anchor_to,
  layer: control.layer,
});

/** A control moved to its parent's origin, its outer placement handed to a wrapper. */
export const rebased = (control: Control): Control => {
  const { layer: _layer, visible: _visible, ...rest } = control;

  return { ...rest, offset: [0, 0] };
};

/** The empty-cell texture vanilla draws under every item cell. */
export const CELL_TEXTURE = 'textures/ui/cell_image';

/** An empty item cell at rest: the frame alone. */
export const cellFrame = (rect: Rect): Control => ({
  type: 'image',
  texture: CELL_TEXTURE,
  size: sizeOf(rect),
  offset: offsetOf(rect),
  ...topLeft,
  keep_ratio: false,
});
