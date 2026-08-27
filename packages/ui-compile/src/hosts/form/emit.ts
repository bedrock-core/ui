import { FORM_COLLECTION, FORM_DETAILS_BINDING } from '@bedrock-core/ui-runtime/compile';
import type { ButtonNode } from '../../nodes/button';
import { collectKind, shapeOf } from '../../nodes';
import type { Binding, Control, ControlEntry } from '../../jsonui';
import { FONT_SIZE, FULL, layerOf, offsetOf, sizeOf, topLeft, visibilityOf } from '../../nodes/shared';
import type { TextNode } from '../../nodes/text';
import type { Emit, HostEmit } from '../../nodes/types';

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
const ENABLED_PROPERTY = '#entry_enabled';

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
});

/**
 * The definition one button look needs: a real button, flat under the index
 * host, exactly as S1 measured it.
 *
 * `enabled` is a form entry's one field. A chest reads it off the item in the
 * slot because a chest has an item; a form has a string, so `'0'` is disabled
 * and anything else is enabled. The engine draws `locked_control` for a
 * disabled button and refuses the press itself, so nothing here has to gate
 * the mappings — which is also why the button stays one control rather than
 * the enabled/disabled pair a chest needs.
 */
const faceDef = (node: ButtonNode, emit: Emit): Control => ({
  type: 'button',
  size: sizeOf(node.rect),
  enabled: ENABLED_PROPERTY,
  property_bag: { [ENABLED_PROPERTY]: true },
  default_control: 'default',
  hover_control: 'hover',
  pressed_control: 'pressed',
  locked_control: 'locked',
  sound_name: 'random.click',
  sound_volume: 1,
  sound_pitch: 1,
  button_mappings: [
    { from_button_id: 'button.menu_select', to_button_id: 'button.form_button_click', mapping_type: 'pressed' },
    { from_button_id: 'button.menu_ok', to_button_id: 'button.form_button_click', mapping_type: 'focused' },
  ],
  bindings: [
    ...entryText(ENTRY_PROPERTY),
    {
      binding_type: 'view',
      source_property_name: `(not (${ENTRY_PROPERTY} = '0'))`,
      target_property_name: ENABLED_PROPERTY,
    },
  ],
  controls: [
    { default: stateImage(node.face.texture) },
    { hover: stateImage(node.face.hover) },
    { pressed: stateImage(node.face.pressed) },
    { locked: stateImage(node.face.disabled ?? node.face.texture) },
    ...node.children.length === 0
      ? []
      : [{
        content: {
          type: 'panel' as const,
          size: FULL,
          ...topLeft,
          controls: node.children.map(child => emit.emitNode(child)),
        },
      } satisfies ControlEntry],
  ],
});

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

export const FORM_EMIT: HostEmit = {
  id: 'form',

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
        document[name] = faceDef(node, ctx);
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
