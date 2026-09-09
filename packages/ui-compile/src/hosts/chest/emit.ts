import { KEY_PREFIX, TRANSPORT_ITEM_AUX } from '@bedrock-core/ui-runtime/compile';
import type { Binding, ButtonMapping, Control, ControlEntry } from '../../jsonui';
import { collectKind } from '../../nodes';
import { type ButtonNode, faceSignature } from '../../nodes/button';
import type { GridNode } from '../../nodes/grid';
import {
  CELL_VAR, CHEST, collectionKey, faceId, FONT_SIZE, FULL, isSelfRouted, literal, PROTOTYPE_MAPPINGS, SLOT_VAR, topLeft,
} from '../../nodes/shared';
import type { SlotNode } from '../../nodes/slot';
import { type TextNode, textSignature } from '../../nodes/text';
import type { Emit, HostEmit } from '../../nodes/types';

/**
 * How the chest draws the sockets whose mechanism is its own.
 *
 * A chest screen carries everything through container slots the runtime polls
 * a tick at a time. A press can only reach script as an item move — JSON UI's
 * button mappings produce game actions, and the container transaction is the
 * only one the server sees — and a string can only cross as numbers, one
 * slot's stack size per character. Every mechanism here is one of those two
 * facts spelled out as JSON UI; the LOOK it draws is the face the face pass
 * already shared.
 *
 * Every number in a binding here is a literal on purpose. A `$variable`
 * inside a `source_property_name` is silently dropped in a subtree the engine
 * inserted through `modifications`, which is how every compiled screen is
 * mounted.
 */

/**
 * The library's own cell definitions a slot mounts, from the static
 * `core_ui_chest` file the render pack ships. One per control shape, never
 * one per node.
 */
export const CELL = {
  host: `${CHEST}.slot_host`,
  slot: `${CHEST}.slot`,
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

// ─── Buttons ──────────────────────────────────────────────────────────────────

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
 * Reads the slot item's id, which {@link ENABLED_PROPERTY} compares against
 * the transport's. Every control that draws differently by state carries its
 * own copy, since a binding cannot be shared.
 */
const enabledBindings = (collection: string) => [
  { binding_type: 'collection_details', binding_collection_name: collection },
  {
    binding_name: '#item_id_aux',
    binding_name_override: '#btn_aux',
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

/** The shared faces of one button look, fully qualified, as the face pass named them. */
const facesOf = (node: ButtonNode, ctx: Emit): { id: string; rest: string; hover: string; pressed: string; disabled: string } => {
  const id = faceId('button', faceSignature(node));

  return {
    id,
    rest: `${ctx.facesNs}.${id}`,
    hover: `${ctx.facesNs}.${id}_hover`,
    pressed: `${ctx.facesNs}.${id}_pressed`,
    disabled: `${ctx.facesNs}.${node.face.disabled === undefined ? id : `${id}_disabled`}`,
  };
};

/** One state's panel: the engine toggles it, the gate inside draws the face only while enabled. */
const gatedState = (face: string, collection: string): Control => ({
  type: 'panel',
  size: FULL,
  controls: [{
    gate: {
      type: 'panel',
      size: FULL,
      bindings: whenEnabled(collection),
      controls: [{ [`face@${face}`]: {} }],
    },
  }],
});

/**
 * The definitions one button look needs on a chest.
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
 * button does not react. Two visibilities, on two controls: the button toggles
 * `hover` and `pressed` itself as the pointer comes and goes, and a binding
 * writing `#visible` on the SAME control fights it — re-enabling a button set
 * both faces visible at once until the next hover made the engine recompute,
 * measured. So the engine owns the outer panel, the gate owns the panel
 * inside, and a state is drawn only when both agree.
 *
 * The cell and the item are sized to the button's solved rect, because
 * `container_item` and its `item_cell` default to the 18 x 18 item cell and a
 * face only ever fills that.
 */
const buttonDefs = (node: ButtonNode, name: string, ctx: Emit): Record<string, Control> => {
  const { ns, collection } = ctx;
  const faces = facesOf(node, ctx);
  const size: [number, number] = [node.rect.width, node.rect.height];

  return {
    [`${name}_states@${CHEST}.slot_button`]: {
      hover_control: 'hover',
      pressed_control: 'pressed',
      button_mappings: BUTTON_MAPPINGS,
      // A slot is silent, the way vanilla's are; a button clicks, the way
      // vanilla's do.
      sound_name: 'random.click',
      sound_volume: 1,
      sound_pitch: 1,
      controls: [
        { hover: gatedState(faces.hover, collection) },
        { pressed: gatedState(faces.pressed, collection) },
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
                [`item@${CELL.item}`]: {
                  size,
                  $cell_image_size: size,
                  $item_collection_name: collection,
                  $background_images: faces.rest,
                  $item_renderer: CELL.empty,
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
          // The face alone, no press surface: the disabled look when the
          // author gave one, the resting look otherwise.
          disabled: {
            type: 'panel',
            size: FULL,
            bindings: whenDisabled(collection),
            controls: [{ [`face@${faces.disabled}`]: {} }],
          },
        },
      ],
    },
  };
};

// ─── Text ─────────────────────────────────────────────────────────────────────

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
export const textDef = (node: TextNode, collection: string): Control => ({
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
  ...node.color === undefined ? {} : { color: [...node.color] as [number, number, number] },
  ...node.textAlignment === undefined ? {} : { text_alignment: node.textAlignment },
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
      source_property_name: `(${literal(KEY_PREFIX)} + ${TEXT_RAW_PROPERTY})`,
      target_property_name: TEXT_PROPERTY,
    },
  ] satisfies Binding[],
});

/**
 * A live string as a run of glyph cells: one host per cell, because
 * `collection_index` is only accepted on a direct child of a control declaring
 * `collection_name`. The hosts sit in a horizontal stack panel and hug their
 * glyph, so the run reads as text rather than as a grid of letters.
 */
const textRun = (node: TextNode, entry: ControlEntry, ctx: Emit): ControlEntry => {
  const [control] = Object.values(entry);
  const def = ctx.textNames.get(textSignature(node)) ?? TEXT_DEF.text;
  const hug: [string, string] = ['100%c', '100%c'];

  return {
    [node.name]: {
      type: 'stack_panel',
      orientation: 'horizontal',
      size: control?.size,
      offset: control?.offset,
      ...topLeft,
      ...control?.layer === undefined ? {} : { layer: control.layer },
      ...control?.visible === false ? { visible: false } : {},
      controls: Array.from({ length: node.length }, (_unused, cell) => ({
        [`cell_${cell}@${TEXT_DEF.textHost}`]: {
          size: hug,
          controls: [{ [`glyph@${ctx.ns}.${def}`]: { collection_index: node.address + cell } }],
        },
      })),
    },
  };
};

// ─── Cells ────────────────────────────────────────────────────────────────────

/**
 * What the cell needs to draw the given collection: its item, and nothing that
 * reveals the runtime's transport. A display-only cell rides the inert button,
 * which withholds focus — no take, no place, no drop — since the engine's slot
 * has no take-only or place-only action to bake instead. `renderer`, when
 * given, hides a transport item for a player's own grids.
 */
const containerItemVars = (collection: string, interactive: boolean, renderer?: string): Control => ({
  $item_collection_name: collection,
  ...renderer === undefined ? {} : { $item_renderer: renderer, $durability_bar_required: false },
  ...interactive ? {} : { $button_ref: CELL.displayStates },
});

/**
 * The collections the PLAYER owns, as opposed to the screen's own container.
 *
 * A press auto-places the runtime's transport into the player's inventory and
 * the script pulls it back a tick later, so for that tick the transport is
 * genuinely sitting in one of these — whichever slot happened to be free. Any
 * cell drawing one of them therefore hides it.
 *
 * This is NOT an author's choice. The transport is the library's own
 * mechanism, and nobody writing a screen should have to know it exists to keep
 * a command block from flashing in their hotbar. `hideOwned` stays as the way
 * to ask for the same gate over some other collection.
 */
const PLAYER_COLLECTIONS: ReadonlySet<string> = new Set(['inventory_items', 'hotbar_items']);

/** Whether a cell over this collection must hide the runtime's transport. */
export const hidesTransport = (collection: string, hideOwned = false): boolean =>
  hideOwned || PLAYER_COLLECTIONS.has(collection);

/** A foreign slot's cell definition, registered once per collection and interactivity. */
const ensureForeignCell = (ctx: Emit, collection: string, interactive: boolean): string => {
  const name = `${interactive ? 'slot' : 'display_slot'}__${collectionKey(collection)}`;

  if (ctx.defs[name] === undefined) {
    const renderer = hidesTransport(collection) ? ctx.ownedRenderer : undefined;

    ctx.defs[name] = {
      type: 'panel',
      size: [18, 18],
      controls: [{ [`item@${CELL.item}`]: containerItemVars(collection, interactive, renderer) }],
    };
  }

  return `${ctx.ns}.${name}`;
};

/**
 * A foreign slot's host, registered once per collection. Its default cell is
 * the interactive one; a display-only slot passes its own cell as an override.
 */
const ensureForeignHost = (ctx: Emit, collection: string): string => {
  const name = `slot_host__${collectionKey(collection)}`;

  if (ctx.defs[name] === undefined) {
    const cell = ensureForeignCell(ctx, collection, true);

    ctx.defs[name] = {
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

  return `${ctx.ns}.${name}`;
};

/**
 * Which cell a slot host instantiates: an inert cell for a locked slot, the
 * guard-toggled pair for an output slot, or the host's default otherwise. An
 * input's refusals are the runtime's, so it needs no cell of its own.
 */
const cellOf = (node: SlotNode): { [CELL_VAR]?: string } => {
  if (!node.interactive) {
    return { [CELL_VAR]: CELL.lockedSlot };
  }

  return node.role === 'output' ? { [CELL_VAR]: CELL.outputSlot } : {};
};

/** The face's placement, restated on the mechanism that replaces it. */
const placed = (entry: ControlEntry): Control => {
  const [control] = Object.values(entry);

  return {
    size: control?.size,
    offset: control?.offset,
    ...topLeft,
    ...control?.layer === undefined ? {} : { layer: control.layer },
    ...control?.visible === false ? { visible: false } : {},
  };
};

/**
 * A grid's cell template, registered once per collection, interactivity and
 * owned-hiding. `container_item` is used directly as the template, exactly as
 * the router's own redrawn grids do.
 */
const ensureGridCell = (ctx: Emit, node: GridNode): string => {
  // One answer, used for both the name and the renderer: a definition keyed
  // 'plain' that carries the gated renderer would be shared by cells that must
  // not have it.
  const gated = hidesTransport(node.collection, node.hideOwned);
  const name = [
    'grid_cell',
    collectionKey(node.collection),
    node.interactive ? 'take' : 'display',
    gated ? 'owned' : 'plain',
  ].join('__');
  const key = `${name}@${CELL.item}`;

  if (ctx.defs[key] === undefined) {
    ctx.defs[key] = containerItemVars(node.collection, node.interactive, gated ? ctx.ownedRenderer : undefined);
  }

  return `${ctx.ns}.${name}`;
};

export const CHEST_EMIT: HostEmit = {
  id: 'chest',

  /**
   * A full-canvas button that swallows a click so it never falls through to the
   * chest screen's drop-the-cursor mapping. Sits under the content — the slots
   * and buttons above it handle their own clicks — so only empty space inside
   * the container absorbs, and a click OUTSIDE the canvas still drops, the way
   * a click beside a vanilla furnace's panel does.
   */
  chrome: (): ControlEntry[] => [{
    core_ui_click_shield: {
      type: 'button',
      size: ['100%', '100%'],
      button_mappings: [
        { from_button_id: 'button.menu_select', to_button_id: 'button.menu_select', mapping_type: 'pressed' },
        { from_button_id: 'button.menu_ok', to_button_id: 'button.menu_ok', mapping_type: 'pressed' },
      ],
    },
  }],

  /**
   * The definitions a chest screen shares by reference: one per distinct button
   * look, one per distinct text channel shape. Both are mechanism — a button is
   * built on `container_item` with the item hidden, a channel reads a slot's
   * stack size through the `.lang` table — and both draw the faces the face
   * pass shared.
   */
  assemble(root, document, ctx): void {
    for (const node of collectKind(root, 'button')) {
      const id = faceId('button', faceSignature(node));

      if (!ctx.faceNames.has(id)) {
        const name = `press_${ctx.faceNames.size + 1}`;

        ctx.faceNames.set(id, name);
        Object.assign(document, buttonDefs(node, name, ctx));
      }
    }

    for (const node of collectKind(root, 'text')) {
      const signature = textSignature(node);

      if (!ctx.textNames.has(signature)) {
        const name = `${TEXT_DEF.text}_${ctx.textNames.size + 1}`;

        ctx.textNames.set(signature, name);
        document[name] = textDef(node, ctx.collection);
      }
    }
  },

  fill: {
    press: (node: ButtonNode, entry, ctx): ControlEntry => ({
      [`${node.name}@${CELL.host}`]: {
        ...placed(entry),
        [SLOT_VAR]: node.address,
        [CELL_VAR]: `${ctx.ns}.${ctx.faceNames.get(faceId('button', faceSignature(node))) ?? 'press_1'}`,
      },
    }),

    text: textRun,

    slot: (node: SlotNode, entry, ctx): ControlEntry => {
      if (node.source !== undefined) {
        // A foreign slot: its own host over its own collection, keyed by that
        // collection so two slots on the same one share it. The index is the
        // author's, not the allocation's, and the runtime never touches it.
        const host = ensureForeignHost(ctx, node.source.collection);

        return {
          [`${node.name}@${host}`]: {
            ...placed(entry),
            [SLOT_VAR]: node.source.index,
            ...node.source.interactive
              ? {}
              : { [CELL_VAR]: ensureForeignCell(ctx, node.source.collection, false) },
          },
        };
      }

      return {
        [`${node.name}@${CELL.host}`]: {
          ...placed(entry),
          [SLOT_VAR]: node.address,
          ...cellOf(node),
        },
      };
    },

    // A grid over a foreign collection: the grid declares the collection, so
    // each cell gets its index for free — no per-cell host is needed.
    grid: (node: GridNode, entry, ctx): ControlEntry => ({
      [node.name]: {
        type: 'grid',
        ...placed(entry),
        grid_dimensions: [node.columns, node.rows],
        collection_name: node.collection,
        grid_item_template: ensureGridCell(ctx, node),
      },
    }),
  },
};
