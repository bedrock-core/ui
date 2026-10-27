import {
  dropdownWidget, field, fits, inputWidget, list, look, multiSelect, popupHostOf, popupOverlay, press, pressDefs, select,
  type SelectOption, text, textDef, texture, TEXTURE_DEF, toggleWidget, visible,
} from '../../connectors/form';
import type { TextStyle } from '../../faces';
import { THUMB_HEIGHT, THUMB_WIDTH, TRACK_HEIGHT } from '../../faces/primitives/slider';
import { type ButtonNode, type FacedNode, faceSignature, lookOf, pressAddress, pressSizeOf } from '../../nodes/primitives/button';
import { collectKind } from '../../nodes';
import type { Control, ControlEntry } from '../../jsonui';
import { type InlineOption, inlineOptionFace } from '../../nodes/primitives/select';
import type { ImageNode } from '../../nodes/primitives/image';
import type { ListNode } from '../../nodes/primitives/list';
import type { ScrollNode } from '../../nodes/primitives/scroll';
import { faceId, sizeOf } from '../../nodes/utils/shared';
import { pinnedEnabled } from '../../nodes/utils/fields';
import { runOf, type TextNode, textSignature } from '../../nodes/primitives/text';
import type { Emit, HostEmit, IrNode } from '../../nodes/utils/types';
import type { PanelNode } from '../../nodes/primitives/panel';
import { ENTRY_PROPERTY, entrySource } from '../../connectors/form/entry';
import { sliderValueControl } from './slider-value';

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

/**
 * The shared faces of one look, fully qualified, as the face pass named them.
 *
 * Takes the look the FACE PASS drew, not the node: a hugging button's face is
 * shared without its children (they are drawn beside the press, not in it), so
 * naming it from the node would name a definition nothing emitted.
 */
const facesFor = (faced: FacedNode, ctx: Emit): { id: string; rest: string; hover: string; pressed: string; disabled: string } => {
  const id = faceId('button', faceSignature(faced));

  return {
    id,
    rest: `${ctx.facesNs}.${id}`,
    hover: `${ctx.facesNs}.${id}_hover`,
    pressed: `${ctx.facesNs}.${id}_pressed`,
    disabled: `${ctx.facesNs}.${faced.face.disabled === undefined ? id : `${id}_disabled`}`,
  };
};

/** The shared faces of the look the build drew this button in. */
const facesOf = (node: ButtonNode, ctx: Emit): { id: string; rest: string; hover: string; pressed: string; disabled: string } =>
  facesFor(lookOf(node), ctx);

/**
 * How a button's press definition is found again.
 *
 * A button whose look holds still shares one definition with every button of
 * the same look. One whose look follows state has the entry that names the
 * look baked into its gates, so it keeps a definition of its own.
 */
const pressKey = (node: ButtonNode): string =>
  (node.looks === undefined ? faceId('button', faceSignature(lookOf(node))) : `looks:${node.name}`)
  + (node.hitSlop === undefined ? '' : `:hit:${String(node.hitSlop)}`);

/** One version of a carried look, gated on the entry naming the look worn. */
const wrapLook = (node: IrNode, entry: ControlEntry, ctx: Emit): ControlEntry => {
  const gate = node.lookGate;

  if (gate === undefined) {
    throw new Error(`wrapLook was handed "${node.name}", which is no version of a carried look.`);
  }

  return look({ name: node.name, address: gate.address, index: gate.index }, entry, ctx);
};

/** The screen's dropdown popups, read off the tree the face pass drew. */
const popups = (root: IrNode, ctx: Emit): ControlEntry[] => popupOverlay(
  popupHostOf(ctx.ns),
  collectKind(root, 'dropdown').map(node =>
    ({ name: node.name, address: node.address, ...node.popup })),
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

  const control = Object.values(entry)[0];
  const fixedSize: Control['size'] | undefined = 'inputFill' in node && node.inputFill === true
    ? [control?.size?.[0] ?? node.rect.width, node.rect.height]
    : undefined;

  return visible({ name: node.name, address, ...fixedSize === undefined ? {} : { fixedSize } }, entry, ctx);
};

/** An option's four looks, drawn. */
const looksOf = (option: InlineOption): SelectOption => ({
  rect: option.rect,
  ...option.visible === false ? { visible: false } : {},
  ...option.enabled === false ? { enabled: false } : {},
  rest: inlineOptionFace(option, 'rest'),
  selected: inlineOptionFace(option, 'selected'),
  hover: inlineOptionFace(option, 'hover'),
  selectedHover: inlineOptionFace(option, 'selectedHover'),
});

/** Each native widget reads the row assigned by modal allocation. */
const nativeField = (node: IrNode, entry: ControlEntry, ctx: Emit): ControlEntry => {
  switch (node.kind) {
    case 'select':
      // Several choices are a toggle per option, each answering in a row of its
      // own; one is the dropdown the options answer through together.
      return (node.multiple ? multiSelect : select)(
        { name: node.name, address: node.address, enabled: node.enabled, options: node.options.map(looksOf) },
        entry,
        ctx,
      );

    case 'toggle':
      return field({ name: node.name, address: node.address, ...toggleWidget(node) }, entry, ctx);

    case 'slider':
      return field({
        name: node.name, address: node.address, definition: 'core_ui_form_components.slider_body',
        props: {
          ...pinnedEnabled(node), ...node.mount,
          $travel_size: [Math.max(0, node.rect.width - (node.thumbWidth ?? THUMB_WIDTH)), node.thumbHeight ?? THUMB_HEIGHT],
          $bar_size: [node.rect.width, node.trackHeight ?? TRACK_HEIGHT],
          $thumb_size: [node.thumbWidth ?? THUMB_WIDTH, node.thumbHeight ?? THUMB_HEIGHT],
          ...node.valueRange === undefined ? {} : { $value_content: `${ctx.ns}.slider_value_${node.address}` },
        },
      }, entry, ctx);

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

  wrapLook,

  fill: {
    selection: (node: PanelNode, entry, ctx): ControlEntry => {
      const mask = node.selection?.mask;

      if (mask === undefined) { throw new Error('A dynamic selection requires a membership carrier.'); }

      const [name, control] = Object.entries(entry)[0];
      const indexes = node.selection!.indexes;
      const properties = indexes.map(index => `#navigation_selected_${index}`);
      const source = entrySource(`selection_${name}`, mask.address, mask.initial, ctx);
      const matches = indexes.map(index => `#mask_match_${index}`);
      const terms = indexes.map((index, at) => `(${properties[at]} and (not ((#selection_mask - '|${index}|') = #selection_mask)))`);

      return { [name]: {
        ...control,
        property_bag: { ...control.property_bag, '#selection_mask': mask.initial,
          '#visible': mask.initial.includes('|0|'),
          ...Object.fromEntries(indexes.map(index => [`#mask_match_${index}`, index === 0 && mask.initial.includes('|0|')])),
        },
        bindings: [
          ...control.bindings?.filter(binding => binding.target_property_name !== '#visible') ?? [],
          { binding_type: 'view', source_control_name: source, source_property_name: ENTRY_PROPERTY, target_property_name: '#selection_mask' },
          ...indexes.length === 1
            ? []
            : terms.map((term, at) => ({ binding_type: 'view' as const,
                source_property_name: term, target_property_name: matches[at],
              })),
          { binding_type: 'view', source_property_name: indexes.length === 1
            ? terms[0]
            : `(${matches.join(' or ')})`, target_property_name: '#visible' },
        ],
      } };
    },
    press: (node: ButtonNode, entry, ctx): ControlEntry => press(
      { name: node.name, address: pressAddress(node), definition: definitionOf(ctx.faceNames, pressKey(node), 'press_1') },
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

    fits: (node: ScrollNode, entry, ctx): ControlEntry => {
      if (node.wide === undefined) {
        throw new Error(`"${node.name}" asked which width to show, but was laid out at one.`);
      }

      const { list: rows, fit } = node.wide;

      return fits({ address: rows.countEntry, initial: rows.initial, max: rows.rows.length, fit }, entry, ctx);
    },

    field: nativeField,

    texture: (node: ImageNode, entry, ctx): ControlEntry =>
      texture({ name: node.name, address: node.address ?? 0, definition: TEXTURE_DEF }, entry, ctx),
  },

  // One definition per distinct look, named before any is emitted so a face
  // baked inside another face can already be referenced.
  assemble(root, document, ctx): void {
    for (const node of collectKind(root, 'slider')) {
      if (node.valueRange !== undefined) {
        document[`slider_value_${node.address}@core_ui_form_components.slider_value_label`] = sliderValueControl(node.valueRange);
      }
    }

    // A button the engine routes has no press to report, so it needs no
    // mechanism definition — only the shared faces, which the face pass has
    // already emitted.
    for (const node of collectKind(root, 'button').filter(button => button.action === undefined)) {
      const key = pressKey(node);

      if (!ctx.faceNames.has(key)) {
        const definition = `press_${ctx.faceNames.size + 1}`;

        ctx.faceNames.set(key, definition);
        Object.assign(document, pressDefs({
          definition,
          ...node.hitSlop === undefined ? {} : { hitSlop: node.hitSlop },
          size: pressSizeOf(node),
          ...facesOf(node, ctx),
          // A look that follows state draws every face it takes, gated on the
          // entry that names which one is worn.
          ...node.looks === undefined
            ? {}
            : {
                looks: {
                  address: node.looks.address,
                  states: node.looks.faces.map(look => facesFor({ ...lookOf(node), ...look }, ctx)),
                },
              },
        }, ctx));
      }
    }

    // A baked string carries nothing, so it needs no carrier definition: the
    // face already drew it and nothing will ever change it.
    for (const node of collectKind(root, 'text').filter(node => node.address !== undefined)) {
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
