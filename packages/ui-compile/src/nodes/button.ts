import type { JSX } from '@bedrock-core/ui-runtime';
import {
  BUTTON_TYPE, isExitButton, TRANSPORT_ITEM_AUX,
} from '@bedrock-core/ui-runtime/compile';
import type { Binding, ButtonMapping, Control, ControlEntry } from '../jsonui';
import type { ExitNode } from './exit';
import { collectKind, shapeOf } from './index';
import {
  CELL_VAR, CONTAINER, FACE_CONTENT_LAYER, FULL, isSelfRouted, layerOf, offsetOf, PROTOTYPE_MAPPINGS, sizeOf,
  SLOT_VAR, str, topLeft, visibilityOf,
} from './shared';
import { CELL } from './slot';
import type { Emit, IrNode, NodeBase, NodeDefinition } from './types';

/**
 * What a button looks like instead of an item.
 *
 * A press can only reach script as an item move — JSON UI's button mappings
 * produce game actions, and the container transaction is the only one the
 * server sees. But nothing says the item has to be VISIBLE: `common.container_item`
 * takes its cell face, its item renderer and its button as variables, so the
 * icon can be replaced with nothing and the face with a real button. The item
 * stays as pure transport.
 */
export interface ButtonFace {
  texture: string;
  hover: string;
  pressed: string;
  /**
   * Drawn instead of `texture` while the button is disabled. Optional: a
   * button without one keeps its resting face when disabled, and only stops
   * reacting.
   */
  disabled?: string;
}

/**
 * A container slot drawn as a button, with its children baked into the face.
 *
 * The children were laid out by the flex engine like everything else, so they
 * are ordinary nodes positioned relative to the button's rect. Live text is not
 * among them: a face is a shared definition, and a channel index is not.
 */
export interface ButtonNode extends NodeBase {
  kind: 'button';
  /** Index from the allocation walk, never written by the author. */
  slot: number;
  face: ButtonFace;
  children: IrNode[];
}

declare module './types' {
  interface IrNodeMap {
    button: ButtonNode;
  }
}

/**
 * What a built `<Button>` looks like. The component resolves every state to a
 * concrete texture, so a missing state reads as the base one — which is also
 * why a disabled look is only kept when it differs from the resting face.
 */
export const faceOf = (props: JSX.Props): ButtonFace => {
  const texture = str(props.background);
  const locked = str(props.backgroundLocked);

  return {
    texture,
    hover: str(props.backgroundHover),
    pressed: str(props.backgroundPressed),
    ...locked === texture ? {} : { disabled: locked },
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

/**
 * What lets two buttons share a definition: the same look, at the same size,
 * with the same things baked into the face.
 */
const faceSignature = (node: ButtonNode): string => JSON.stringify({
  face: node.face,
  size: sizeOf(node.rect),
  children: node.children.map(shapeOf),
});

/** The face a button mounts: its look's shared definition, in the screen's namespace. */
const faceName = (node: ButtonNode, ctx: Emit): string => {
  const name = ctx.faceNames.get(faceSignature(node));

  return name === undefined ? CELL.slot : `${ctx.ns}.${name}`;
};

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
              controls: node.children.map(child => emit.emitNode(child)),
            },
          } satisfies ControlEntry],
      ],
    },

    [`${name}_states@${CONTAINER}.slot_button`]: {
      hover_control: 'hover',
      pressed_control: 'pressed',
      button_mappings: BUTTON_MAPPINGS,
      // A slot is silent, the way vanilla's are; a button clicks, the way
      // vanilla's do.
      sound_name: 'random.click',
      sound_volume: 1,
      sound_pitch: 1,
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
                [`item@${CELL.item}`]: {
                  size,
                  $cell_image_size: size,
                  $item_collection_name: collection,
                  $background_images: `${ns}.${name}_face`,
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

export const buttonDefinition: NodeDefinition<ButtonNode> = {
  kind: 'button',
  types: [BUTTON_TYPE],

  lower(element, _type, ctx): ButtonNode | ExitNode {
    const { props } = element;

    // A close button is the client's: no cell to look up, nothing for the
    // runtime to poll.
    if (isExitButton(element)) {
      return {
        kind: 'exit',
        name: ctx.name('exit'),
        rect: ctx.rect,
        ...ctx.decoration,
        face: faceOf(props),
        children: ctx.children(element, ctx.own),
      };
    }

    const entry = ctx.slotOf(element);

    return {
      kind: 'button',
      name: ctx.name('button'),
      rect: ctx.rect,
      ...ctx.decoration,
      slot: entry.slot,
      face: faceOf(props),
      // Baked into the face, relative to the button like any other child.
      children: ctx.children(element, ctx.own),
    };
  },

  children: node => node.children,

  // One set of definitions per distinct button look. Buttons differing only in
  // which slot they read collapse onto the same face. Named first and emitted
  // after, so a face baked inside another face can already be referenced.
  assemble(root, document, ctx) {
    const buttons = collectKind(root, 'button');

    for (const node of buttons) {
      const signature = faceSignature(node);

      if (!ctx.faceNames.has(signature)) {
        ctx.faceNames.set(signature, `button_${ctx.faceNames.size + 1}`);
      }
    }

    const emittedFaces = new Set<string>();

    for (const node of buttons) {
      const name = ctx.faceNames.get(faceSignature(node));

      if (name === undefined || emittedFaces.has(name)) {
        continue;
      }

      emittedFaces.add(name);
      Object.assign(document, faceDefs(node, name, ctx));
    }
  },

  emit(node, ctx) {
    return {
      [`${node.name}@${CELL.host}`]: {
        offset: offsetOf(node.rect),
        size: sizeOf(node.rect),
        ...layerOf(node),
        ...visibilityOf(node),
        [SLOT_VAR]: node.slot,
        [CELL_VAR]: faceName(node, ctx),
      },
    };
  },
};
