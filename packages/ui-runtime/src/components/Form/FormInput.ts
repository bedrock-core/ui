import type { ModalFormData } from '@minecraft/server-ui';
import { isModalForm } from '../../core/guards';
import { ModalFormError, type Writer } from '../../core/types';
import { emitModalControl } from '../../core/writers';
import { FunctionComponent, JSX } from '../../jsx';
import { controlPayloadProps } from './controlPayload';
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
 * Modal-only; render inside a `<Form>`. Accepts the same control/layout props as any
 * component; geometry is computed by the layout phase and encoded into the label
 * payload for the RP to position/style the native widget.
 */
export const FormInput: FunctionComponent<FormInputProps> = ({
  name, label, tooltip, placeholder, defaultValue, font, scale, ...layout
}: FormInputProps): JSX.Element => ({
  type: MODAL_INPUT_SLOT_TYPE,
  props: {
    ...controlPayloadProps(layout, label ?? '', { font, scale }),
    name,
    // The placeholder stays raw — it renders inside the native edit box, where decode
    // styling does not apply.
    build: (form: ModalFormData, payload: string): void => {
      form.textField(payload, placeholder ?? '', { defaultValue: defaultValue ?? '', tooltip });
    },
  },
});

/** Serializes a `modal-input` into the native modal text field control. */
export const formInputWriter: Writer = (payload, form, ctx, callbacks, props) => {
  if (!isModalForm(form)) {
    throw new ModalFormError('Form.Input must be rendered inside a `<Form>`.');
  }

  const build = callbacks.build as ((f: ModalFormData, p: string) => void) | undefined;
  const name = typeof props?.name === 'string' ? props.name : '';

  if (!build) {
    return;
  }

  emitModalControl(form, ctx, name, payload, build);
};
