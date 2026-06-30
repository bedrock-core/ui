import type { ModalFormData } from '@minecraft/server-ui';
import { isModalForm } from '../../core/guards';
import { ModalFormError, type Writer } from '../../core/types';
import { emitModalControl } from '../../core/writers';
import { FunctionComponent, JSX } from '../../jsx';
import { controlPayloadProps } from './controlPayload';
import { MODAL_DROPDOWN_SLOT_TYPE } from './modalControls';
import { FormControlBase } from './shared';

export interface FormDropdownProps extends FormControlBase {
  /** Selectable options. */
  options: string[];
  /**
   * Initial selection as an option VALUE (mapped to its index). Defaults to the first
   * option. `Form.onSubmit` reports the selected option's INDEX (native behavior).
   */
  defaultValue?: string;
}

/**
 * Option dropdown field → `ModalFormData.dropdown`. Result (`Form.onSubmit`): the
 * selected option's `index` (number, native behavior). Modal-only; render inside a
 * `<Form>`. Accepts the same control/layout props as any component; geometry is
 * computed by the layout phase and encoded into the label payload for the RP to
 * position/style the native widget.
 */
export const FormDropdown: FunctionComponent<FormDropdownProps> = ({
  name, label, tooltip, options, defaultValue, font, scale, ...layout
}: FormDropdownProps): JSX.Element => {
  const defaultIndex = defaultValue !== undefined ? Math.max(0, options.indexOf(defaultValue)) : 0;

  return {
    type: MODAL_DROPDOWN_SLOT_TYPE,
    props: {
      ...controlPayloadProps(layout, label ?? '', { font, scale }),
      name,
      // Option text stays raw for now — per-option decode is a follow-up once the
      // label path is proven in-game.
      build: (form: ModalFormData, payload: string): void => {
        form.dropdown(payload, options, { defaultValueIndex: defaultIndex, tooltip });
      },
    },
  };
};

/** Serializes a `modal-dropdown` into the native modal dropdown control. */
export const formDropdownWriter: Writer = (payload, form, ctx, callbacks, props) => {
  if (!isModalForm(form)) {
    throw new ModalFormError('Form.Dropdown must be rendered inside a `<Form>`.');
  }

  const build = callbacks.build as ((f: ModalFormData, p: string) => void) | undefined;
  const name = typeof props?.name === 'string' ? props.name : '';

  if (!build) {
    return;
  }

  emitModalControl(form, ctx, name, payload, build);
};
