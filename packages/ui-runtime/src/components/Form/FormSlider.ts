import type { ModalFormData } from '@minecraft/server-ui';
import { isModalForm } from '../../core/guards';
import { ModalFormError, type Writer } from '../../core/types';
import { emitModalControl } from '../../core/writers';
import { FunctionComponent, JSX } from '../../jsx';
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
 * Modal-only; render inside a `<Form>`.
 */
export const FormSlider: FunctionComponent<FormSliderProps> = ({
  name, label, tooltip, min, max, step, defaultValue,
}: FormSliderProps): JSX.Element => ({
  type: MODAL_SLIDER_SLOT_TYPE,
  props: {
    name,
    build: (form: ModalFormData): void => {
      form.slider(label ?? '', min, max, { defaultValue: defaultValue ?? min, valueStep: step, tooltip });
    },
  },
});

/** Serializes a `modal-slider` into the native modal slider control. */
export const formSliderWriter: Writer = (_payload, form, ctx, callbacks, props) => {
  if (!isModalForm(form)) {
    throw new ModalFormError('Form.Slider must be rendered inside a `<Form>`.');
  }

  const build = callbacks.build as ((f: ModalFormData) => void) | undefined;
  const name = typeof props?.name === 'string' ? props.name : '';

  if (!build) {
    return;
  }

  emitModalControl(form, ctx, name, build);
};
