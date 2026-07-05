import { isModalForm } from '../../core/guards';
import { ModalFormError, type Writer } from '../../core/types';
import { emitSlider } from '../../core/writers';
import { FunctionComponent, JSX } from '../../jsx';
import { resolveStateBackgrounds, withControl, type StateBackgroundProps } from '../control';
import { FormControlBase } from './shared';

/** Host type for the native modal slider slot (modal-only). */
export const MODAL_SLIDER_SLOT_TYPE = 'modal-slider';

export interface FormSliderProps extends FormControlBase, StateBackgroundProps {
  /** Minimum selectable value. */
  min: number;
  /** Maximum selectable value. */
  max: number;
  /** Increment between selectable values. Defaults to `1` (native default). */
  step?: number;
  /** Initial value. Defaults to `min`. */
  defaultValue?: number;
  // StateBackgroundProps styles the TRACK (bar frame + inner track): background +
  // backgroundHover are shown; pressed/locked are carried for the shared
  // button-identical block but the slider RP has no bar states for them.
  /** Progress-fill texture (left of the thumb). Defaults to the resolved track base. */
  progress?: string;
  /** Progress-fill hover texture. Defaults to the resolved progress texture. */
  progressHover?: string;
  /** Thumb (draggable handle) texture. Defaults to the resolved track base. */
  thumb?: string;
  /** Thumb hover texture. Defaults to the resolved thumb texture. */
  thumbHover?: string;
  /** Thumb pressed/dragged (indent) texture. Defaults to the resolved thumb texture. */
  thumbPressed?: string;
  /** Thumb locked/disabled texture. Defaults to the resolved thumb texture. */
  thumbLocked?: string;
  /**
   * Track (and progress fill) height in px. The track always spans the full control
   * width and is vertically centered; this sets how tall it draws. Default `10`.
   */
  trackHeight?: number;
  /** Thumb (draggable handle) width in px. Default `16`. */
  thumbWidth?: number;
  /** Thumb (draggable handle) height in px. Default `16`. */
  thumbHeight?: number;
}

/**
 * RP defaults for the slider geometry. The thumb default matches the STATIC 16×16
 * `slider_box` hitbox in slider.json (the hitbox can't be payload-driven — every
 * dynamic-size mechanism is dead on `type: slider_box`, in-game verified), so the
 * default visual thumb and its interactive core coincide exactly.
 */
const DEFAULT_TRACK_HEIGHT = 10;
const DEFAULT_THUMB_WIDTH = 16;
const DEFAULT_THUMB_HEIGHT = 16;

/**
 * Numeric slider field → `ModalFormData.slider`. Result (`Form.onSubmit`): `number`.
 * Modal-only; render inside a `<Form>`. Accepts the same control/layout props as any
 * component; geometry is computed by the layout phase and encoded into the label
 * payload for the RP to position/style the native widget.
 */
export const FormSlider: FunctionComponent<FormSliderProps> = ({
  name, min, max, step, defaultValue,
  backgroundHover, backgroundPressed, backgroundLocked,
  progress, progressHover, thumb, thumbHover, thumbPressed, thumbLocked,
  trackHeight, thumbWidth, thumbHeight, ...layout
}: FormSliderProps): JSX.Element => {
  // Track mirrors Button; progress and thumb follow the same rule against their own
  // bases (a single `background` styles the whole slider when nothing else is given).
  const track = resolveStateBackgrounds({ background: layout.background, backgroundHover, backgroundPressed, backgroundLocked });
  const progressBase = progress ?? track.background;
  const thumbBase = thumb ?? track.background;

  return {
    type: MODAL_SLIDER_SLOT_TYPE,
    props: {
      // Control block first so the state textures land at BUTTON-IDENTICAL byte
      // offsets ([1024-1272] right after the reserved block), slider-specific
      // fields after. `name` is appended LAST so it survives to the writer without
      // disturbing the RP-read offsets; `build` is a function → routed to
      // callbacks, not encoded. Default width to '100%' so the track fills whatever
      // container wraps it regardless of the wrapper's flex direction — but ONLY
      // when the caller gave no sizing (explicit width or flex sizing must win).
      ...withControl({
        ...(layout.width !== undefined || layout.flex !== undefined
          || layout.flexGrow !== undefined || layout.flexBasis !== undefined
          ? {}
          : { width: '100%' }),
        ...layout,
        background: track.background,
      }),
      backgroundHover: track.backgroundHover, // [1024-1106] like Button
      backgroundPressed: track.backgroundPressed, // [1107-1189] reserved (no bar state)
      backgroundLocked: track.backgroundLocked, // [1190-1272] reserved (no bar state)
      progress: progressBase, // [1273-1355] slider-specific
      progressHover: progressHover ?? progressBase, // [1356-1438]
      thumb: thumbBase, // [1439-1521]
      thumbHover: thumbHover ?? thumbBase, // [1522-1604]
      thumbPressed: thumbPressed ?? thumbBase, // [1605-1687] engine "indent" state
      thumbLocked: thumbLocked ?? thumbBase, // [1688-1770]
      // Geometry: track spans the full control width (RP), these size the rest.
      trackHeight: trackHeight ?? DEFAULT_TRACK_HEIGHT, // [1771-1853]
      thumbWidth: thumbWidth ?? DEFAULT_THUMB_WIDTH, // [1854-1936]
      thumbHeight: thumbHeight ?? DEFAULT_THUMB_HEIGHT, // [1937-2019]
      // [2020-2102] thumb-travel width = control width - thumbWidth, so the thumb's
      // EDGE (not center) meets the track ends at min/max. Placeholder here; the
      // layout phase fills it in-place once jsonUIWidth is known (like `region`).
      // This MUST stay the last SERIALIZED field — the RP decodes it at [2020].
      travelWidth: 0,
    },
    // Native args ride the writer-only side channel: never serialized, so they cost no
    // payload bytes and (crucially) leave travelWidth as the last field at [2020].
    // `defaultValue` resolves `?? min` here so the writer stays a pure reader.
    nativeArgs: {
      name,
      min,
      max,
      step: step ?? 0, // 0 → "no step" (native valueStep undefined); see writer.
      defaultValue: defaultValue ?? min,
    },
  };
};

/** Serializes a `modal-slider` into the native modal slider control. */
export const formSliderWriter: Writer = (payload, form, ctx, _callbacks, _props, nativeArgs) => {
  if (!isModalForm(form)) {
    throw new ModalFormError('Form.Slider must be rendered inside a `<Form>`.');
  }

  const name = typeof nativeArgs?.name === 'string' ? nativeArgs.name : '';
  const min = typeof nativeArgs?.min === 'number' ? nativeArgs.min : 0;
  const max = typeof nativeArgs?.max === 'number' ? nativeArgs.max : 0;
  const step = typeof nativeArgs?.step === 'number' ? nativeArgs.step : 0;
  const defaultValue = typeof nativeArgs?.defaultValue === 'number' ? nativeArgs.defaultValue : min;

  // step 0 is the sentinel for "unset" → let the native default (1) apply.
  emitSlider(payload, form, ctx, name, min, max, defaultValue, step === 0 ? undefined : step);
};
