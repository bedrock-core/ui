import { isModalForm } from '../../core/guards';
import { ModalFormError, type Writer } from '../../core/types';
import { emitInput } from '../../core/writers';
import { FunctionComponent, JSX } from '../../jsx';
import { resolveStateBackgrounds, withControl, type StateBackgroundProps } from '../control';
import { MODAL_INPUT_SLOT_TYPE } from './modalControls';
import { FormControlBase } from './shared';

export interface FormInputProps extends FormControlBase, StateBackgroundProps {
  /** Placeholder shown inside the native text field when empty. */
  placeholder?: string;
  /** Initial text. Defaults to `''`. */
  defaultValue?: string;
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
  name, placeholder, defaultValue,
  backgroundHover, backgroundPressed, backgroundLocked, ...layout
}: FormInputProps): JSX.Element => {
  const box = resolveStateBackgrounds({ background: layout.background, backgroundHover, backgroundPressed, backgroundLocked });

  return {
    type: MODAL_INPUT_SLOT_TYPE,
    props: {
      // Control block first so the state textures land at BUTTON-IDENTICAL byte
      // offsets ([1024-1272] right after the reserved block). The native-arg props
      // (`name`, `placeholder`, `defaultValue`) are appended LAST so they survive to
      // the writer without disturbing the RP-read offsets. The writer calls
      // `form.textField()` directly from these plain props (no `build` closure).
      ...withControl({ ...layout, background: box.background }),
      backgroundHover: box.backgroundHover, // [1024-1106] like Button
      backgroundPressed: box.backgroundPressed, // [1107-1189] focused/pressed box
      backgroundLocked: box.backgroundLocked, // [1190-1272]
      // Native args (past the RP-read region). The placeholder/defaultValue stay raw —
      // they render inside the native edit box, where decode styling does not apply.
      name,
      placeholder: placeholder ?? '',
      defaultValue: defaultValue ?? '',
    },
  };
};

/** Serializes a `modal-input` into the native modal text field control. */
export const formInputWriter: Writer = (payload, form, ctx, _callbacks, props) => {
  if (!isModalForm(form)) {
    throw new ModalFormError('Form.Input must be rendered inside a `<Form>`.');
  }

  const name = typeof props?.name === 'string' ? props.name : '';
  const placeholder = typeof props?.placeholder === 'string' ? props.placeholder : '';
  const defaultValue = typeof props?.defaultValue === 'string' ? props.defaultValue : '';

  emitInput(payload, form, ctx, name, placeholder, defaultValue);
};
