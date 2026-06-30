import type { ModalFormData } from '@minecraft/server-ui';
import { isModalForm } from '../../core/guards';
import { ModalFormError, type Writer } from '../../core/types';
import { emitModalControl } from '../../core/writers';
import { FunctionComponent, JSX } from '../../jsx';
import { controlPayloadProps } from './controlPayload';
import { MODAL_TOGGLE_SLOT_TYPE } from './modalControls';
import { FormControlBase } from './shared';

export interface FormToggleProps extends FormControlBase {
  /** Initial on/off state. Defaults to `false`. */
  defaultValue?: boolean;
}

/**
 * Boolean toggle field → `ModalFormData.toggle`. Result (`Form.onSubmit`): `boolean`.
 * Modal-only; render inside a `<Form>`. Accepts the same control/layout props as any
 * component; geometry is computed by the layout phase and encoded into the label
 * payload for the RP to position/style the native widget.
 */
export const FormToggle: FunctionComponent<FormToggleProps> = ({
  name, label, tooltip, defaultValue, font, scale, ...layout
}: FormToggleProps): JSX.Element => ({
  type: MODAL_TOGGLE_SLOT_TYPE,
  props: {
    // Serializable control-block + styling fields (geometry filled by the layout pass);
    // `name` is appended LAST so it survives to the writer without disturbing the
    // RP-read field offsets (the decoder stops at the styling tail). `build` is a
    // function → routed to callbacks, not encoded.
    ...controlPayloadProps(layout, label ?? '', { font, scale }),
    name,
    build: (form: ModalFormData, payload: string): void => {
      form.toggle(payload, { defaultValue: defaultValue ?? false, tooltip });
    },
  },
});

/** Serializes a `modal-toggle` into the native modal toggle control. */
export const formToggleWriter: Writer = (payload, form, ctx, callbacks, props) => {
  if (!isModalForm(form)) {
    throw new ModalFormError('Form.Toggle must be rendered inside a `<Form>`.');
  }

  const build = callbacks.build as ((f: ModalFormData, p: string) => void) | undefined;
  const name = typeof props?.name === 'string' ? props.name : '';

  if (!build) {
    return;
  }

  emitModalControl(form, ctx, name, payload, build);
};
