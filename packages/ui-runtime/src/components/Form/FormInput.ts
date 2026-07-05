import { isModalForm } from '../../core/guards';
import { ModalFormError, type Writer } from '../../core/types';
import { emitInput } from '../../core/writers';
import { FunctionComponent, JSX } from '../../jsx';
import { resolveStateBackgrounds, withControl, type StateBackgroundProps } from '../control';
import { labelFontFields, type LabelFont } from './controlPayload';
import { MODAL_INPUT_SLOT_TYPE } from './modalControls';
import { FormControlBase } from './shared';

export interface FormInputProps extends FormControlBase, StateBackgroundProps {
  /** Placeholder shown inside the native text field when empty. */
  placeholder?: string;
  /** Initial text. Defaults to `''`. */
  defaultValue?: string;
  /** Field text font family (typed value + placeholder). Defaults to `'mojangles'`. */
  font?: LabelFont;
  /** Field text scale multiplier relative to the standard glyph size. Default `1.0`. */
  scale?: number;
  // StateBackgroundProps styles the edit box: background + hover + pressed (focused)
  // + locked, at the button-identical payload offsets.
}

/**
 * Text field → `ModalFormData.textField`. Result (`Form.onSubmit`): `string`.
 * Modal-only; render inside a `<Form>`. Accepts the same control/layout props as any
 * component; geometry is computed by the layout phase and encoded into the label
 * payload for the RP to position/style the native widget.
 */
export const FormInput: FunctionComponent<FormInputProps> = ({
  name, placeholder, defaultValue, font, scale,
  backgroundHover, backgroundPressed, backgroundLocked, ...layout
}: FormInputProps): JSX.Element => {
  const box = resolveStateBackgrounds({ background: layout.background, backgroundHover, backgroundPressed, backgroundLocked });
  // Field-text font pair — decoded by the RP display/placeholder labels (label_base).
  const fieldFont = labelFontFields({ font, scale });

  return {
    type: MODAL_INPUT_SLOT_TYPE,
    props: {
      // Control block first so the state textures land at BUTTON-IDENTICAL byte
      // offsets ([1024-1272] right after the reserved block). The writer calls
      // `form.textField()` directly from `nativeArgs` (no `build` closure).
      ...withControl({ ...layout, background: box.background }),
      backgroundHover: box.backgroundHover, // [1024-1106] like Button
      backgroundPressed: box.backgroundPressed, // [1107-1189] focused/pressed box
      backgroundLocked: box.backgroundLocked, // [1190-1272]
      fontType: fieldFont.fontType, // [1273-1355] field-text font (display + placeholder)
      fontScale: fieldFont.fontScaleFactor, // [1356-1438]
    },
    // Native args ride the writer-only side channel: never serialized, so they cost no
    // payload bytes and can't shift RP-read offsets. placeholder/defaultValue stay raw —
    // they render inside the native edit box, where decode styling does not apply.
    nativeArgs: {
      name,
      placeholder: placeholder ?? '',
      defaultValue: defaultValue ?? '',
    },
  };
};

/** Serializes a `modal-input` into the native modal text field control. */
export const formInputWriter: Writer = (payload, form, ctx, _callbacks, _props, nativeArgs) => {
  if (!isModalForm(form)) {
    throw new ModalFormError('Form.Input must be rendered inside a `<Form>`.');
  }

  const name = typeof nativeArgs?.name === 'string' ? nativeArgs.name : '';
  const placeholder = typeof nativeArgs?.placeholder === 'string' ? nativeArgs.placeholder : '';
  const defaultValue = typeof nativeArgs?.defaultValue === 'string' ? nativeArgs.defaultValue : '';

  emitInput(payload, form, ctx, name, placeholder, defaultValue);
};
