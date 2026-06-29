import type { ModalFormData } from '@minecraft/server-ui';
import { isModalForm } from '../../core/guards';
import { ModalFormError, type Writer } from '../../core/types';
import { emitModalControl } from '../../core/writers';
import { FunctionComponent, JSX } from '../../jsx';
import { MODAL_TOGGLE_SLOT_TYPE } from './modalControls';
import { FormControlBase } from './shared';

export interface FormToggleProps extends FormControlBase {
  /** Initial on/off state. Defaults to `false`. */
  defaultValue?: boolean;
}

/**
 * Boolean toggle field → `ModalFormData.toggle`. Result (`Form.onSubmit`): `boolean`.
 * Modal-only; render inside a `<Form>`.
 */
export const FormToggle: FunctionComponent<FormToggleProps> = ({
  name, label, tooltip, defaultValue,
}: FormToggleProps): JSX.Element => ({
  type: MODAL_TOGGLE_SLOT_TYPE,
  props: {
    name,
    build: (form: ModalFormData): void => {
      form.toggle(label ?? '', { defaultValue: defaultValue ?? false, tooltip });
    },
  },
});

/** Serializes a `modal-toggle` into the native modal toggle control. */
export const formToggleWriter: Writer = (_payload, form, ctx, callbacks, props) => {
  if (!isModalForm(form)) {
    throw new ModalFormError('Form.Toggle must be rendered inside a `<Form>`.');
  }

  const build = callbacks.build as ((f: ModalFormData) => void) | undefined;
  const name = typeof props?.name === 'string' ? props.name : '';

  if (!build) {
    return;
  }

  emitModalControl(form, ctx, name, build);
};
