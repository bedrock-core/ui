/**
 * IR -> JSON UI.
 *
 * Every rule encoded here was measured in game, on the spike branch, against a
 * hand-written target that rendered clean. They are not stylistic:
 *
 *  1. THE HOST RULE. `collection_index` is accepted only on a direct child of a
 *     control declaring `collection_name`, and `collection_name` is legal only
 *     on `stack_panel` and `grid`. So anything that reads a slot gets a
 *     one-child `stack_panel` host directly above it. The host carries the
 *     solved offset, the child carries the index.
 *
 *  2. NO VARIABLES IN BINDINGS. A `$var` inside `source_property_name` kills the
 *     property outright in a subtree inserted through `modifications`. Every
 *     number in a binding is baked as a literal, which also means no shared,
 *     parameterised control can own a binding — hence one definition per control
 *     *shape*, with references supplying what varies.
 *
 *  3. EXPLICIT PIXEL SIZES on anything under a host. A percentage child of a
 *     stack panel resolves unreliably along the stacking axis, and the solved
 *     rect is known anyway.
 *
 *  4. `keep_ratio: false` on images. An image preserves its texture's aspect
 *     ratio by default, so a stretched bar renders narrower than its box while a
 *     clipped overlay on top does not.
 *
 *  5. `localize: false` on literal text, because labels localize by default.
 */

import type { IrDocument, IrNode, PanelNode, Rect, SlotFace, SlotNode, TextNode } from './ir';
import type { Binding, ButtonMapping, Control, ControlEntry, Document, Measure } from './jsonui';

/** Shared definition names. One per control shape, never one per node. */
const DEF = {
  slotHost: 'slot_host',
  slot: 'slot',
  inputSlot: 'input_slot',
  inputStates: 'input_states',
  empty: 'empty',
  clipHost: 'clip_host',
  clip: 'clip_image',
  textHost: 'text_host',
  text: 'text_channel',
} as const;

/**
 * Shapes needing a shared definition. Not the same as `IrNode['kind']`: a label
 * is one kind but two shapes, because a dynamic one reads a collection and a
 * static one bakes its string, and an input slot is a third because it carries
 * its own button.
 */
type Shape = 'slot' | 'input' | 'clip' | 'text';

/**
 * Vanilla's `common.container_slot_button_prototype` routes, verbatim. A
 * derived control's `button_mappings` REPLACES its base's rather than merging,
 * so any slot that changes one route has to restate the whole table — this is
 * the table, and the two variants below are derived from it rather than typed
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

const DROP_ROUTES = new Set(['button.drop_one', 'button.drop_all']);

/** Self-routed entries carry no source and are never rewritten. */
const isSelfRouted = (mapping: ButtonMapping): boolean => mapping.from_button_id === undefined;

/**
 * A button slot's routes: every item-moving route becomes AUTO-PLACE.
 *
 * Vanilla's default, take-to-cursor, hangs the transport item on the mouse
 * where the engine draws it HARDCODED — no JSON UI control renders the held
 * stack, so nothing can hide it there. Auto-place sends it to the player's
 * inventory instead, which IS ours to draw: the screen's own grids render a
 * transport as nothing, so the press becomes invisible end to end.
 *
 * The drop routes fold in too, because Q over a button would throw the
 * transport on the GROUND — the one place the runtime cannot reach it. So does
 * the double-click coalesce, which would otherwise gather transports from
 * every other button onto the cursor.
 *
 * Two costs, both accepted: a press with a completely FULL inventory has
 * nowhere to auto-place and does nothing, and a double-click auto-places twice
 * — harmlessly, since the slot is already empty the second time.
 */
const BUTTON_MAPPINGS: ButtonMapping[] = PROTOTYPE_MAPPINGS.map(mapping => (
  isSelfRouted(mapping) ? mapping : { ...mapping, to_button_id: 'button.container_auto_place' }
));

/**
 * An input slot's routes: vanilla's, minus the drops.
 *
 * An input slot refuses a take, and a refusal is an UNDO: the runtime finds the
 * item on the player and puts it back. A drop is the one take it cannot undo,
 * because the item lands on the ground where nothing can retrieve it — so Q
 * over an input slot is simply not a route. Every other take still goes to the
 * cursor or the inventory, both of which the undo reaches.
 */
const INPUT_MAPPINGS: ButtonMapping[] = PROTOTYPE_MAPPINGS.filter(
  mapping => !DROP_ROUTES.has(mapping.to_button_id),
);

/** The variable a slot host passes to its child. Ordinary property, so legal. */
const SLOT_VAR = '$slot';

/** Which cell definition a slot host instantiates: an item, or a button face. */
const CELL_VAR = '$cell';

/**
 * Private name a text channel's string is renamed to.
 *
 * Never `#hover_text` itself: the engine owns that name at screen scope and
 * overwrites it while a slot is pressed.
 */
const TEXT_PROPERTY = '#channel_text';

/** A literal inside a JSON UI expression is single-quoted. */
const literal = (value: string): string => `'${value.replaceAll(String.fromCharCode(39), '')}'`;

const topLeft = {
  anchor_from: 'top_left',
  anchor_to: 'top_left',
} as const;

const offsetOf = (rect: Rect): [number, number] => [rect.x, rect.y];

/** Emitted only when the author asked, so nothing is layered by accident. */
const layerOf = (node: { layer?: number }): { layer?: number } =>
  node.layer === undefined ? {} : { layer: node.layer };
const sizeOf = (rect: Rect): [number, number] => [rect.width, rect.height];

/**
 * Definitions shared by every node of a given kind. Emitted only when the tree
 * actually contains one, so a screen with no bars carries no bar definitions.
 */
const sharedDefs = (ns: string, collection: string, kinds: Set<Shape>): Record<string, Control> => {
  const defs: Record<string, Control> = {};

  if (kinds.has('text')) {
    defs[DEF.textHost] = {
      type: 'stack_panel',
      orientation: 'vertical',
      size: ['100%c', '100%c'],
      ...topLeft,
      collection_name: collection,
      controls: [],
    };
  }

  if (kinds.has('slot')) {
    defs[DEF.slotHost] = {
      type: 'stack_panel',
      orientation: 'vertical',
      size: [18, 18],
      ...topLeft,
      collection_name: collection,
      [`${SLOT_VAR}|default`]: 0,
      // The cell is a variable so one host serves both an ordinary slot and a
      // button, which differ only in what they draw. A `$var` is fine here:
      // the rule that kills them applies to bindings, and this is a reference.
      [`${CELL_VAR}|default`]: DEF.slot,
      controls: [{ [`cell@${CELL_VAR}`]: { collection_index: SLOT_VAR } }],
    };

    defs[DEF.slot] = {
      type: 'panel',
      size: [18, 18],
      controls: [{ 'item@common.container_item': { $item_collection_name: collection } }],
    };

    // Stands in for the item renderer on a button, so the transport item is
    // never drawn. A control with no size and no content, which is exactly what
    // a button needs where its icon would be.
    defs[DEF.empty] = { type: 'panel', size: [0, 0] };
  }

  if (kinds.has('input')) {
    // Vanilla's slot, with a button of its own so Q is not a route. Looks and
    // behaves identically otherwise: the prototype supplies everything but the
    // table.
    defs[`${DEF.inputStates}@common.container_slot_button_prototype`] = {
      button_mappings: INPUT_MAPPINGS,
    };

    defs[DEF.inputSlot] = {
      type: 'panel',
      size: [18, 18],
      controls: [{
        'item@common.container_item': {
          $item_collection_name: collection,
          $button_ref: `${ns}.${DEF.inputStates}`,
        },
      }],
    };
  }

  if (kinds.has('clip')) {
    defs[DEF.clipHost] = {
      type: 'stack_panel',
      orientation: 'vertical',
      size: [0, 0],
      ...topLeft,
      collection_name: collection,
      controls: [],
    };

    // A fill: an image revealed in proportion to a number. Two of these, one
    // whole and one clipped, are what a bar is made of -- there is no bar
    // control, because the same pair makes a gauge, a meter or a cooldown.
    //
    // `keep_ratio: false` because an image preserves its texture's aspect ratio
    // by default, so a stretched fill renders narrower than its box while the
    // clip on top does not.
    defs[DEF.clip] = {
      type: 'image',
      texture: '',
      size: ['100%', '100%'],
      keep_ratio: false,
      clip_pixelperfect: false,
      bindings: [
        { binding_type: 'collection_details', binding_collection_name: collection },
        {
          binding_name: '#item_durability_current_amount',
          binding_name_override: '#dur',
          binding_type: 'collection',
          binding_collection_name: collection,
        },
        {
          binding_name: '#item_durability_total_amount',
          binding_name_override: '#durmax',
          binding_type: 'collection',
          binding_collection_name: collection,
        },
        {
          binding_type: 'view',
          source_property_name: '(#dur / #durmax)',
          target_property_name: '#clip_ratio',
        },
      ],
    };
  }

  return defs;
};

/** Where the raw code lands before the key is built around it. */
const TEXT_RAW_PROPERTY = '#channel_raw';

/**
 * What lets two text runs share a definition: everything except which slots
 * they read.
 */
const signatureOf = (node: TextNode): string => JSON.stringify([
  node.keyPrefix,
  node.color ?? null,
  node.shadow ?? null,
]);

/**
 * The definition one character cell instantiates.
 *
 * A binding cannot be parameterised: a `$variable` inside one is dropped
 * outright in a subtree inserted through `modifications` -- measured six ways
 * on the spike -- so every name in a binding is baked here, and a reference may
 * only supply what is NOT a binding: the collection index, and the box.
 *
 * The cell reads its slot's STACK SIZE, builds `keyPrefix + code`, and
 * localizes it. No per-slot binding publishes text, so this is how a string
 * gets in: the generated `.lang` decides what each code draws as, which means
 * any glyph, any font, any language.
 */
const textDef = (node: TextNode, collection: string): Control => ({
  type: 'label',
  // Its own natural size. The cells are packed by the engine rather than
  // positioned by the compiler, because glyph widths are not knowable here:
  // which character lands in a cell is decided at runtime. On a fixed pitch
  // every narrow glyph left a gap -- `units` came out `uni ts`.
  size: ['default', 'default'],
  text: TEXT_PROPERTY,
  localize: true,
  ...node.color ? { color: node.color } : {},
  ...node.shadow ? { shadow: node.shadow } : {},
  bindings: [
    { binding_type: 'collection_details', binding_collection_name: collection },
    {
      binding_name: '#inventory_stack_count',
      binding_name_override: TEXT_RAW_PROPERTY,
      binding_type: 'collection',
      binding_collection_name: collection,
    },
    {
      binding_type: 'view',
      source_property_name: `(${literal(node.keyPrefix)} + ${TEXT_RAW_PROPERTY})`,
      target_property_name: TEXT_PROPERTY,
    },
  ],
});

/**
 * Where a button's enabled state is read from: whether its slot holds an item.
 *
 * The runtime keeps a transport item in the slot exactly while the button has a
 * handler, so presence IS enabledness, and no channel has to carry it. The
 * transport is damaged on purpose (its durability is the runtime's mark), so
 * `#item_durability_visible` — the flag vanilla's own bar shows on — is true
 * for it and false for an empty slot. Nothing else ever sits in a button slot.
 */
const ENABLED_PROPERTY = '#enabled';

/**
 * Reads the slot's enabled flag into {@link ENABLED_PROPERTY}. Every control
 * that draws differently by state carries its own copy, since a binding cannot
 * be shared.
 */
const enabledBindings = (collection: string) => [
  { binding_type: 'collection_details', binding_collection_name: collection },
  {
    binding_name: '#item_durability_visible',
    binding_name_override: ENABLED_PROPERTY,
    binding_type: 'collection',
    binding_collection_name: collection,
  },
] as const satisfies Binding[];

/** Visible only while the button is enabled. */
const whenEnabled = (collection: string): Binding[] => [
  ...enabledBindings(collection),
  {
    binding_type: 'view',
    source_property_name: `(${ENABLED_PROPERTY})`,
    target_property_name: '#visible',
  },
];

/** Visible only while the button is disabled. */
const whenDisabled = (collection: string): Binding[] => [
  ...enabledBindings(collection),
  {
    binding_type: 'view',
    source_property_name: `(not ${ENABLED_PROPERTY})`,
    target_property_name: '#visible',
  },
];

/**
 * The three definitions one button appearance needs.
 *
 * A press reaches script only as an item move, so a button IS a container slot
 * — but `common.container_item` takes its face, its icon and its button as
 * variables, so none of it has to look like an item. The icon becomes nothing,
 * the overlays are turned off, and the face becomes a real button with hover
 * and pressed states. The item underneath is pure transport.
 *
 * The button itself EXTENDS vanilla's rather than replacing it, because the
 * transaction is the whole point: lose it and the button stops reporting.
 *
 * Hover and pressed are gated on the slot holding a transport, so a disabled
 * button does not react; the resting face is gated the same way only when the
 * author supplied a disabled look to swap in.
 */
const faceDefs = (
  face: SlotFace,
  name: string,
  ns: string,
  collection: string,
): Record<string, Control> => ({
  [`${name}_face`]: {
    type: 'panel',
    size: ['100%', '100%'],
    controls: [
      {
        bg: {
          type: 'image',
          texture: face.texture,
          size: ['100%', '100%'],
          keep_ratio: false,
          layer: 1,
          ...face.disabled === undefined ? {} : { bindings: whenEnabled(collection) },
        },
      },
      ...face.disabled === undefined
        ? []
        : [{
          bg_disabled: {
            type: 'image' as const,
            texture: face.disabled,
            size: ['100%', '100%'] satisfies [Measure, Measure],
            keep_ratio: false,
            layer: 1,
            bindings: whenDisabled(collection),
          },
        } satisfies ControlEntry],
      ...face.label === ''
        ? []
        : [{
          caption: {
            type: 'label' as const,
            text: face.label,
            localize: false,
            anchor_from: 'center' as const,
            anchor_to: 'center' as const,
            // Above the button, not just the face. `container_item` mounts the
            // button subtree at layer 5, and the hover and pressed faces live
            // in there — at 3 the caption vanished under them, measured.
            // Below the lock overlay (6) matters to nothing here, since a
            // transport is never locked, and bundles sit at 10.
            layer: 12,
          },
        } satisfies ControlEntry],
    ],
  },

  [`${name}_states@common.container_slot_button_prototype`]: {
    hover_control: 'hover',
    pressed_control: 'pressed',
    button_mappings: BUTTON_MAPPINGS,
    // Two visibilities, on two controls. The button toggles `hover` and
    // `pressed` itself as the pointer comes and goes, and a binding writing
    // `#visible` on the SAME control fights it: re-enabling a button set both
    // faces visible at once, pointer or no pointer, until the next hover made
    // the engine recompute — measured. So the engine owns the outer panel, the
    // gate owns the image inside, and a state is drawn only when both agree.
    controls: [
      {
        hover: {
          type: 'panel',
          size: ['100%', '100%'],
          controls: [{
            image: {
              type: 'image',
              texture: face.hover,
              size: ['100%', '100%'],
              keep_ratio: false,
              bindings: whenEnabled(collection),
            },
          }],
        },
      },
      {
        pressed: {
          type: 'panel',
          size: ['100%', '100%'],
          controls: [{
            image: {
              type: 'image',
              texture: face.pressed,
              size: ['100%', '100%'],
              keep_ratio: false,
              bindings: whenEnabled(collection),
            },
          }],
        },
      },
    ],
  },

  [name]: {
    type: 'panel',
    size: [18, 18],
    controls: [
      {
        'item@common.container_item': {
          $item_collection_name: collection,
          $background_images: `${ns}.${name}_face`,
          $item_renderer: `${ns}.${DEF.empty}`,
          $button_ref: `${ns}.${name}_states`,
          // Nothing about the transport item may show: not its count, not its
          // durability — which a text channel rides — and not its storage.
          $stack_count_required: false,
          $durability_bar_required: false,
          $storage_bar_required: false,
        },
      },
    ],
  },
});

/** Collects every button's face, so one set of definitions is emitted per look. */
const collectFaces = (node: IrNode, into: SlotFace[] = []): SlotFace[] => {
  if (node.kind === 'slot' && node.face) {
    into.push(node.face);
  }

  if (node.kind === 'panel') {
    for (const child of node.children) {
      collectFaces(child, into);
    }
  }

  return into;
};

/** Collects every text run, so one definition can be emitted per shape. */
const collectTexts = (node: IrNode, into: TextNode[] = []): TextNode[] => {
  if (node.kind === 'text') {
    into.push(node);
  }

  if (node.kind === 'panel') {
    for (const child of node.children) {
      collectTexts(child, into);
    }
  }

  return into;
};

const collectShapes = (node: IrNode, into: Set<Shape>): void => {
  if (node.kind === 'slot') {
    into.add('slot');

    if (node.role === 'input') {
      into.add('input');
    }
  }

  if (node.kind === 'image' && node.channel !== undefined) {
    into.add('clip');
  }

  if (node.kind === 'text') {
    into.add('text');
  }

  if (node.kind === 'panel') {
    for (const child of node.children) {
      collectShapes(child, into);
    }
  }
};

/**
 * Which cell a slot host instantiates. Three shapes: a button face, an input
 * slot with its drop routes removed, or the plain slot the host defaults to.
 */
const cellOf = (
  node: SlotNode,
  ns: string,
  faceNames: Map<string, string>,
): { [CELL_VAR]?: string } => {
  if (node.face) {
    return { [CELL_VAR]: `${ns}.${faceNames.get(JSON.stringify(node.face)) ?? DEF.slot}` };
  }

  if (node.role === 'input') {
    return { [CELL_VAR]: `${ns}.${DEF.inputSlot}` };
  }

  return {};
};

/**
 * One node becomes one entry in its parent's `controls`. Static leaves are
 * inlined; anything reading a slot becomes a host reference, because the index
 * has nowhere else to live.
 */
const emitNode = (
  node: IrNode,
  ns: string,
  textNames: Map<string, string>,
  faceNames: Map<string, string>,
): ControlEntry => {
  switch (node.kind) {
    case 'panel':
      return {
        [node.name]: {
          type: 'panel',
          size: sizeOf(node.rect),
          ...layerOf(node),
          offset: offsetOf(node.rect),
          ...topLeft,
          controls: node.children.map(child => emitNode(child, ns, textNames, faceNames)),
        },
      };

    case 'label':
      return {
        [node.name]: {
          type: 'label',
          size: sizeOf(node.rect),
          ...layerOf(node),
          offset: offsetOf(node.rect),
          ...topLeft,
          text: node.text,
          localize: node.localize ?? false,
          ...node.color ? { color: node.color } : {},
          ...node.shadow ? { shadow: node.shadow } : {},
        },
      };

    case 'text': {
      // One host per cell, because `collection_index` is only accepted on a
      // direct child of a control declaring `collection_name`. The hosts sit in
      // a horizontal stack panel and hug their glyph, so the run reads as text
      // rather than as a grid of letters.
      const def = textNames.get(signatureOf(node)) ?? DEF.text;
      const hug: [string, string] = ['100%c', '100%c'];

      return {
        [node.name]: {
          type: 'stack_panel',
          orientation: 'horizontal',
          size: sizeOf(node.rect),
          offset: offsetOf(node.rect),
          ...layerOf(node),
          ...topLeft,
          controls: Array.from({ length: node.length }, (_unused, cell) => ({
            [`cell_${cell}@${ns}.${DEF.textHost}`]: {
              size: hug,
              controls: [{ [`glyph@${ns}.${def}`]: { collection_index: node.channel + cell } }],
            },
          })),
        },
      };
    }

    case 'image':
      // A plain image is inlined; a clipped one has to reach a slot, so it gets
      // a host for its index like anything else that reads the collection.
      if (node.channel === undefined) {
        return {
          [node.name]: {
            type: 'image',
            size: sizeOf(node.rect),
            ...layerOf(node),
            offset: offsetOf(node.rect),
            ...topLeft,
            texture: node.texture,
            keep_ratio: false,
          },
        };
      }

      return {
        [`${node.name}@${ns}.${DEF.clipHost}`]: {
          offset: offsetOf(node.rect),
          size: sizeOf(node.rect),
          ...layerOf(node),
          controls: [
            {
              [`fill@${ns}.${DEF.clip}`]: {
                collection_index: node.channel,
                size: sizeOf(node.rect),
                texture: node.texture,
                ...node.direction ? { clip_direction: node.direction } : {},
              },
            },
          ],
        },
      };

    case 'ref':
      // Something the game already defines: the compiled screen owns the whole
      // chest screen, so anything vanilla the author still wants is asked for
      // by name. Sizing is optional because several vanilla parts size
      // themselves and resist being told otherwise.
      return {
        [`${node.name}@${node.ref}`]: node.sized
          ? { offset: offsetOf(node.rect), size: sizeOf(node.rect), ...topLeft, ...layerOf(node) }
          : layerOf(node),
      };

    case 'slot':
      return {
        [`${node.name}@${ns}.${DEF.slotHost}`]: {
          offset: offsetOf(node.rect),
          size: sizeOf(node.rect),
          ...layerOf(node),
          [SLOT_VAR]: node.slot,
          ...cellOf(node, ns, faceNames),
        },
      };
  }
};

/** Turns a solved tree into a JSON UI document. */
export const emit = (doc: IrDocument): Document => {
  const kinds = new Set<Shape>();

  collectShapes(doc.root, kinds);

  const root: PanelNode = doc.root;

  const document: Document = {
    namespace: doc.namespace,
    ...sharedDefs(doc.namespace, doc.collection, kinds),
  };

  // One definition per distinct text channel shape, shared by every label that
  // wants it. Channels differing only in which slot they read collapse onto the
  // same definition, because the index is the one thing a reference may supply.
  const textNames = new Map<string, string>();

  for (const node of collectTexts(root)) {
    const signature = signatureOf(node);

    if (textNames.has(signature)) {
      continue;
    }

    const name = `${DEF.text}_${textNames.size + 1}`;

    textNames.set(signature, name);
    document[name] = textDef(node, doc.collection);
  }

  // One set of definitions per distinct button appearance. Buttons differing
  // only in which slot they read collapse onto the same face.
  const faceNames = new Map<string, string>();

  for (const face of collectFaces(root)) {
    const signature = JSON.stringify(face);

    if (faceNames.has(signature)) {
      continue;
    }

    const name = `button_${faceNames.size + 1}`;

    faceNames.set(signature, name);
    Object.assign(document, faceDefs(face, name, doc.namespace, doc.collection));
  }

  document[doc.entry] = {
    type: 'panel',
    size: sizeOf(root.rect),
    ...topLeft,
    controls: root.children.map(child => emitNode(child, doc.namespace, textNames, faceNames)),
  };

  return document;
};
