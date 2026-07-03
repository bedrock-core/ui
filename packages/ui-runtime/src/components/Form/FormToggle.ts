import { isModalForm } from '../../core/guards';
import { ModalFormError, type Writer } from '../../core/types';
import { emitToggle } from '../../core/writers';
import { FunctionComponent, JSX } from '../../jsx';
import { resolveStateBackgrounds, withControl, type StateBackgroundProps } from '../control';
import { MODAL_TOGGLE_SLOT_TYPE } from './modalControls';
import { FormControlBase } from './shared';

export interface FormToggleProps extends FormControlBase, StateBackgroundProps {
  /** Initial on/off state. Defaults to `false`. */
  defaultValue?: boolean;
  // The StateBackgroundProps surfaces style the UNCHECKED (off) side; the checked
  // side has its own set below. `backgroundPressed` is carried for the shared
  // button-identical field block but the toggle RP has no pressed state to show it.
  /** Checked (on) base texture. Defaults to the resolved unchecked base. */
  checkedBackground?: string;
  /** Checked hover texture. Defaults to the resolved checked base. */
  checkedHover?: string;
  /** Checked locked texture. Defaults to the resolved checked base. */
  checkedLocked?: string;
}

/**
 * Boolean toggle field → `ModalFormData.toggle`. Result (`Form.onSubmit`): `boolean`.
 * Modal-only; render inside a `<Form>`. Accepts the same control/layout props as any
 * component; geometry is computed by the layout phase and encoded into the label
 * payload for the RP to position/style the native widget.
 */
export const FormToggle: FunctionComponent<FormToggleProps> = ({
  name, defaultValue,
  backgroundHover, backgroundPressed, backgroundLocked,
  checkedBackground, checkedHover, checkedLocked, ...layout
}: FormToggleProps): JSX.Element => {
  // Unchecked side mirrors Button; checked side follows the same rule against its
  // own base (single `background` styles both sides when nothing else is given).
  const unchecked = resolveStateBackgrounds({ background: layout.background, backgroundHover, backgroundPressed, backgroundLocked });
  const checkedBase = checkedBackground ?? unchecked.background;

  return {
    type: MODAL_TOGGLE_SLOT_TYPE,
    props: {
      // Control block first so the state textures land at BUTTON-IDENTICAL byte
      // offsets ([1024-1272] right after the reserved block), toggle-specific
      // fields after. The native-arg props (`name`, `defaultValue`) are appended
      // LAST so they survive to the writer without disturbing the RP-read offsets —
      // the RP decode only reads up to the styling block above. The writer calls
      // `form.toggle()` directly from these plain props (no `build` closure).
      ...withControl({ ...layout, background: unchecked.background }),
      backgroundHover: unchecked.backgroundHover, // [1024-1106] like Button
      backgroundPressed: unchecked.backgroundPressed, // [1107-1189] reserved (no pressed state)
      backgroundLocked: unchecked.backgroundLocked, // [1190-1272]
      checkedBackground: checkedBase, // [1273-1355] toggle-specific
      checkedHover: checkedHover ?? checkedBase, // [1356-1438]
      checkedLocked: checkedLocked ?? checkedBase, // [1439-1521]
      // Native args (past the RP-read region): read by the writer, not decoded RP-side.
      name,
      defaultValue: defaultValue ?? false,
    },
  };
};

/** Serializes a `modal-toggle` into the native modal toggle control. */
export const formToggleWriter: Writer = (payload, form, ctx, _callbacks, props) => {
  if (!isModalForm(form)) {
    throw new ModalFormError('Form.Toggle must be rendered inside a `<Form>`.');
  }

  const name = typeof props?.name === 'string' ? props.name : '';
  const defaultValue = props?.defaultValue === true;

  emitToggle(payload, form, ctx, name, defaultValue);
};
