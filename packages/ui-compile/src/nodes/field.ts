import {
  labelFontFields,
  MODAL_DROPDOWN_SLOT_TYPE, MODAL_INLINE_SELECT_SLOT_TYPE, MODAL_INPUT_SLOT_TYPE,
  MODAL_SLIDER_SLOT_TYPE, MODAL_TOGGLE_SLOT_TYPE,
} from '@bedrock-core/ui-runtime/compile';
import type { JSX } from '@bedrock-core/ui-runtime';
import { childElements } from '@bedrock-core/ui-runtime/compile';
import { FONT_SIZE, FULL, layerOf, num, offsetOf, sizeOf, str, topLeft, visibilityOf } from './shared';
import type { Control, ControlEntry } from '../jsonui';
import type { NodeBase, NodeDefinition } from './types';

/** The collection a modal's rows live on. */
export const MODAL_COLLECTION = 'custom_form';

/**
 * The row control each kind mounts: the library's own, with nothing to decode.
 *
 * The interpreter's field controls decode their look and geometry out of
 * `#custom_text`, which a compiled screen sends empty — so each kind either
 * mounts a payload-free twin (`compiled_toggle`) or mounts the interpreter's
 * wrapper with its decode REPLACED: geometry and faces arrive as the literals
 * below (`NO_DECODE`, `sliderGeometry`, `facesOf`) instead of being read out
 * of a payload that is not there.
 */
export const ROW: Readonly<Record<string, string>> = {
  // The interpreter's OWN wrappers — the `@core_ui_common.control` variants,
  // not the `*_control` inside them.
  //
  // Reaching past the wrapper was wrong twice over. A slider's wrapper holds a
  // `travel_anchor`, not `slider_control`, so mounting the latter mounted a
  // piece of a slider and drew nothing. A dropdown's holds TWO children, and
  // mounting one of them lost the current-value label. The wrapper is the
  // control; what is inside it is its business.
  //
  // Vanilla's rows are not usable either: each draws its own caption inside its
  // own rect, so a compiled screen that also draws one gets two — and vanilla's
  // slider renders `"<label>: <value>"`, which with the bare label a compiled
  // screen sends came out as a stray `: 7`.
  [MODAL_TOGGLE_SLOT_TYPE]: 'core_ui_form_components.compiled_toggle',
  [MODAL_SLIDER_SLOT_TYPE]: 'core_ui_form_components.slider',
  [MODAL_DROPDOWN_SLOT_TYPE]: 'core_ui_form_components.dropdown',
  [MODAL_INPUT_SLOT_TYPE]: 'core_ui_form_components.input',
  [MODAL_INLINE_SELECT_SLOT_TYPE]: 'core_ui_form_components.dropdown',
};

/**
 * What a wrapper needs when there is no payload behind it.
 *
 * `core_ui_common.control` is built to DECODE its geometry, its visibility and
 * its enabled state out of `#custom_text`, and is `size: [0, 0]` until it does.
 * A compiled screen sends nothing to decode, so the decode is replaced rather
 * than fed: the size comes from the layout, and the one binding left is the
 * `collection_details` S1 requires for a placed control to own its row.
 */
/**
 * `FormSlider`'s own defaults, for the boxes a compiled screen sizes itself.
 * The thumb matches the static 16x16 `slider_box` hitbox in `slider.json`.
 */
const DEFAULT_TRACK_HEIGHT = 10;
const DEFAULT_THUMB_WIDTH = 16;
const DEFAULT_THUMB_HEIGHT = 16;

/**
 * Every box a slider sizes from the payload, given literally instead.
 *
 * FOUR of them, not one: the travel area the thumb moves in, the track behind
 * it, the track's hover copy, and the thumb itself. Each is a `1 x 0` panel
 * that measures itself from the decode, so with no payload each is `0 x 0` and
 * everything beneath it disappears — which is why the slider stayed invisible
 * through two rounds of fixing its TEXTURES.
 *
 * Arrays, never a pair of numbers in strings: a size must carry a unit or be a
 * real number, and `"$w"` holding `304` is neither.
 */
export const sliderGeometry = (node: FieldNode): Record<string, unknown> => {
  const track = num(node.trackHeight, DEFAULT_TRACK_HEIGHT);
  const thumb = num(node.thumbWidth, DEFAULT_THUMB_WIDTH);

  return {
    $compiled: true,
    // Baked, never read from the row: a compiled slider exists behind its
    // title gate on screens with no row at all, and an unresolved steps read
    // is a division by zero inside the engine's percentage. The starting value
    // is baked too (the engine seeds the row from the form data and owns the
    // drag), so the control needs no collection reads at all.
    $steps: node.steps ?? 1,
    $value: node.value ?? 0,
    // The engine bounds the thumb's CENTRE to the control's width, so the box
    // the slider lives in is narrower than the track by one thumb — then the
    // thumb's EDGE meets the track ends at min and max. Same expression the
    // layout phase writes into `travelWidth` for an interpreted slider.
    $travel_size: [Math.max(0, node.rect.width - thumb), node.rect.height],
    $bar_size: [node.rect.width, track],
    $thumb_size: [thumb, num(node.thumbHeight, DEFAULT_THUMB_HEIGHT)],
  };
};

/** The engine's discrete step count for a slider, from the author's range. */
const sliderSteps = (element: JSX.Element): number => {
  const args = element.nativeArgs;
  const min = num(args?.['min'], 0);
  const max = num(args?.['max'], 1);
  const step = num(args?.['step'], 0);

  return Math.max(1, Math.round(step > 0 ? (max - min) / step : max - min));
};

/** The slider's default value as a step index over that count. */
const sliderValue = (element: JSX.Element): number => {
  const args = element.nativeArgs;
  const min = num(args?.['min'], 0);
  const max = num(args?.['max'], 1);
  const step = num(args?.['step'], 0);
  const unit = step > 0 ? step : 1;
  const fallback = Math.min(Math.max(num(args?.['defaultValue'], min), min), max);

  return Math.max(0, Math.min(sliderSteps(element), Math.round((fallback - min) / unit)));
};

/** The control a compiled screen hosts its dropdown popups in, named after the screen. */
export const popupHostOf = (ns: string): string => `${ns}_popups`;

/** The kinds mounted through `core_ui_common.control`, whose decode is replaced. */
export const NEEDS_DECODE_REPLACED: ReadonlySet<string> = new Set([
  MODAL_SLIDER_SLOT_TYPE,
  MODAL_INPUT_SLOT_TYPE,
  MODAL_DROPDOWN_SLOT_TYPE,
  MODAL_INLINE_SELECT_SLOT_TYPE,
]);

export const NO_DECODE = {
  size: FULL,
  property_bag: {
    '#size_binding_x': 1.0,
    '#size_binding_y': 1.0,
    '#anchored_offset_value_x': 0.0,
    '#anchored_offset_value_y': 0.0,
    '#visible': true,
    '#enabled': true,
  },
  bindings: [{ binding_type: 'collection_details', binding_collection_name: MODAL_COLLECTION }],
} satisfies Control;

/**
 * What a label inside one of these controls is scaled by.
 *
 * Every label in the render pack is declared `font_size: small`, which draws at
 * HALF the engine's standard glyph and is scaled back up from there — so the
 * factor a 1.0 scale means is 2, not 1. Passing the author's scale through
 * unconverted drew every one of them at half size.
 *
 * The number is the one the COMPONENT already worked out. A field's own `scale`
 * prop is consumed where the element is built — `FormInput` folds it into the
 * value and placeholder label groups, `FormDropdown` into the current-value
 * group — so it never reaches these props at all, and re-deriving it from a
 * `scale` that is always undefined would silently ignore whatever the author
 * (or the style package) asked for.
 */
const scaleOf = (props: JSX.Props): number => num(
  props.valueFontScale ?? props.currentFontScale,
  labelFontFields().fontScaleFactor,
);

/**
 * The faces the author gave, as the variables the mounted control reads.
 *
 * The library ships no look: a base defaults to `unstyled` and every texture on
 * a compiled screen comes from the props the author wrote, exactly as a
 * `Button`'s face does. A style package is just an author with opinions.
 */
const facesOf = (props: JSX.Props): Record<string, string> => {
  const off = str(props.background) ?? '';
  const on = str(props.checkedBackground) ?? off;
  const given: Record<string, string | undefined> = {
    $off: off,
    $on: on,
    $off_hover: str(props.backgroundHover) ?? off,
    $on_hover: str(props.checkedHover) ?? on,
    $off_locked: str(props.backgroundLocked) ?? off,
    $on_locked: str(props.checkedLocked) ?? on,
  };

  const faces = Object.fromEntries(
    Object.entries(given).filter((entry): entry is [string, string] => (entry[1] ?? '') !== ''),
  );

  // `$static_texture` is what most kinds' faces read: they go through
  // `core_ui_common.state_face`, which takes a literal when given one and
  // decodes only when not.
  //
  // The slider is the exception — its track, progress and thumb are its own
  // images rather than state faces, so it names each one. The toggle is the
  // other, having eight states that genuinely differ.
  // The popup's own surface. Everything else it draws — each row's face, each
  // row's label — rides that option's blob, which travels on both paths.
  const chooser: Record<string, string | undefined> = { $popup_texture: str(props.popupBackground) };

  const slider: Record<string, string | undefined> = {
    $track: off,
    $track_hover: str(props.backgroundHover) ?? off,
    $progress: str(props.progress),
    $progress_hover: str(props.progressHover) ?? str(props.progress),
    $thumb: str(props.thumb),
    $thumb_hover: str(props.thumbHover) ?? str(props.thumb),
    $thumb_locked: str(props.thumbLocked) ?? str(props.thumb),
  };

  return {
    ...faces,
    ...off === '' ? {} : { $static_texture: off },
    ...Object.fromEntries(
      Object.entries({ ...chooser, ...slider })
        .filter((entry): entry is [string, string] => (entry[1] ?? '') !== ''),
    ),
  };
};

/**
 * A native modal field: laid out here, drawn by the engine.
 *
 * Every other kind on a compiled screen is drawn by the pack. This one cannot
 * be: a `ModalFormData` row is instantiated by VANILLA's `collection_panel`
 * factory, and the interactive widget inside it — the thing that reads and
 * writes the player's answer — is the engine's. No definition replaces it.
 *
 * So the compiled screen PLACES the widget and tells it which row it is.
 *
 * MEASURED (S1, and again on `custom_form` in S3): a control the pack places
 * owns a collection entry when it carries a literal `collection_index` under a
 * host declaring the collection, and its own `collection_details` binding. The
 * widget then sits exactly where the layout put it.
 *
 * That replaces a generator. Vanilla's factory instantiates one control per
 * row and lays them out itself, which means a compiled screen cannot say where
 * a field goes — the fields stacked at the factory's pitch while the decoration
 * sat where the author put it, and the two disagreed. Placing them costs less
 * as well: one control per field the screen actually has, rather than the
 * factory's machinery over the whole collection.
 */
export interface FieldNode extends NodeBase {
  kind: 'field';
  /** Which native control this is: the vanilla row definition it mounts. */
  field: string;
  /** Row in `custom_form`, and the `formValues` slot the answer arrives in. */
  address: number;
  /** The author's textures, as the variables the mounted control reads. */
  faces: Record<string, string>;
  /** `font_scale_factor` for the labels inside the control, over the `small` base. */
  scale: number;
  /** Slider geometry the author gave, for the boxes that would otherwise decode it. */
  trackHeight?: number;
  thumbWidth?: number;
  thumbHeight?: number;
  /** The slider's discrete step count, baked from min/max/step. */
  steps?: number;
  /** The slider's default value as a step index, baking the thumb's start. */
  value?: number;
  /**
   * What the field shows at rest, for the face: a toggle's state, a chooser's
   * current option label, an input's text or placeholder. The engine owns the
   * value once the screen is open; this is only what the build rendered.
   */
  initial: { on?: boolean; text?: string; placeholder?: string };
  /**
   * The dropdown's popup, baked for the OVERLAY the host emits at the screen
   * root. It cannot ride this cell: the visual popup must draw over the whole
   * screen, and the one attempt to mount it inside the native dropdown's own
   * subtree took the client down (names in there are the engine's to resolve).
   */
  popup?: { texture: string; height: number };
}

declare module './types' {
  interface IrNodeMap {
    field: FieldNode;
  }
}

/** The label of the option a chooser starts on, by its value; the value itself when no option carries it. */
const currentOptionLabel = (element: JSX.Element): string => {
  const value = str(element.nativeArgs?.['defaultValue']);
  const options = childElements(element.props.children);
  const current = options.find(option => str(option.props.value) === value) ?? options[0];

  return current === undefined ? value : str(current.props.label, value);
};

/** What each kind of field shows at rest. */
const initialOf = (element: JSX.Element, type: string): FieldNode['initial'] => {
  const args = element.nativeArgs;

  switch (type) {
    case MODAL_TOGGLE_SLOT_TYPE:
      return { on: args?.['defaultValue'] === true };
    case MODAL_INPUT_SLOT_TYPE:
      return { text: str(args?.['defaultValue']), placeholder: str(args?.['placeholder']) };
    case MODAL_DROPDOWN_SLOT_TYPE:
    case MODAL_INLINE_SELECT_SLOT_TYPE:
      return { text: currentOptionLabel(element) };
    default:
      return {};
  }
};

/** A texture over the whole control, when the author gave one. */
const surface = (texture: string | undefined, layer = 1): ControlEntry[] => (
  texture === undefined || texture === ''
    ? []
    : [{ bg: { type: 'image', texture, size: FULL, ...topLeft, keep_ratio: false, layer } }]
);

/** A caption over the face, scaled the way the field scales its own labels. */
const caption = (text: string, node: FieldNode, muted = false): ControlEntry[] => (
  text === ''
    ? []
    : [{
        caption: {
          type: 'label',
          size: ['100% - 8px', 'default'],
          offset: [4, 0],
          anchor_from: 'left_middle',
          anchor_to: 'left_middle',
          text,
          localize: false,
          font_size: FONT_SIZE,
          font_scale_factor: node.scale,
          ...muted ? { color: [0.6, 0.6, 0.6] as [number, number, number] } : {},
          layer: 2,
        },
      }]
);

/**
 * The slider at rest: the track across the middle, the thumb where the
 * default value puts it. The same four boxes the mechanism sizes from
 * literals, drawn as images.
 */
const sliderFace = (node: FieldNode): ControlEntry[] => {
  const track = num(node.trackHeight, DEFAULT_TRACK_HEIGHT);
  const thumbWidth = num(node.thumbWidth, DEFAULT_THUMB_WIDTH);
  const thumbHeight = num(node.thumbHeight, DEFAULT_THUMB_HEIGHT);
  const travel = Math.max(0, node.rect.width - thumbWidth);
  const steps = Math.max(1, node.steps ?? 1);
  const thumbX = Math.round(travel * Math.min(steps, node.value ?? 0) / steps);
  const thumb = node.faces['$thumb'];

  return [
    ...surface(node.faces['$track']).map(entry => ({
      track: { ...entry['bg'], size: [node.rect.width, track] as [number, number], anchor_from: 'left_middle' as const, anchor_to: 'left_middle' as const },
    })),
    ...thumb === undefined || thumb === ''
      ? []
      : [{
          thumb: {
            type: 'image' as const,
            texture: thumb,
            size: [thumbWidth, thumbHeight] as [number, number],
            offset: [thumbX, 0] as [number, number],
            anchor_from: 'left_middle' as const,
            anchor_to: 'left_middle' as const,
            keep_ratio: false,
            layer: 2,
          },
        }],
  ];
};

/** What the field looks like at rest, per kind. */
const restOf = (node: FieldNode): ControlEntry[] => {
  switch (node.field) {
    case MODAL_TOGGLE_SLOT_TYPE:
      return surface(node.initial.on === true ? node.faces['$on'] : node.faces['$off']);
    case MODAL_SLIDER_SLOT_TYPE:
      return sliderFace(node);

    case MODAL_INPUT_SLOT_TYPE: {
      const text = node.initial.text ?? '';

      return [
        ...surface(node.faces['$static_texture']),
        ...text === '' ? caption(node.initial.placeholder ?? '', node, true) : caption(text, node),
      ];
    }

    default:
      return [...surface(node.faces['$static_texture']), ...caption(node.initial.text ?? '', node)];
  }
};

export const fieldDefinition: NodeDefinition<FieldNode> = {
  kind: 'field',
  types: [
    MODAL_TOGGLE_SLOT_TYPE,
    MODAL_SLIDER_SLOT_TYPE,
    MODAL_DROPDOWN_SLOT_TYPE,
    MODAL_INPUT_SLOT_TYPE,
    MODAL_INLINE_SELECT_SLOT_TYPE,
  ],

  lower(element, type, ctx): FieldNode {
    return {
      kind: 'field',
      name: ctx.name('field'),
      rect: ctx.rect,
      ...ctx.decoration,
      field: type,
      address: ctx.cellOf(element).address,
      faces: facesOf(element.props),
      scale: scaleOf(element.props),
      trackHeight: num(element.props.trackHeight),
      thumbWidth: num(element.props.thumbWidth),
      thumbHeight: num(element.props.thumbHeight),
      initial: initialOf(element, type),
      ...type === MODAL_SLIDER_SLOT_TYPE
        ? { steps: sliderSteps(element), value: sliderValue(element) }
        : {},
      // The popup is data the CELL cannot draw; the host's overlay reads it
      // back off this node. `popupHeight` is FormDropdown's own computation
      // (rows x 17 + the fused border + padding), baked as given.
      ...type === MODAL_DROPDOWN_SLOT_TYPE
        ? { popup: { texture: str(element.props.popupBackground) ?? '', height: num(element.props.popupHeight, 20) } }
        : {},
    };
  },

  socket: () => 'field',

  // At rest: the field as the build rendered it, from the author's textures.
  // The modal host stands the engine's own widget here, placed by its row.
  face(node): ControlEntry {
    return {
      [node.name]: {
        type: 'panel',
        size: sizeOf(node.rect),
        offset: offsetOf(node.rect),
        ...topLeft,
        ...layerOf(node),
        ...visibilityOf(node),
        controls: restOf(node),
      },
    };
  },
};
