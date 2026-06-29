import type { ModalFormData } from '@minecraft/server-ui';
import { isModalForm } from '../../core/guards';
import { ModalFormError, type Writer } from '../../core/types';
import { emitModalControl } from '../../core/writers';
import { FunctionComponent, JSX } from '../../jsx';
import { MODAL_INPUT_SLOT_TYPE } from './modalControls';
import { FormControlBase } from './shared';

export interface FormInputProps extends FormControlBase {
  /** Placeholder shown inside the native text field when empty. */
  placeholder?: string;
  /** Initial text. Defaults to `''`. */
  defaultValue?: string;
}

/**
 * Text field → `ModalFormData.textField`. Result (`Form.onSubmit`): `string`.
 * Modal-only; render inside a `<Form>`.
 */
export const FormInput: FunctionComponent<FormInputProps> = ({
  name, label, tooltip, placeholder, defaultValue,
}: FormInputProps): JSX.Element => ({
  type: MODAL_INPUT_SLOT_TYPE,
  props: {
    name,
    build: (form: ModalFormData): void => {
      form.textField(label ?? '', placeholder ?? '', { defaultValue: defaultValue ?? '', tooltip });
    },
  },
});

/** Serializes a `modal-input` into the native modal text field control. */
export const formInputWriter: Writer = (_payload, form, ctx, callbacks, props) => {
  if (!isModalForm(form)) {
    throw new ModalFormError('Form.Input must be rendered inside a `<Form>`.');
  }

  const build = callbacks.build as ((f: ModalFormData) => void) | undefined;
  const name = typeof props?.name === 'string' ? props.name : '';

  if (!build) {
    return;
  }

  emitModalControl(form, ctx, name, build);
};
