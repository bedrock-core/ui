/**
 * IR -> JSON UI.
 *
 * Every rule encoded here was measured in game, against a hand-written target
 * that rendered clean. They are not stylistic:
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
 *     ratio by default, so a stretched image renders narrower than the box the
 *     layout solved for it.
 *
 *  5. `localize: false` on literal text, because labels localize by default.
 */

import { GUARD_ORDINAL, PROTOCOL_ITEM_AUX, TRANSPORT_ORDINAL } from '@bedrock-core/ui-runtime/compile';
import type { ButtonNode, GridNode, IrDocument, IrNode, PanelNode, Rect, SlotNode, TextNode } from './ir';
import type { Binding, ButtonMapping, Control, ControlEntry, Document, Measure } from './jsonui';

/** Name of the definition the router mounts: the canvas with everything on it. */
export const SCREEN_DEFINITION = 'screen';

/**
 * A full-canvas button that swallows a click so it never falls through to the
 * chest screen's drop-the-cursor mapping. Sits under the content — the slots
 * and buttons above it handle their own clicks — so only empty space inside the
 * container absorbs, and a click OUTSIDE the canvas still drops, the way a click
 * beside a vanilla furnace's panel does.
 */
const CLICK_SHIELD: ControlEntry = {
  core_ui_click_shield: {
    type: 'button',
    size: ['100%', '100%'],
    button_mappings: [
      { from_button_id: 'button.menu_select', to_button_id: 'button.menu_select', mapping_type: 'pressed' },
      { from_button_id: 'button.menu_ok', to_button_id: 'button.menu_ok', mapping_type: 'pressed' },
    ],
  },
};

/** Name of the full-screen image the router mounts behind the canvas, when the screen has one. */
export const BACKDROP_DEFINITION = 'backdrop';

/** Shared definition names. One per control shape, never one per node. */
const DEF = {
  slotHost: 'slot_host',
  slot: 'slot',
  noDropStates: 'no_drop_states',
  outputSlot: 'output_slot',
  lockedSlot: 'locked_slot',
  displayStates: 'display_states',
  empty: 'empty',
  textHost: 'text_host',
  text: 'text_channel',
} as const;

/**
 * Shapes needing a shared definition. Not the same as `IrNode['kind']`: a slot
 * and a button share the host, a locked slot swaps the cell for an inert one,
 * and a live text run is a shape a baked label is not.
 */
type Shape = 'slot' | 'output' | 'locked' | 'text';

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

/** The two drop routes an input slot loses: a dropped item lands out of the runtime's reach. */
const DROP_ROUTES = new Set(['button.drop_one', 'button.drop_all']);

/**
 * Every slot's routes: vanilla's, minus the drops.
 *
 * Dropping happens outside a container, never inside one — a Q over a container
 * slot is simply not a route. It is also the one take the runtime cannot undo,
 * because the item lands on the ground where nothing can retrieve it. Every
 * other take still goes to the cursor or the inventory.
 */
const NO_DROP_MAPPINGS: ButtonMapping[] = PROTOTYPE_MAPPINGS.filter(
  mapping => !DROP_ROUTES.has(mapping.to_button_id),
);

/**
 * Vanilla's close button routes: a press closes the screen on the client, and
 * the server hears it as the container closing.
 */
const EXIT_MAPPINGS: ButtonMapping[] = [
  { from_button_id: 'button.menu_select', to_button_id: 'button.menu_exit', mapping_type: 'pressed' },
  { from_button_id: 'button.menu_ok', to_button_id: 'button.menu_exit', mapping_type: 'pressed' },
];

/** Self-routed entries carry no source and are never rewritten. */
const isSelfRouted = (mapping: ButtonMapping): boolean => mapping.from_button_id === undefined;

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
 * nowhere to auto-place and does nothing, and a double-click auto-places twice
 * — harmlessly, since the slot is already empty the second time.
 */
const BUTTON_MAPPINGS: ButtonMapping[] = PROTOTYPE_MAPPINGS.map(mapping => (
  isSelfRouted(mapping) ? mapping : { ...mapping, to_button_id: 'button.container_auto_place' }
));

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

/** Where the raw code lands before the key is built around it. */
const TEXT_RAW_PROPERTY = '#channel_raw';

/**
 * Where a button's enabled state is read from: whether its slot holds the
 * TRANSPORT, by its exact mark — the protocol aux and the transport ordinal.
 *
 * The runtime keeps a transport in the slot exactly while the button is
 * enabled and the guard while it is not, so the slot always holds one of two
 * damaged protocol items and only the ordinal tells them apart. A mere
 * has-durability check would read the guard as enabled.
 */
const ENABLED_PROPERTY = `((#btn_aux = ${PROTOCOL_ITEM_AUX}) and (#btn_dur = ${TRANSPORT_ORDINAL}))`;

/**
 * Baked children of a button sit above the button, not just the face.
 * `container_item` mounts the button subtree at layer 5, and the hover and
 * pressed faces live in there — at 3 a caption vanished under them, measured.
 * Below the lock overlay (6) matters to nothing here, since a transport is
 * never locked, and bundles sit at 10.
 */
const FACE_CONTENT_LAYER = 12;

/**
 * Every label is drawn at the form render pack's base size and scaled from
 * there, so the layout measured at build time is what the engine paints.
 */
const FONT_SIZE = 'small';

/** A literal inside a JSON UI expression is single-quoted. */
const literal = (value: string): string => `'${value.replaceAll(String.fromCharCode(39), '')}'`;

const topLeft = {
  anchor_from: 'top_left',
  anchor_to: 'top_left',
} as const;

const FULL: [Measure, Measure] = ['100%', '100%'];

const offsetOf = (rect: Rect): [number, number] => [rect.x, rect.y];
const sizeOf = (rect: Rect): [number, number] => [rect.width, rect.height];

/** Emitted only when the author asked, so nothing is layered by accident. */
const layerOf = (node: { layer?: number }): { layer?: number } =>
  node.layer === undefined ? {} : { layer: node.layer };

/** Emitted only when the author hid the control, since visible is the default. */
const visibilityOf = (node: { visible?: boolean }): { visible?: false } =>
  node.visible === false ? { visible: false } : {};

/** A nineslice stretched over the whole control, under whatever else it draws. */
const backgroundOf = (node: PanelNode): ControlEntry[] => (
  node.background === undefined || node.background === ''
    ? []
    : [{ bg: { type: 'image', texture: node.background, size: FULL, keep_ratio: false } }]
);

/**
 * Definitions shared by every node of a given shape. Emitted only when the tree
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

    // Every slot's cell drops nothing: a Q over it is not a route, so items are
    // dropped outside a container, never into it. A slot with a button of its
    // own, otherwise vanilla's — the prototype supplies everything but the table.
    defs[`${DEF.noDropStates}@common.container_slot_button_prototype`] = {
      button_mappings: NO_DROP_MAPPINGS,
    };

    defs[DEF.slot] = {
      type: 'panel',
      size: [18, 18],
      controls: [{
        'item@common.container_item': {
          $item_collection_name: collection,
          $button_ref: `${ns}.${DEF.noDropStates}`,
        },
      }],
    };

    // Stands in for the item renderer on a button, so the transport item is
    // never drawn. A control with no size and no content, which is exactly what
    // a button needs where its icon would be.
    defs[DEF.empty] = { type: 'panel', size: [0, 0] };
  }

  if (kinds.has('output')) {
    // Two copies of the cell share the slot, toggled by what it holds.
    //
    // While the slot holds its guard, the REAL cell — the only
    // `container_item` in here — is invisible, and with it everything that can
    // feed the engine's hover text: no item render, no slot button, no
    // tooltip. What shows instead is the fake, a plain panel that draws
    // nothing of its own, so the slot looks exactly as empty as the author's
    // background makes it. A real result flips the toggle: the fake hides,
    // the real cell shows, and it hovers, tooltips and takes like any slot.
    //
    // The toggle reads the guard's aux and durability ordinal — the same
    // two-literal check the router runs on the sentinel, and the only kind a
    // slot answers: a container slot publishes NUMBERS, never text, so a name
    // comparison would sit unresolved and both copies would show. The gates
    // ride wrapper panels rather than the `container_item` instance, because
    // `bindings` on an instance REPLACES the base's own, which the item render
    // depends on.
    const guardCheck = `((#aux = ${PROTOCOL_ITEM_AUX}) and (#dur = ${GUARD_ORDINAL}))`;
    const markGate = (held: boolean): Binding[] => [
      { binding_type: 'collection_details', binding_collection_name: collection },
      {
        binding_name: '#item_id_aux',
        binding_name_override: '#aux',
        binding_type: 'collection',
        binding_collection_name: collection,
      },
      {
        binding_name: '#item_durability_current_amount',
        binding_name_override: '#dur',
        binding_type: 'collection',
        binding_collection_name: collection,
      },
      {
        binding_type: 'view',
        source_property_name: held ? guardCheck : `(not ${guardCheck})`,
        target_property_name: '#visible',
      },
    ];

    defs[DEF.outputSlot] = {
      type: 'panel',
      size: [18, 18],
      controls: [
        {
          result: {
            type: 'panel',
            size: ['100%', '100%'],
            bindings: markGate(false),
            controls: [{
              'item@common.container_item': {
                $item_collection_name: collection,
                $button_ref: `${ns}.${DEF.noDropStates}`,
              },
            }],
          },
        },
        {
          empty_slot: {
            type: 'panel',
            size: ['100%', '100%'],
            bindings: markGate(true),
          },
        },
      ],
    };
  }

  if (kinds.has('locked')) {
    // An inert button: no routes and no focus, so a cell it backs takes no
    // take, place or drop. `focus_enabled` is a button property, so it rides
    // here, not on the `container_item` that rejects it.
    defs[`${DEF.displayStates}@common.container_slot_button_prototype`] = {
      button_mappings: [],
      focus_enabled: false,
    };

    defs[DEF.lockedSlot] = {
      type: 'panel',
      size: [18, 18],
      controls: [{
        'item@common.container_item': {
          $item_collection_name: collection,
          $button_ref: `${ns}.${DEF.displayStates}`,
        },
      }],
    };
  }

  return defs;
};

/**
 * What lets two text runs share a definition: everything except which slots
 * they read.
 */
const textSignature = (node: TextNode): string => JSON.stringify([
  node.keyPrefix,
  node.fontType,
  node.fontScaleFactor,
  node.shadow ?? null,
]);

/**
 * The definition one character cell instantiates.
 *
 * A binding cannot be parameterised: a `$variable` inside one is dropped
 * outright in a subtree inserted through `modifications` -- measured six ways
 * -- so every name in a binding is baked here, and a reference may only supply
 * what is NOT a binding: the collection index, and the box.
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
  font_type: node.fontType,
  font_size: FONT_SIZE,
  font_scale_factor: node.fontScaleFactor,
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
 * Reads the slot item's aux and durability, the pair {@link ENABLED_PROPERTY}
 * compares against the transport's mark. Every control that draws differently
 * by state carries its own copy, since a binding cannot be shared.
 */
const enabledBindings = (collection: string) => [
  { binding_type: 'collection_details', binding_collection_name: collection },
  {
    binding_name: '#item_id_aux',
    binding_name_override: '#btn_aux',
    binding_type: 'collection',
    binding_collection_name: collection,
  },
  {
    binding_name: '#item_durability_current_amount',
    binding_name_override: '#btn_dur',
    binding_type: 'collection',
    binding_collection_name: collection,
  },
] as const satisfies Binding[];

/** Visible only while the button is enabled. */
const whenEnabled = (collection: string): Binding[] => [
  ...enabledBindings(collection),
  {
    binding_type: 'view',
    source_property_name: ENABLED_PROPERTY,
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

/** What the emitter carries down the tree. */
interface Emit {
  ns: string;
  collection: string;
  /** The host renderer that hides the runtime's transport item, if the host has one. */
  ownedRenderer?: string;
  /** Text run signature -> shared definition name. */
  textNames: Map<string, string>;
  /** Button look signature -> shared definition name. */
  faceNames: Map<string, string>;
  /** Definitions a node needs of its own, such as a scroll region's content. */
  defs: Record<string, Control>;
}

/**
 * A node with its names stripped, so two nodes that draw the same thing
 * compare equal. Names only have to be unique within their parent, and a
 * shared definition supplies its own.
 */
const shapeOf = (node: IrNode): unknown => {
  const { name: _name, ...shape } = node;

  if (node.kind === 'panel' || node.kind === 'button' || node.kind === 'exit' || node.kind === 'scroll') {
    return { ...shape, children: node.children.map(shapeOf) };
  }

  return shape;
};

/**
 * What lets two buttons share a definition: the same look, at the same size,
 * with the same things baked into the face.
 */
const faceSignature = (node: ButtonNode): string => JSON.stringify({
  face: node.face,
  size: sizeOf(node.rect),
  children: node.children.map(shapeOf),
});

/**
 * The three definitions one button look needs.
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
 *
 * The cell and the item are sized to the button's solved rect, because
 * `container_item` and its `item_cell` default to the 18 x 18 item cell and a
 * face only ever fills that.
 */
const faceDefs = (node: ButtonNode, name: string, emit: Emit): Record<string, Control> => {
  const { face } = node;
  const { ns, collection } = emit;
  const size = sizeOf(node.rect);

  return {
    [`${name}_face`]: {
      type: 'panel',
      size: FULL,
      controls: [
        {
          bg: {
            type: 'image',
            texture: face.texture,
            size: FULL,
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
              size: FULL,
              keep_ratio: false,
              layer: 1,
              bindings: whenDisabled(collection),
            },
          } satisfies ControlEntry],
        ...node.children.length === 0
          ? []
          : [{
            content: {
              type: 'panel' as const,
              size: FULL,
              ...topLeft,
              layer: FACE_CONTENT_LAYER,
              controls: node.children.map(child => emitNode(child, emit)),
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
            size: FULL,
            controls: [{
              image: {
                type: 'image',
                texture: face.hover,
                size: FULL,
                keep_ratio: false,
                bindings: whenEnabled(collection),
              },
            }],
          },
        },
        {
          pressed: {
            type: 'panel',
            size: FULL,
            controls: [{
              image: {
                type: 'image',
                texture: face.pressed,
                size: FULL,
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
      size,
      controls: [
        {
          // The press surface exists only while the transport is in the slot.
          // A disabled button therefore has no button at all: a click or a
          // shift-click routes nowhere, so the guard that marks it disabled is
          // never auto-placed into the player's inventory where it would show.
          enabled: {
            type: 'panel',
            size: FULL,
            bindings: whenEnabled(collection),
            controls: [
              {
                'item@common.container_item': {
                  size,
                  $cell_image_size: size,
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
        },
        {
          // The face alone, no press surface. Its own gates draw the disabled
          // background and keep the caption.
          disabled: {
            type: 'panel',
            size: FULL,
            bindings: whenDisabled(collection),
            controls: [{ [`face@${ns}.${name}_face`]: {} }],
          },
        },
      ],
    },
  };
};

/** Every text run, in document order, buttons' faces included. */
const collectTexts = (node: IrNode, into: TextNode[] = []): TextNode[] => {
  if (node.kind === 'text') {
    into.push(node);
  }

  if (node.kind === 'panel' || node.kind === 'button' || node.kind === 'exit' || node.kind === 'scroll') {
    for (const child of node.children) {
      collectTexts(child, into);
    }
  }

  return into;
};

/** Every button, in document order, buttons' faces included. */
const collectButtons = (node: IrNode, into: ButtonNode[] = []): ButtonNode[] => {
  if (node.kind === 'button') {
    into.push(node);
  }

  if (node.kind === 'panel' || node.kind === 'button' || node.kind === 'exit' || node.kind === 'scroll') {
    for (const child of node.children) {
      collectButtons(child, into);
    }
  }

  return into;
};

const collectShapes = (node: IrNode, into: Set<Shape>): void => {
  switch (node.kind) {
    case 'slot':
      // A foreign slot registers its own defs on demand, keyed by its
      // collection; only the screen's own slots use the shared container defs.
      if (node.source === undefined) {
        into.add('slot');

        if (!node.interactive) {
          into.add('locked');
        } else if (node.role === 'output') {
          into.add('output');
        }
      }

      break;

    case 'button':
      into.add('slot');

      for (const child of node.children) {
        collectShapes(child, into);
      }

      break;

    case 'exit':
      for (const child of node.children) {
        collectShapes(child, into);
      }

      break;

    case 'scroll':
      for (const child of node.children) {
        collectShapes(child, into);
      }

      break;

    case 'text':
      into.add('text');

      break;

    case 'panel':
      for (const child of node.children) {
        collectShapes(child, into);
      }

      break;

    default:
      break;
  }
};

/**
 * Which cell a slot host instantiates: an inert cell for a locked slot, a
 * name-gated cell for an output slot (hidden while it holds its blank
 * placeholder, so no tooltip shows), or the host's default otherwise. An
 * input's refusals are the runtime's, so it needs no cell of its own.
 */
const cellOf = (node: SlotNode, ns: string): { [CELL_VAR]?: string } => {
  if (!node.interactive) {
    return { [CELL_VAR]: `${ns}.${DEF.lockedSlot}` };
  }

  return node.role === 'output' ? { [CELL_VAR]: `${ns}.${DEF.outputSlot}` } : {};
};

/** A collection name, made safe to sit in a definition name and a reference. */
const collectionKey = (collection: string): string => collection.replaceAll(/[^A-Za-z0-9_]/g, '_');

/**
 * What `common.container_item` needs to draw the given collection: its item,
 * and nothing that reveals the runtime's transport. `interactive: false`
 * withholds focus, which is what makes the cell inert — no take, no place, no
 * drop — since the engine's slot has no take-only or place-only action to bake
 * instead. `renderer`, when given, hides a transport item for a player's own
 * grids.
 */
/**
 * A shared inert button: no routes and no focus, so the cell it backs takes
 * no take, place or drop. `focus_enabled` is a button property, so it rides
 * here rather than on the `container_item` panel, which rejects it.
 */
const ensureDisplayStates = (emit: Emit): string => {
  const key = `${DEF.displayStates}@common.container_slot_button_prototype`;

  if (emit.defs[key] === undefined) {
    emit.defs[key] = { button_mappings: [], focus_enabled: false };
  }

  return `${emit.ns}.${DEF.displayStates}`;
};

const containerItemVars = (emit: Emit, collection: string, interactive: boolean, renderer?: string): Control => ({
  $item_collection_name: collection,
  ...renderer === undefined ? {} : { $item_renderer: renderer, $durability_bar_required: false },
  ...interactive ? {} : { $button_ref: ensureDisplayStates(emit) },
});

/**
 * A foreign slot's cell definition, registered once per collection and
 * interactivity. Display-only cells withhold focus on the wrapper as well as
 * the item, so nothing in the subtree can be focused.
 */
const ensureForeignCell = (emit: Emit, collection: string, interactive: boolean): string => {
  const name = `${interactive ? DEF.slot : 'display_slot'}__${collectionKey(collection)}`;

  if (emit.defs[name] === undefined) {
    emit.defs[name] = {
      type: 'panel',
      size: [18, 18],
      controls: [{ 'item@common.container_item': containerItemVars(emit, collection, interactive) }],
    };
  }

  return `${emit.ns}.${name}`;
};

/**
 * A foreign slot's host, registered once per collection. Its default cell is
 * the interactive one; a display-only slot passes its own cell as an override.
 */
const ensureForeignHost = (emit: Emit, collection: string): string => {
  const name = `${DEF.slotHost}__${collectionKey(collection)}`;

  if (emit.defs[name] === undefined) {
    const cell = ensureForeignCell(emit, collection, true);

    emit.defs[name] = {
      type: 'stack_panel',
      orientation: 'vertical',
      size: [18, 18],
      ...topLeft,
      collection_name: collection,
      [`${SLOT_VAR}|default`]: 0,
      [`${CELL_VAR}|default`]: cell,
      controls: [{ [`cell@${CELL_VAR}`]: { collection_index: SLOT_VAR } }],
    };
  }

  return `${emit.ns}.${name}`;
};

/**
 * A grid's cell template, registered once per collection, interactivity and
 * owned-hiding. `container_item` is used directly as the template, exactly as
 * the router's own redrawn grids do.
 */
const ensureGridCell = (emit: Emit, node: GridNode): string => {
  const name = [
    'grid_cell',
    collectionKey(node.collection),
    node.interactive ? 'take' : 'display',
    node.hideOwned ? 'owned' : 'plain',
  ].join('__');
  const key = `${name}@common.container_item`;

  if (emit.defs[key] === undefined) {
    const renderer = node.hideOwned ? emit.ownedRenderer : undefined;

    emit.defs[key] = containerItemVars(emit, node.collection, node.interactive, renderer);
  }

  return `${emit.ns}.${name}`;
};

/**
 * One node becomes one entry in its parent's `controls`. Static leaves are
 * inlined; anything reading a slot becomes a host reference, because the index
 * has nowhere else to live.
 */
const emitNode = (node: IrNode, emit: Emit): ControlEntry => {
  const { ns } = emit;

  switch (node.kind) {
    case 'panel':
      return {
        [node.name]: {
          type: 'panel',
          size: sizeOf(node.rect),
          ...layerOf(node),
          ...visibilityOf(node),
          offset: offsetOf(node.rect),
          ...topLeft,
          controls: [
            ...backgroundOf(node),
            ...node.children.map(child => emitNode(child, emit)),
          ],
        },
      };

    case 'label':
      return {
        [node.name]: {
          type: 'label',
          size: sizeOf(node.rect),
          ...layerOf(node),
          ...visibilityOf(node),
          offset: offsetOf(node.rect),
          ...topLeft,
          text: node.text,
          localize: node.localize,
          font_type: node.fontType,
          font_size: FONT_SIZE,
          font_scale_factor: node.fontScaleFactor,
          ...node.shadow ? { shadow: node.shadow } : {},
        },
      };

    case 'text': {
      // One host per cell, because `collection_index` is only accepted on a
      // direct child of a control declaring `collection_name`. The hosts sit in
      // a horizontal stack panel and hug their glyph, so the run reads as text
      // rather than as a grid of letters.
      const def = emit.textNames.get(textSignature(node)) ?? DEF.text;
      const hug: [string, string] = ['100%c', '100%c'];

      return {
        [node.name]: {
          type: 'stack_panel',
          orientation: 'horizontal',
          size: sizeOf(node.rect),
          offset: offsetOf(node.rect),
          ...layerOf(node),
          ...visibilityOf(node),
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
      return {
        [node.name]: {
          type: 'image',
          size: sizeOf(node.rect),
          ...layerOf(node),
          ...visibilityOf(node),
          offset: offsetOf(node.rect),
          ...topLeft,
          texture: node.texture,
          keep_ratio: false,
        },
      };

    case 'grid':
      // A grid over a foreign collection: the grid declares the collection, so
      // each cell gets its index for free — no per-cell host is needed.
      return {
        [node.name]: {
          type: 'grid',
          size: sizeOf(node.rect),
          offset: offsetOf(node.rect),
          ...topLeft,
          ...layerOf(node),
          ...visibilityOf(node),
          grid_dimensions: [node.columns, node.rows],
          collection_name: node.collection,
          grid_item_template: ensureGridCell(emit, node),
        },
      };

    case 'slot': {
      if (node.source !== undefined) {
        // A foreign slot: its own host over its own collection, keyed by that
        // collection so two slots on the same one share it. The index is the
        // author's, not the allocation's, and the runtime never touches it.
        const host = ensureForeignHost(emit, node.source.collection);

        return {
          [`${node.name}@${host}`]: {
            offset: offsetOf(node.rect),
            size: sizeOf(node.rect),
            ...layerOf(node),
            ...visibilityOf(node),
            [SLOT_VAR]: node.source.index,
            ...node.source.interactive
              ? {}
              : { [CELL_VAR]: ensureForeignCell(emit, node.source.collection, false) },
          },
        };
      }

      return {
        [`${node.name}@${ns}.${DEF.slotHost}`]: {
          offset: offsetOf(node.rect),
          size: sizeOf(node.rect),
          ...layerOf(node),
          ...visibilityOf(node),
          [SLOT_VAR]: node.slot,
          ...cellOf(node, ns),
        },
      };
    }

    case 'scroll': {
      // Vanilla's scrolling panel, with the content as a definition of its own
      // because the panel takes it by name. The scrollbar is vanilla's too:
      // a 5-texel track down the right edge, the pane spanning the viewport.
      const content = `${node.name}_content`;

      emit.defs[content] = {
        type: 'panel',
        size: [node.rect.width, node.extent],
        ...topLeft,
        controls: node.children.map(child => emitNode(child, emit)),
      };

      return {
        [`${node.name}@common.scrolling_panel`]: {
          size: sizeOf(node.rect),
          offset: offsetOf(node.rect),
          ...topLeft,
          ...layerOf(node),
          ...visibilityOf(node),
          $show_background: false,
          $scrolling_content: `${emit.ns}.${content}`,
          $scroll_size: [5, '100%'],
          $scrolling_pane_size: sizeOf(node.rect),
          $scrolling_pane_offset: [0, 0],
          $scroll_bar_right_padding_size: [0, 0],
        },
      };
    }

    case 'exit':
      // A real JSON UI button rather than a slot: the exit route is the
      // engine's, so no transaction and no transport are involved.
      return {
        [node.name]: {
          type: 'button',
          size: sizeOf(node.rect),
          offset: offsetOf(node.rect),
          ...topLeft,
          ...layerOf(node),
          ...visibilityOf(node),
          default_control: 'default',
          hover_control: 'hover',
          pressed_control: 'pressed',
          button_mappings: EXIT_MAPPINGS,
          controls: [
            { default: { type: 'image', texture: node.face.texture, size: FULL, keep_ratio: false } },
            { hover: { type: 'image', texture: node.face.hover, size: FULL, keep_ratio: false } },
            { pressed: { type: 'image', texture: node.face.pressed, size: FULL, keep_ratio: false } },
            ...node.children.length === 0
              ? []
              : [{
                content: {
                  type: 'panel' as const,
                  size: FULL,
                  ...topLeft,
                  layer: FACE_CONTENT_LAYER,
                  controls: node.children.map(child => emitNode(child, emit)),
                },
              } satisfies ControlEntry],
          ],
        },
      };

    case 'button':
      return {
        [`${node.name}@${ns}.${DEF.slotHost}`]: {
          offset: offsetOf(node.rect),
          size: sizeOf(node.rect),
          ...layerOf(node),
          ...visibilityOf(node),
          [SLOT_VAR]: node.slot,
          [CELL_VAR]: `${ns}.${emit.faceNames.get(faceSignature(node)) ?? DEF.slot}`,
        },
      };
  }
};

/** Turns a solved tree into a JSON UI document. */
export const emit = (doc: IrDocument): Document => {
  const kinds = new Set<Shape>();

  collectShapes(doc.root, kinds);

  const root: PanelNode = doc.root;
  const context: Emit = {
    ns: doc.namespace,
    collection: doc.collection,
    ...doc.ownedItemRenderer === undefined ? {} : { ownedRenderer: doc.ownedItemRenderer },
    textNames: new Map(),
    faceNames: new Map(),
    defs: {},
  };

  const document: Document = {
    namespace: doc.namespace,
    ...sharedDefs(doc.namespace, doc.collection, kinds),
  };

  // One definition per distinct text channel shape, shared by every label that
  // wants it. Channels differing only in which slot they read collapse onto the
  // same definition, because the index is the one thing a reference may supply.
  for (const node of collectTexts(root)) {
    const signature = textSignature(node);

    if (context.textNames.has(signature)) {
      continue;
    }

    const name = `${DEF.text}_${context.textNames.size + 1}`;

    context.textNames.set(signature, name);
    document[name] = textDef(node, doc.collection);
  }

  // One set of definitions per distinct button look. Buttons differing only in
  // which slot they read collapse onto the same face. Named first and emitted
  // after, so a face baked inside another face can already be referenced.
  const buttons = collectButtons(root);

  for (const node of buttons) {
    const signature = faceSignature(node);

    if (!context.faceNames.has(signature)) {
      context.faceNames.set(signature, `button_${context.faceNames.size + 1}`);
    }
  }

  const emittedFaces = new Set<string>();

  for (const node of buttons) {
    const name = context.faceNames.get(faceSignature(node));

    if (name === undefined || emittedFaces.has(name)) {
      continue;
    }

    emittedFaces.add(name);
    Object.assign(document, faceDefs(node, name, context));
  }

  document[SCREEN_DEFINITION] = {
    type: 'panel',
    size: sizeOf(root.rect),
    ...topLeft,
    controls: [
      CLICK_SHIELD,
      ...backgroundOf(root),
      ...root.children.map(child => emitNode(child, context)),
    ],
  };

  Object.assign(document, context.defs);

  if (doc.backdrop !== undefined) {
    // The whole screen, not the canvas: the router mounts it behind the
    // canvas at screen level, gated the same way.
    document[BACKDROP_DEFINITION] = {
      type: 'image',
      texture: doc.backdrop,
      size: FULL,
      keep_ratio: false,
    };
  }

  return document;
};
