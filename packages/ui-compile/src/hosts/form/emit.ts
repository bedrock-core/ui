import {
  MODAL_DROPDOWN_SLOT_TYPE, MODAL_INLINE_SELECT_SLOT_TYPE, MODAL_INPUT_SLOT_TYPE, MODAL_SLIDER_SLOT_TYPE,
} from '@bedrock-core/ui-runtime/compile';
import {
  field, list, popupOverlay, press, pressDefs, select, type SelectOption, text, textDef, texture,
  TEXTURE_DEF, visible,
} from '../../connectors/form';
import type { TextStyle } from '../../faces';
import { type ButtonNode, faceSignature, pressAddress } from '../../nodes/primitives/button';
import { collectKind } from '../../nodes';
import type { Control, ControlEntry } from '../../jsonui';
import {
  type FieldNode, type InlineOption, inlineOptionFace,
  NEEDS_DECODE_REPLACED, NO_DECODE, popupHostOf, ROW, sliderGeometry,
} from '../../nodes/primitives/field';
import type { ImageNode } from '../../nodes/primitives/image';
import type { ListNode } from '../../nodes/primitives/list';
import { faceId, FULL, sizeOf } from '../../nodes/utils/shared';
import { isLive, runOf, type TextNode, textSignature } from '../../nodes/primitives/text';
import type { Emit, HostEmit, IrNode } from '../../nodes/utils/types';

/**
 * How a form draws the kinds a chest draws with items.
 *
 * The two screens could hardly be less alike underneath. A chest carries
 * everything through container slots the runtime polls a tick at a time; a
 * form carries it through entries the engine hands back in one response, and
 * carries nothing at all while it is open. What survives that gap is the
 * LOOK — a button's four faces, a label's font — which the face pass already
 * drew and shared. Only the mechanism is here, standing in for each socket
 * at the face's own placement.
 *
 * ## The one rule that is not optional
 *
 * A control owns its entry only if THE CONTROL ITSELF carries the
 * `collection_details` binding. A host above it supplying
 * `collection_index` is enough to read the entry and enough to be clicked, but
 * the press then reaches script as `canceled`, indistinguishable from Esc.
 * Every pressable control emitted here carries {@link FORM_DETAILS_BINDING},
 * and nothing at build time can warn if it stops.
 */

/** A live label's look, as the face layer names its fields. */
const styleOf = (node: TextNode): TextStyle => ({
  fontType: node.fontType,
  fontScaleFactor: node.fontScaleFactor,
  ...node.shadow === undefined ? {} : { shadow: node.shadow },
  ...node.color === undefined ? {} : { color: node.color },
  ...node.textAlignment === undefined ? {} : { align: node.textAlignment },
});

/** The definition a look was named, or the first one when the walks disagree. */
const definitionOf = (names: Map<string, string>, signature: string, fallback: string): string =>
  names.get(signature) ?? fallback;

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

/** The screen's dropdown popups, read off the tree the face pass drew. */
const popups = (root: IrNode, ctx: Emit): ControlEntry[] => popupOverlay(
  popupHostOf(ctx.ns),
  collectKind(root, 'field').flatMap(node => (node.popup === undefined
    ? []
    : [{ name: node.name, address: node.address, texture: node.popup.texture, height: node.popup.height }])),
  root.rect.width,
);

/**
 * The gate a carried `visible` draws through, given the node that carries one.
 *
 * The only mechanism the face pass asks for by inspecting a node rather than
 * by a declared socket, which is why it is adapted here rather than declared
 * beside the rest.
 */
const wrapVisible = (node: IrNode, entry: ControlEntry, ctx: Emit): ControlEntry => {
  const address = node.carriedVisible;

  if (address === undefined) {
    throw new Error(`wrapVisible was handed "${node.name}", which carries no visible entry.`);
  }

  return visible({ name: node.name, address }, entry, ctx);
};

/**
 * What the mounted row is given, per kind.
 *
 * Only the kind knows which of these apply, which is why they are assembled
 * here and handed to the mechanism rather than decided inside it.
 */
const fieldProps = (node: FieldNode, ctx: Emit): Control => ({
  ...NEEDS_DECODE_REPLACED.has(node.field) ? { ...NO_DECODE, $scale: node.scale } : { size: FULL },
  // The slider's travel area sizes itself from the payload, so a compiled one
  // is told its size instead — see `travel_area_static`.
  //
  // As an ARRAY, not two numbers. A size must carry a unit or be a real
  // number, and a variable holding `304` substituted into `"$travel_w"` is a
  // string with neither: the parser rejects the whole file with "Dangling
  // number (no % or px in Size)".
  ...node.field === MODAL_SLIDER_SLOT_TYPE ? sliderGeometry(node) : {},
  // The engine hosts the popup box in the control this names, found BY NAME
  // across the screen: the screen's own popup host, so the name resolves
  // wherever the screen is mounted.
  ...node.field === MODAL_DROPDOWN_SLOT_TYPE ? { $compiled: true, $dropdown_area: popupHostOf(ctx.ns) } : {},
  // The static value and placeholder labels, and the engine pointed at them BY
  // NAME: `ignored` does not take the interpreted copies out of the by-name
  // lookup, so each path names its own.
  ...node.field === MODAL_INPUT_SLOT_TYPE
    ? { $compiled: true, $text_ctrl: 'display_text_static', $placeholder_ctrl: 'place_holder_static' }
    : {},
  ...node.faces,
});

/** An option's four looks, drawn. */
const looksOf = (option: InlineOption): SelectOption => ({
  rect: option.rect,
  rest: inlineOptionFace(option, 'rest'),
  selected: inlineOptionFace(option, 'selected'),
  hover: inlineOptionFace(option, 'hover'),
  selectedHover: inlineOptionFace(option, 'selectedHover'),
});

/** A chooser shows every option at once; every other kind is one native widget. */
const fieldRow = (node: FieldNode, entry: ControlEntry, ctx: Emit): ControlEntry => (
  node.field === MODAL_INLINE_SELECT_SLOT_TYPE
    ? select(
        { name: node.name, address: node.address, options: (node.options ?? []).map(looksOf) },
        entry,
        ctx,
      )
    : field(
        { name: node.name, address: node.address, definition: ROW[node.field] ?? '', props: fieldProps(node, ctx) },
        entry,
        ctx,
      ));

export const FORM_EMIT: HostEmit = {
  id: 'form',

  overlay: popups,

  wrapVisible,

  fill: {
    press: (node: ButtonNode, entry, ctx): ControlEntry => press(
      { name: node.name, address: pressAddress(node), definition: definitionOf(ctx.faceNames, faceId('button', faceSignature(node)), 'press_1') },
      entry,
      ctx,
    ),

    text: (node: TextNode, entry, ctx): ControlEntry => text(
      { name: node.name, address: runOf(node).address, definition: definitionOf(ctx.textNames, textSignature(node), 'text_carrier_1') },
      entry,
      ctx,
    ),

    list: (node: ListNode, entry, ctx): ControlEntry =>
      list({ address: node.countEntry, initial: node.initial, max: node.rows.length }, entry, ctx),

    field: fieldRow,

    texture: (node: ImageNode, entry, ctx): ControlEntry =>
      texture({ name: node.name, address: node.address ?? 0, definition: TEXTURE_DEF }, entry, ctx),
  },

  // One definition per distinct look, named before any is emitted so a face
  // baked inside another face can already be referenced.
  assemble(root, document, ctx): void {
    // A button the engine routes has no press to report, so it needs no
    // mechanism definition — only the shared faces, which the face pass has
    // already emitted.
    for (const node of collectKind(root, 'button').filter(button => button.action === undefined)) {
      const id = faceId('button', faceSignature(node));

      if (!ctx.faceNames.has(id)) {
        const definition = `press_${ctx.faceNames.size + 1}`;

        ctx.faceNames.set(id, definition);
        Object.assign(document, pressDefs({ definition, size: sizeOf(node.rect), ...facesOf(node, ctx) }, ctx));
      }
    }

    // A baked string carries nothing, so it needs no carrier definition: the
    // face already drew it and nothing will ever change it.
    for (const node of collectKind(root, 'text').filter(isLive)) {
      const signature = textSignature(node);

      if (!ctx.textNames.has(signature)) {
        const definition = `text_carrier_${ctx.textNames.size + 1}`;

        ctx.textNames.set(signature, definition);
        document[definition] = textDef({ definition, size: sizeOf(node.rect), style: styleOf(node) }, ctx.collection);
      }
    }
  },
};
