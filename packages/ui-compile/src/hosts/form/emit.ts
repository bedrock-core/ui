import {
  FORM_COLLECTION, FORM_COUNT_PREFIX, FORM_DETAILS_BINDING, FORM_FLAG_OFF, MODAL_DROPDOWN_SLOT_TYPE,
  MODAL_INLINE_SELECT_SLOT_TYPE, MODAL_INPUT_SLOT_TYPE, MODAL_SLIDER_SLOT_TYPE,
} from '@bedrock-core/ui-runtime/compile';
import { type ButtonNode, faceSignature } from '../../nodes/button';
import { collectKind } from '../../nodes';
import type { Binding, Control, ControlEntry } from '../../jsonui';
import {
  type FieldNode, INLINE_OPTION_TOGGLE, INLINE_STUB, type InlineOption, inlineOptionFace, type InlineOptionState,
  MODAL_COLLECTION, NEEDS_DECODE_REPLACED, NO_DECODE, popupHostOf, ROW, sliderGeometry,
} from '../../nodes/field';
import type { ImageNode } from '../../nodes/image';
import type { ListNode } from '../../nodes/list';
import { entryControl, faceId, FONT_SIZE, FULL, rebased, sizeOf, topLeft } from '../../nodes/shared';
import { type TextNode, textSignature } from '../../nodes/text';
import type { Emit, HostEmit, IrNode } from '../../nodes/types';

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
 * MEASURED (spike S1): a control owns its entry only if THE CONTROL ITSELF
 * carries the `collection_details` binding. A host above it supplying
 * `collection_index` is enough to read the entry and enough to be clicked, but
 * the press then reaches script as `canceled`, indistinguishable from Esc.
 * Every pressable control emitted here carries {@link FORM_DETAILS_BINDING},
 * and nothing at build time can warn if it stops.
 */

/** The face's placement, restated on the mechanism that replaces it. */
const placed = (entry: ControlEntry): Control => {
  const control = entryControl(entry);

  return {
    size: control.size,
    offset: control.offset,
    ...topLeft,
    ...control.layer === undefined ? {} : { layer: control.layer },
    ...control.visible === false ? { visible: false } : {},
  };
};

/** The index host. `collection_index` is legal only on a direct child of a control declaring `collection_name`. */
const entryHost = (
  name: string,
  address: number,
  cell: string,
  entry: ControlEntry,
  collection: string = FORM_COLLECTION,
): ControlEntry => ({
  [name]: {
    type: 'stack_panel',
    orientation: 'vertical',
    ...placed(entry),
    collection_name: collection,
    controls: [{ [`cell@${cell}`]: { collection_index: address } }],
  },
});

/**
 * The string an addressed value travels on, per collection.
 *
 * An action form's entries carry the value in their ICON PATH, a modal's rows
 * in their text. The text of an action-form entry is the interpreter's decoy
 * (`ENTRY_TEXT`): its decoders are constructed on every form and slice every
 * entry's text as a payload, and a text that is not one asserts. The icon
 * path nothing but a compiled control reads — and reads by a plain
 * collection binding, which is the one thing measured safe on an interpreted
 * form's entries as well: an expression over one of those, a `-` or a
 * `'%.Ns' *` format, copies a payload longer than the engine's 1024-byte
 * stack string and asserts, whatever gate the control sits behind.
 */
const payloadBindingFor = (collection: string): string =>
  (collection === MODAL_COLLECTION ? '#custom_text' : '#form_button_texture');

/** Reads the entry's own string, which is the only thing a form entry carries. */
const entryText = (name: string, collection: string = FORM_COLLECTION): Binding[] => [
  { ...FORM_DETAILS_BINDING, binding_collection_name: collection },
  {
    binding_name: payloadBindingFor(collection),
    binding_name_override: name,
    binding_type: 'collection',
    binding_collection_name: collection,
  },
];

/** The value read for a gate: the entry's string alone, no details. */
export const entryValueBinding = (name: string, collection: string): Binding => ({
  binding_name: payloadBindingFor(collection),
  binding_name_override: name,
  binding_type: 'collection',
  binding_collection_name: collection,
});

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
    source_property_name: visible ? `(not (${ENTRY_PROPERTY} = '${FORM_FLAG_OFF}'))` : `(${ENTRY_PROPERTY} = '${FORM_FLAG_OFF}')`,
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

/**
 * The definitions one button look needs.
 *
 * The press surface exists only while the entry says the button is enabled,
 * and a disabled button is its face alone — no button, so no press to refuse.
 * That is the chest's shape, arrived at for the chest's reason: `enabled` on a
 * button does not actually stop the engine handing the press to script.
 *
 * The button itself carries the `collection_details` binding S1 measured, and
 * sits under the index host that names its entry. Every state is one of the
 * shared faces: a button draws the child its `*_control` names and nothing
 * else of its own, so the caption lives inside each face.
 */
const buttonDefs = (node: ButtonNode, name: string, ctx: Emit): Record<string, Control> => {
  const { ns } = ctx;
  const faces = facesOf(node, ctx);

  return {
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
        { [`default@${faces.rest}`]: {} },
        { [`hover@${faces.hover}`]: {} },
        { [`pressed@${faces.pressed}`]: {} },
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
            controls: [{ [`face@${faces.disabled}`]: {} }],
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
// Localized on the client: a live value that is a `.lang` key resolves in the
// player's language, and a literal renders as itself the way an unmatched
// key does. That is what lets a reference travel as its name.
const textDef = (node: TextNode, collection: string): Control => ({
  type: 'label',
  size: sizeOf(node.rect),
  ...topLeft,
  text: ENTRY_PROPERTY,
  localize: true,
  font_type: node.fontType,
  font_size: FONT_SIZE,
  font_scale_factor: node.fontScaleFactor,
  ...node.shadow ? { shadow: node.shadow } : {},
  ...node.color === undefined ? {} : { color: [...node.color] as [number, number, number] },
  ...node.textAlignment === undefined ? {} : { text_alignment: node.textAlignment },
  bindings: entryText(ENTRY_PROPERTY, collection),
});

/**
 * A live texture: the entry's string IS the path. One definition per screen,
 * since nothing about the look varies — the host sizes it, the entry names it.
 */
const TEXTURE_DEF = 'live_image';

/** The property an image's `texture` reads from: vanilla's own name for a bound texture. */
const TEXTURE_PROPERTY = '#texture';

const textureDef = (collection: string): Control => ({
  type: 'image',
  size: FULL,
  ...topLeft,
  keep_ratio: false,
  texture: TEXTURE_PROPERTY,
  bindings: entryText(TEXTURE_PROPERTY, collection),
});

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
const popupOverlay = (root: IrNode, ctx: Emit): ControlEntry[] => {
  const popups = collectKind(root, 'field').flatMap(node => node.popup === undefined
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

  // One host over the whole screen, named after it: the control every
  // dropdown of this screen names as its popup area, so the engine's input
  // shield adopts this layer wherever the screen is mounted.
  return popups.length === 0
    ? []
    : [{ [popupHostOf(ctx.ns)]: { type: 'panel', size: FULL, ...topLeft, layer: POPUP_LAYER, controls: popups } }];
};

/**
 * The gate a carried `visible` draws through.
 *
 * The wrapper takes the face's whole placement — rect, layer, the index host
 * the entry needs — and the face sits inside it at (0,0) with its own
 * visibility cleared, so nothing else about it changes. The gate only READS
 * its entry, so the ancestor's `collection_index` is enough (S1's ownership
 * rule is about presses); it is seeded with the value the build rendered
 * with, so a frame-late binding shows the compiled state rather than a flash.
 */
const wrapVisible = (node: IrNode, entry: ControlEntry, ctx: Emit): ControlEntry => {
  const carried = node.visibleEntry;

  if (carried === undefined) {
    throw new Error(`wrapVisible was handed "${node.name}", which carries no visible entry.`);
  }

  const [key, control] = Object.entries(entry)[0] ?? ['', {}];

  return {
    [`${node.name}_vis`]: {
      type: 'stack_panel',
      orientation: 'vertical',
      ...placed({ [key]: { ...control, visible: undefined } }),
      collection_name: ctx.collection,
      controls: [{
        gate: {
          type: 'panel',
          size: FULL,
          ...topLeft,
          collection_index: carried.address,
          visible: '#visible',
          property_bag: { '#visible': carried.initial },
          bindings: [
            entryValueBinding('#vis_value', ctx.collection),
            {
              binding_type: 'view',
              source_property_name: `(not (#vis_value = '${FORM_FLAG_OFF}'))`,
              target_property_name: '#visible',
            },
          ],
          controls: [{ [key]: rebased(control) }],
        },
      }],
    },
  };
};

/**
 * A list's rows, each behind a gate reading the carried count.
 *
 * ONE entry serves every row: the count travels once as decimal digits, and
 * each gate bakes the ENUMERATION of the counts that show it — row i is
 * visible when the count is any of 'i+1'..'max', as string equalities. Not a
 * numeric `>`: every atom here (`=`, `or`, `not`) is measured in this pack,
 * while an ordering comparison in a runtime binding drew nothing — and
 * equality on the raw string also fails CLOSED, since an entry that never
 * resolves matches no term and the row stays hidden.
 */
const showsRow = (index: number, max: number): string => {
  const terms = Array.from({ length: max - index }, (_, offset) => `(#row_count = '${FORM_COUNT_PREFIX}${String(index + 1 + offset)}')`);

  return terms.length === 1 ? terms[0] ?? '' : `(${terms.join(' or ')})`;
};

/**
 * The list's rows as gates: the face already drew the stack — each row in a
 * panel one pitch tall, the surplus hidden — and the host makes the stack
 * declare the collection so each row panel, a DIRECT child, can carry the
 * count entry's index and read it. A stack gives an invisible child no space
 * (measured, static and bound alike), so the rows past the count collapse and
 * the visible ones pack from the top: the one place a compiled screen
 * reflows at runtime, and it costs nothing.
 */
const listRows = (node: ListNode, entry: ControlEntry, ctx: Emit): ControlEntry => {
  const [key, stack] = Object.entries(entry)[0] ?? ['', {}];

  return {
    [key]: {
      ...stack,
      collection_name: ctx.collection,
      controls: (stack.controls ?? []).map((row, index): ControlEntry => {
        const [rowKey, panel] = Object.entries(row)[0] ?? ['', {}];
        const { visible: _visible, ...rest } = panel;

        return {
          [rowKey]: {
            ...rest,
            collection_index: node.countEntry,
            visible: '#visible',
            property_bag: { '#visible': index < node.initial },
            bindings: [
              entryValueBinding('#row_count', ctx.collection),
              {
                binding_type: 'view',
                source_property_name: showsRow(index, node.rows.length),
                target_property_name: '#visible',
              },
            ],
          },
        };
      }),
    },
  };
};

/**
 * A native modal field, placed by the pack: the index host names the row,
 * and the engine's own widget sits under it exactly where the layout put the
 * face. `collection_index` is legal only on a direct child of a control
 * declaring `collection_name`, which is why the widget is wrapped rather than
 * carrying the index itself.
 */
/**
 * A compiled inline select: the engine's selection machinery with the rows
 * placed by the build.
 *
 * The interpreter's rows position themselves from each option's blob, through
 * size and offset bindings that are inert under a compiled mount. So the
 * compile places them: an invisible native dropdown owns the row's
 * `custom_dropdown` collection and names its content control in place — the
 * interpreter's own stub, which never opens — and inside that content each
 * option is an index host at its rect: a stack declaring the collection,
 * whose one child carries the index (legal only there) and holds the shared
 * radio toggle with the four looks the build drew for it. The toggle's own
 * bindings live in its definition, where the variables they read are fixed.
 *
 * The radio group is named after the row: every inline select on a screen is
 * visible at once, and toggles sharing a group name select together.
 */
const inlineSelectRow = (node: FieldNode, entry: ControlEntry): ControlEntry => {
  const content = `content_${String(node.address)}`;
  const offscreen = `offscreen_${String(node.address)}`;
  const group = `custom_dropdown_radio_toggle_${String(node.address)}`;
  // The toggle's eight state children; the locked ones look like rest and selected.
  const LOOKS: readonly [string, InlineOptionState][] = [
    ['unchecked', 'rest'], ['checked', 'selected'], ['unchecked_hover', 'hover'], ['checked_hover', 'selectedHover'],
    ['unchecked_locked', 'rest'], ['checked_locked', 'selected'], ['unchecked_locked_hover', 'rest'], ['checked_locked_hover', 'selected'],
  ];
  const states = (option: InlineOption): ControlEntry[] => LOOKS.map(([name, look]) => ({
    [name]: { type: 'panel', size: FULL, ...topLeft, controls: inlineOptionFace(option, look) },
  }));
  const rows: ControlEntry[] = (node.options ?? []).map((option, index) => ({
    [`option_${String(index)}`]: {
      type: 'stack_panel',
      orientation: 'vertical',
      size: sizeOf(option.rect),
      offset: [option.rect.x, option.rect.y],
      ...topLeft,
      collection_name: 'custom_dropdown',
      controls: [{
        row: {
          type: 'panel',
          size: FULL,
          ...topLeft,
          collection_index: index,
          controls: [{
            [`toggle@${INLINE_OPTION_TOGGLE}`]: {
              size: FULL,
              toggle_name: group,
              controls: states(option),
            },
          }],
        },
      }],
    },
  }));

  return {
    [node.name]: {
      type: 'stack_panel',
      orientation: 'vertical',
      ...placed(entry),
      collection_name: MODAL_COLLECTION,
      controls: [{
        field: {
          type: 'panel',
          size: FULL,
          ...topLeft,
          collection_index: node.address,
          bindings: [{ binding_type: 'collection_details', binding_collection_name: MODAL_COLLECTION }],
          controls: [
            {
              [`stub@${INLINE_STUB}`]: {
                type: 'dropdown',
                ...topLeft,
                dropdown_name: 'custom_dropdown',
                dropdown_content_control: content,
                dropdown_area: offscreen,
              },
            },
            { [offscreen]: { type: 'panel', size: [0, 0], visible: false } },
            { [content]: { type: 'panel', size: FULL, ...topLeft, controls: rows } },
          ],
        },
      }],
    },
  };
};

const fieldRow = (node: FieldNode, entry: ControlEntry, ctx: Emit): ControlEntry => (node.field === MODAL_INLINE_SELECT_SLOT_TYPE ? inlineSelectRow(node, entry) : {
  [node.name]: {
    type: 'stack_panel',
    orientation: 'vertical',
    ...placed(entry),
    collection_name: MODAL_COLLECTION,
    controls: [{
      [`field@${ROW[node.field] ?? ''}`]: {
        collection_index: node.address,
        ...NEEDS_DECODE_REPLACED.has(node.field) ? { ...NO_DECODE, $scale: node.scale } : { size: FULL },
        // The slider's travel area sizes itself from the payload, so a
        // compiled one is told its size instead — see `travel_area_static`.
        //
        // As an ARRAY, not two numbers. A size must carry a unit or be a
        // real number, and a variable holding `304` substituted into
        // `"$travel_w"` is a string with neither: the parser rejects the
        // whole file with "Dangling number (no % or px in Size)".
        ...node.field === MODAL_SLIDER_SLOT_TYPE ? sliderGeometry(node) : {},
        // The engine hosts the popup box in the control this names, found
        // BY NAME across the screen: the screen's own popup host, so the
        // name resolves wherever the screen is mounted (the host emits it
        // at the root — see the overlay).
        ...node.field === MODAL_DROPDOWN_SLOT_TYPE ? { $compiled: true, $dropdown_area: popupHostOf(ctx.ns) } : {},
        // The static value and placeholder labels, and the engine pointed at
        // them BY NAME: `ignored` does not take the interpreted copies out of
        // the by-name lookup, so each path names its own (the slider's
        // bar-control rule, on the edit box).
        ...node.field === MODAL_INPUT_SLOT_TYPE
          ? { $compiled: true, $text_ctrl: 'display_text_static', $placeholder_ctrl: 'place_holder_static' }
          : {},
        ...node.faces,
      },
    }],
  },
});

export const FORM_EMIT: HostEmit = {
  id: 'form',

  overlay: popupOverlay,

  wrapVisible,

  fill: {
    press: (node: ButtonNode, entry, ctx): ControlEntry =>
      entryHost(node.name, node.address, `${ctx.ns}.${ctx.faceNames.get(faceId('button', faceSignature(node))) ?? 'press_1'}`, entry),

    text: (node: TextNode, entry, ctx): ControlEntry =>
      entryHost(node.name, node.address, `${ctx.ns}.${ctx.textNames.get(textSignature(node)) ?? 'text_carrier_1'}`, entry, ctx.collection),

    list: listRows,

    field: fieldRow,

    texture: (node: ImageNode, entry, ctx): ControlEntry => {
      ctx.defs[TEXTURE_DEF] ??= textureDef(ctx.collection);

      return entryHost(node.name, node.address ?? 0, `${ctx.ns}.${TEXTURE_DEF}`, entry, ctx.collection);
    },
  },

  // One definition per distinct look, named before any is emitted so a face
  // baked inside another face can already be referenced.
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
        const name = `text_carrier_${ctx.textNames.size + 1}`;

        ctx.textNames.set(signature, name);
        document[name] = textDef(node, ctx.collection);
      }
    }
  },
};
