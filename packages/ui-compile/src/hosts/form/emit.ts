import { FORM_COLLECTION, FORM_DETAILS_BINDING } from '@bedrock-core/ui-runtime/compile';
import type { ButtonNode } from '../../nodes/button';
import { collectKind, shapeOf } from '../../nodes';
import type { Binding, Control, ControlEntry } from '../../jsonui';
import { MODAL_COLLECTION } from '../../nodes/field';
import {
  FACE_CONTENT_LAYER, FONT_SIZE, FULL, layerOf, offsetOf, sizeOf, topLeft, visibilityOf,
} from '../../nodes/shared';
import type { TextNode } from '../../nodes/text';
import type { Emit, HostEmit, IrNode } from '../../nodes/types';

/**
 * How a form draws the kinds a chest draws with items.
 *
 * The two screens could hardly be less alike underneath. A chest carries
 * everything through container slots the runtime polls a tick at a time; a
 * form carries it through entries the engine hands back in one response, and
 * carries nothing at all while it is open. What survives that gap is the
 * LOOK — a button's four faces, a label's font — which is why panels, labels
 * and images are not in this file. Only the mechanism is.
 *
 * ## The one rule that is not optional
 *
 * MEASURED (spike S1): a control owns its entry only if THE CONTROL ITSELF
 * carries the `collection_details` binding. A host above it supplying
 * `collection_index` is enough to read the entry and enough to be clicked, but
 * the press then reaches script as `canceled`, indistinguishable from Esc.
 * Every pressable control emitted here carries {@link FORM_DETAILS_BINDING},
 * and nothing at build time can warn if it stops.
 */

/** The index host. `collection_index` is legal only on a direct child of a control declaring `collection_name`. */
const entryHost = (name: string, address: number, cell: string, node: ButtonNode | TextNode): ControlEntry => ({
  [name]: {
    type: 'stack_panel',
    orientation: 'vertical',
    size: sizeOf(node.rect),
    offset: offsetOf(node.rect),
    ...topLeft,
    ...layerOf(node),
    ...visibilityOf(node),
    collection_name: FORM_COLLECTION,
    controls: [{ [`cell@${cell}`]: { collection_index: address } }],
  },
});

/** Reads the entry's own string, which is the only thing a form entry carries. */
const entryText = (name: string): Binding[] => [
  { ...FORM_DETAILS_BINDING },
  {
    binding_name: '#form_button_text',
    binding_name_override: name,
    binding_type: 'collection',
    binding_collection_name: FORM_COLLECTION,
  },
];

/** Where a button's entry says whether it is enabled. */
const ENTRY_PROPERTY = '#entry_value';

/**
 * Visible only while the entry says this button may be pressed.
 *
 * MEASURED: a `button` with `enabled` bound to false still takes the press —
 * the property greys nothing and blocks nothing here. The chest host found the
 * same and answered it the same way: a disabled button has no button at all,
 * only its face. Gating the control out is the only thing that actually stops
 * a press.
 */
const whenEnabled = (visible: boolean): Binding[] => [
  ...entryText(ENTRY_PROPERTY),
  {
    binding_type: 'view',
    source_property_name: visible ? `(not (${ENTRY_PROPERTY} = '0'))` : `(${ENTRY_PROPERTY} = '0')`,
    target_property_name: '#visible',
  },
];

/**
 * What lets two buttons share a definition: the same look, at the same size,
 * with the same things baked into the face. Only the entry index differs, and
 * that rides the reference.
 */
const faceSignature = (node: ButtonNode): string => JSON.stringify({
  face: node.face,
  size: sizeOf(node.rect),
  children: node.children.map(shapeOf),
});

/** One state's image, drawn over the whole face. */
const stateImage = (texture: string): Control => ({
  type: 'image',
  texture,
  size: FULL,
  keep_ratio: false,
  layer: 1,
});

/**
 * One state's face: the texture, and the caption over it.
 *
 * The caption goes INSIDE each state rather than beside them. A button shows
 * the child its `*_control` names and hides the others, so a sibling of the
 * state controls is not what gets drawn — which is why the captions were
 * missing. Vanilla's own form button does the same: its `state_face` carries
 * both the texture and the text.
 */
const stateFace = (texture: string, content: string | undefined): Control => ({
  type: 'panel',
  size: FULL,
  ...topLeft,
  controls: [
    { bg: stateImage(texture) },
    // Layered above the face rather than merely after it. Same reason the chest
    // emitter layers its own: draw order among siblings at one layer is not
    // what decides this, and a caption at the default vanishes under the face.
    ...content === undefined
      ? []
      : [{ [`caption@${content}`]: { layer: FACE_CONTENT_LAYER } } satisfies ControlEntry],
  ],
});

/**
 * The definitions one button look needs.
 *
 * The press surface exists only while the entry says the button is enabled,
 * and a disabled button is its face alone — no button, so no press to refuse.
 * That is the chest's shape, arrived at for the chest's reason: `enabled` on a
 * button does not actually stop the engine handing the press to script.
 *
 * The button itself carries the `collection_details` binding S1 measured, and
 * sits under the index host that names its entry.
 */
const faceDefs = (node: ButtonNode, name: string, emit: Emit): Record<string, Control> => {
  const { ns } = emit;
  const content = node.children.length === 0 ? undefined : `${ns}.${name}_content`;

  // One definition, referenced by each state, so a caption is emitted once
  // however many faces a button has.
  const captionDef: Record<string, Control> = content === undefined
    ? {}
    : {
        [`${name}_content`]: {
          type: 'panel',
          size: FULL,
          ...topLeft,
          controls: node.children.map(child => emit.emitNode(child)),
        },
      };

  return {
    ...captionDef,

    [`${name}_states`]: {
      type: 'button',
      size: FULL,
      ...topLeft,
      default_control: 'default',
      hover_control: 'hover',
      pressed_control: 'pressed',
      sound_name: 'random.click',
      sound_volume: 1,
      sound_pitch: 1,
      button_mappings: [
        { from_button_id: 'button.menu_select', to_button_id: 'button.form_button_click', mapping_type: 'pressed' },
        { from_button_id: 'button.menu_ok', to_button_id: 'button.form_button_click', mapping_type: 'focused' },
      ],
      // S1: without this ON THE BUTTON the press is not attributed to the entry
      // and reaches script as a dismissal.
      bindings: [{ ...FORM_DETAILS_BINDING }],
      controls: [
        { default: stateFace(node.face.texture, content) },
        { hover: stateFace(node.face.hover, content) },
        { pressed: stateFace(node.face.pressed, content) },
      ],
    },

    [name]: {
      type: 'panel',
      size: sizeOf(node.rect),
      ...topLeft,
      controls: [
        {
          enabled: {
            type: 'panel',
            size: FULL,
            ...topLeft,
            // Seeded visible: if the binding ever fails to resolve, a button
            // that still works beats one that silently cannot be pressed.
            property_bag: { '#visible': true },
            visible: '#visible',
            bindings: whenEnabled(true),
            controls: [{ [`press@${ns}.${name}_states`]: {} }],
          },
        },
        {
          disabled: {
            type: 'panel',
            size: FULL,
            ...topLeft,
            property_bag: { '#visible': false },
            visible: '#visible',
            bindings: whenEnabled(false),
            controls: [{ face: stateFace(node.face.disabled ?? node.face.texture, content) }],
          },
        },
      ],
    },
  };
};

/**
 * A live string, which on a form is the entry itself.
 *
 * The whole of the interpreter's per-character machinery is absent, and so is
 * the chest's: a container slot publishes numbers, so a string crosses it one
 * glyph and one `.lang` lookup at a time, while a form entry IS a string. One
 * binding, no slicing, no table, no cap — which is the difference between the
 * two hosts stated as JSON UI.
 */
const textDef = (node: TextNode): Control => ({
  type: 'label',
  size: sizeOf(node.rect),
  ...topLeft,
  text: ENTRY_PROPERTY,
  localize: false,
  font_type: node.fontType,
  font_size: FONT_SIZE,
  font_scale_factor: node.fontScaleFactor,
  ...node.shadow ? { shadow: node.shadow } : {},
  bindings: entryText(ENTRY_PROPERTY),
});

/** Text runs differing only in which entry they read share a definition. */
const textSignature = (node: TextNode): string => JSON.stringify([
  node.fontType,
  node.fontScaleFactor,
  node.shadow ?? null,
  sizeOf(node.rect),
]);

/** Draws over everything the screen put down, the way the interpreted overlay's layer does. */
const POPUP_LAYER = 300;

/**
 * One dropdown popup per dropdown CELL, hung at the screen root.
 *
 * The interpreted screen gets its popups from `modal_container`'s
 * `popup_overlay` factory — one `dropdown_popup_router` per row, each decoding
 * what it needs from its row's payload. A factory cannot pass per-row
 * `$variables` and a compiled row has no payload, so the compiled screen bakes
 * its own router per dropdown, given that cell's row index, popup surface and
 * height. `$open_gate` keeps only the open-state half of the shared gate: the
 * `#type` half reads a payload that never arrives, and only a dropdown row has
 * an open-state channel at all.
 *
 * At the ROOT, not in the cell: the popup must draw over the whole screen, and
 * the one attempt to mount it inside the native dropdown's own subtree crashed
 * the client — the names in there are the engine's to resolve.
 */
const popupOverlay = (root: IrNode): ControlEntry[] => collectKind(root, 'field')
  .flatMap(node => node.popup === undefined
    ? []
    : [{
      [`${node.name}_popup`]: {
        type: 'stack_panel',
        orientation: 'vertical',
        size: FULL,
        ...topLeft,
        layer: POPUP_LAYER,
        collection_name: MODAL_COLLECTION,
        controls: [{
          'popup@core_ui_form_components.dropdown_popup_router': {
            collection_index: node.address,
            size: FULL,
            $compiled: true,
            $open_gate: '#custom_dropdown',
            $popup_texture: node.popup.texture,
            // The interpreted card is 16px narrower than its form so the
            // popup's scrollbar clears the form's own; kept for the look,
            // though a compiled card has nothing to scroll.
            $popup_size: [Math.max(0, root.rect.width - 16), node.popup.height],
          },
        }],
      },
    } satisfies ControlEntry]);

export const FORM_EMIT: HostEmit = {
  id: 'form',

  overlay: popupOverlay,

  emit: {
    button: (node: ButtonNode, ctx: Emit): ControlEntry =>
      entryHost(node.name, node.address, `${ctx.ns}.${ctx.faceNames.get(faceSignature(node)) ?? 'button_1'}`, node),

    text: (node: TextNode, ctx: Emit): ControlEntry =>
      entryHost(node.name, node.address, `${ctx.ns}.${ctx.textNames.get(textSignature(node)) ?? 'text_1'}`, node),
  },

  // One definition per distinct look, named before any is emitted so a face
  // baked inside another face can already be referenced.
  assemble(root, document, ctx): void {
    for (const node of collectKind(root, 'button')) {
      const signature = faceSignature(node);

      if (!ctx.faceNames.has(signature)) {
        ctx.faceNames.set(signature, `button_${ctx.faceNames.size + 1}`);
      }
    }

    const emitted = new Set<string>();

    for (const node of collectKind(root, 'button')) {
      const name = ctx.faceNames.get(faceSignature(node));

      if (name !== undefined && !emitted.has(name)) {
        emitted.add(name);
        Object.assign(document, faceDefs(node, name, ctx));
      }
    }

    for (const node of collectKind(root, 'text')) {
      const signature = textSignature(node);

      if (!ctx.textNames.has(signature)) {
        const name = `text_${ctx.textNames.size + 1}`;

        ctx.textNames.set(signature, name);
        document[name] = textDef(node);
      }
    }
  },
};
