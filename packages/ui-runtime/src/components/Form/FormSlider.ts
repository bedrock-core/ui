import type { ModalFormData } from '@minecraft/server-ui';
import { isModalForm } from '../../core/guards';
import { ModalFormError, type Writer } from '../../core/types';
import { emitModalControl } from '../../core/writers';
import { FunctionComponent, JSX } from '../../jsx';
import { controlPayloadProps } from './controlPayload';
import { MODAL_SLIDER_SLOT_TYPE } from './modalControls';
import { FormControlBase } from './shared';

export interface FormSliderProps extends FormControlBase {
  /** Minimum selectable value. */
  min: number;
  /** Maximum selectable value. */
  max: number;
  /** Increment between selectable values. Defaults to `1` (native default). */
  step?: number;
  /** Initial value. Defaults to `min`. */
  defaultValue?: number;
}

/**
 * Numeric slider field → `ModalFormData.slider`. Result (`Form.onSubmit`): `number`.
 * Modal-only; render inside a `<Form>`. Accepts the same control/layout props as any
 * component; geometry is computed by the layout phase and encoded into the label
 * payload for the RP to position/style the native widget.
 */
export const FormSlider: FunctionComponent<FormSliderProps> = ({
  name, label, tooltip, min, max, step, defaultValue, font, scale, ...layout
}: FormSliderProps): JSX.Element => ({
  type: MODAL_SLIDER_SLOT_TYPE,
  props: {
    ...controlPayloadProps(layout, label ?? '', { font, scale }),
    name,
    build: (form: ModalFormData, payload: string): void => {
      form.slider(payload, min, max, { defaultValue: defaultValue ?? min, valueStep: step, tooltip });
    },
  },
});

/** Serializes a `modal-slider` into the native modal slider control. */
export const formSliderWriter: Writer = (payload, form, ctx, callbacks, props) => {
  if (!isModalForm(form)) {
    throw new ModalFormError('Form.Slider must be rendered inside a `<Form>`.');
  }

  const build = callbacks.build as ((f: ModalFormData, p: string) => void) | undefined;
  const name = typeof props?.name === 'string' ? props.name : '';

  if (!build) {
    return;
  }

  emitModalControl(form, ctx, name, payload, build);
};
