import {
  dropdownWidget, field, inputWidget, list, popupHostOf, popupOverlay, press, pressDefs, select,
  type SelectOption, text, textDef, texture, TEXTURE_DEF, toggleWidget, visible,
} from '../../connectors/form';
import type { TextStyle } from '../../faces';
import { type ButtonNode, faceSignature, pressAddress } from '../../nodes/primitives/button';
import { MODAL_COLLECTION } from '../../connectors/form/entry';
import { collectKind } from '../../nodes';
import type { Binding, ControlEntry } from '../../jsonui';
import { type InlineOption, inlineOptionFace } from '../../nodes/primitives/select';
import type { ImageNode } from '../../nodes/primitives/image';
import type { ListNode } from '../../nodes/primitives/list';
import { faceId, sizeOf } from '../../nodes/utils/shared';
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
  collectKind(root, 'dropdown').map(node =>
    ({ name: node.name, address: node.address, texture: node.popup.texture, height: node.popup.height })),
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

/** An option's four looks, drawn. */
const looksOf = (option: InlineOption): SelectOption => ({
  rect: option.rect,
  rest: inlineOptionFace(option, 'rest'),
  selected: inlineOptionFace(option, 'selected'),
  hover: inlineOptionFace(option, 'hover'),
  selectedHover: inlineOptionFace(option, 'selectedHover'),
});

/**
 * A native field: the engine's own widget, standing in the face's place.
 *
 * Each kind names the row it mounts and what that row reads; the mechanism is
 * the same for all five, which is what makes them one socket rather than five.
 * A chooser is the exception — it shows every option at once, so it is placed
 * rather than mounted.
 */
/** The definition that draws the slider standing for one row. */
const sliderCell = (address: number): string => `slider_cell_${String(address)}`;

/**
 * Reads which row a cell landed on, and shows it only in the socket that row
 * belongs to.
 *
 * The factory makes a cell for EVERY row of the form, so every slider on the
 * screen would otherwise draw in every socket — nine thumbs for three sliders,
 * each live and editing a different setting.
 *
 * The row is baked into the comparison rather than passed as a variable: a
 * factory NAMES its cell instead of mounting it, and a definition reached by
 * reference resolves `$variables` in its own scope — so a variable set on the
 * derivation reaches nothing, and the binding that reads it is dropped as
 * malformed.
 *
 * It also rides a CHILD rather than the cell itself. A factory cell's own
 * `visible` is ignored: measured with the bindings parsing cleanly and the
 * comparison sound, the engine drew every cell regardless. A plain control
 * inside it hides the way anything else does — and since a computed property
 * does not reach children, that child carries the whole chain.
 *
 * The payload it reads is the row index, and nothing else: the build places the
 * socket, so no geometry has to travel.
 */
const rowGate = (address: number): Binding[] => [
  { binding_type: 'collection_details', binding_collection_name: MODAL_COLLECTION },
  {
    binding_name: '#custom_slider_text',
    binding_type: 'collection',
    binding_collection_name: MODAL_COLLECTION,
    binding_name_override: '#payload',
  },
  { binding_type: 'view', source_property_name: '(\'%.9s\' * #payload)', target_property_name: '#hdr' },
  { binding_type: 'view', source_property_name: '(#payload - #hdr)', target_property_name: '#rest' },
  { binding_type: 'view', source_property_name: '(\'%.83s\' * #rest)', target_property_name: '#raw_type' },
  { binding_type: 'view', source_property_name: '(#rest - #raw_type)', target_property_name: '#at_row' },
  { binding_type: 'view', source_property_name: '(\'%.83s\' * #at_row)', target_property_name: '#raw_row' },
  {
    binding_type: 'view',
    source_property_name: '(((\'%.82s\' * #raw_row) - (\'%.2s\' * #raw_row) - \';\') * 1)',
    target_property_name: '#row',
  },
  { binding_type: 'view', source_property_name: `(#row = ${String(address)})`, target_property_name: '#mine' },
];

/**
 * A slider's place, filled by the ENGINE rather than by the build.
 *
 * The build keeps the rect — so the slider sits where the layout put it, and
 * inside a scroll it scrolls with it — and hands the inside to a factory over
 * the form's own rows. `control_ids` is the engine picking by row TYPE, so only
 * a slider row builds a slider; the cell then hides itself unless the row is
 * the one this socket stands for.
 *
 * That is what makes a native slider possible at all on a compiled screen: it
 * validates its value against the form field behind it, and a cell exists only
 * where that field does.
 */
const sliderSocket = (address: number, ns: string, entry: ControlEntry): ControlEntry => Object.fromEntries(
  Object.entries(entry).map(([name, control]) => [name, {
    ...control,
    controls: [{
      live_slider: {
        type: 'collection_panel' as const,
        size: ['100%', '100%'] as [string, string],
        anchor_from: 'top_left' as const,
        anchor_to: 'top_left' as const,
        collection_name: MODAL_COLLECTION,
        factory: {
          name: 'buttons',
          control_ids: {
            slider: `@${ns}.${sliderCell(address)}`,
            step_slider: `@${ns}.${sliderCell(address)}`,
            label: '@core_ui_common.unused',
            toggle: '@core_ui_common.unused',
            dropdown: '@core_ui_common.unused',
            input: '@core_ui_common.unused',
            header: '@core_ui_common.unused',
            divider: '@core_ui_common.unused',
          },
        },
        bindings: [{ binding_name: '#custom_form_length', binding_name_override: '#collection_length' }],
      },
    }],
  }]),
);

const nativeField = (node: IrNode, entry: ControlEntry, ctx: Emit): ControlEntry => {
  switch (node.kind) {
    case 'select':
      return select(
        { name: node.name, address: node.address, options: node.options.map(looksOf) },
        entry,
        ctx,
      );

    case 'toggle':
      return field({ name: node.name, address: node.address, ...toggleWidget(node) }, entry, ctx);

    case 'slider':
      // The build leaves the SPACE and draws nothing. A slider takes its step
      // range from the form field behind it, and a placed one is laid out on
      // every form in the world — including forms that have no such field, where
      // any write to its value asserts. So the engine's own factory builds it
      // instead, one cell per slider ROW (modal_container's `live_sliders`), and
      // the cell places itself at this rect by decoding its own row.
      return sliderSocket(node.address, ctx.ns, entry);

    case 'input':
      return field({ name: node.name, address: node.address, ...inputWidget(node) }, entry, ctx);

    case 'dropdown':
      return field({ name: node.name, address: node.address, ...dropdownWidget(node, ctx.ns) }, entry, ctx);

    default:
      throw new Error(`The modal has no widget for a "${node.kind}", which asked for a field.`);
  }
};

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

    field: nativeField,

    texture: (node: ImageNode, entry, ctx): ControlEntry =>
      texture({ name: node.name, address: node.address ?? 0, definition: TEXTURE_DEF }, entry, ctx),
  },

  // One definition per distinct look, named before any is emitted so a face
  // baked inside another face can already be referenced.
  assemble(root, document, ctx): void {
    // One cell definition per slider, each knowing which ROW it stands for.
    //
    // The factory the socket holds makes a cell for every row of the form, so
    // every slider on the screen would otherwise draw in every socket. The row
    // is the only thing that tells them apart, and a factory names its cell
    // rather than mounting it — so the number cannot be passed in, it has to be
    // baked into a definition of that cell's own.
    for (const node of collectKind(root, 'slider')) {
      Object.assign(document, {
        [`${sliderCell(node.address)}@core_ui_form_components.slider_live`]: {
          controls: [{
            gate: {
              type: 'panel' as const,
              size: ['100%', '100%'] as [string, string],
              anchor_from: 'top_left' as const,
              anchor_to: 'top_left' as const,
              // MOVED AWAY, not hidden. `visible` is ignored throughout a
              // factory-built subtree — measured on the cell and again on this
              // child, with the bindings parsing and the comparison sound — so a
              // cell that is not this socket's row is pushed off the screen
              // instead. `not #mine` is 1 or 0 in arithmetic, so the offset is
              // the condition.
              //
              // The multiplier is large because an anchored offset is a multiple
              // of the control's OWN height, not the screen's: a slider row is
              // about twenty pixels, so a small factor merely stacks the strays
              // a row or two apart.
              use_anchored_offset: true,
              property_bag: { '#row': -1, '#mine': false, '#anchored_offset_value_x': 0, '#anchored_offset_value_y': 0 },
              bindings: [
                ...rowGate(node.address),
                { binding_type: 'view', source_property_name: '((not #mine) * 1000)', target_property_name: '#anchored_offset_value_y' },
              ],
              controls: [{ 'body@core_ui_form_components.slider_body': {} }],
            },
          }],
        },
      });
    }

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

        // A hugging string draws at its own width inside the host's box, which
        // is content-sized: the rect the layout solved is what the box started
        // from, not what the value has to fit.
        const size: [number, number] | ['default', 'default'] = node.hug === true ? ['default', 'default'] : sizeOf(node.rect);

        ctx.textNames.set(signature, definition);
        document[definition] = textDef({ definition, size, style: styleOf(node) }, ctx.collection);
      }
    }
  },
};
