import { isModalForm } from '../core/guards';
import { ModalFormError, type Writer } from '../core/types';
import { emitToggle } from '../core/writers';
import type { FunctionComponent, JSX } from '../jsx';
import { resolveStateBackgrounds, withControl, type StateBackgroundProps } from './control';
import { FormControlBase } from './Form/shared';
import { MODAL_TOGGLE_SLOT_TYPE } from '../core/fields';
import { useMechanism } from '../hooks/useMechanism';
import { useState } from '../hooks/useState';
import { Button } from './Button';

interface NativeToggleProps extends FormControlBase, StateBackgroundProps {
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
 * Boolean toggle field → `ModalFormData.toggle`. Result (`onSubmit`): `boolean`.
 * Modal-only; render inside a `<Form>`. Accepts the same control/layout props as any
 * component; geometry is computed by the layout phase and encoded into the label
 * payload for the RP to position/style the native widget.
 */
const nativeToggle = ({
  name, defaultValue,
  backgroundHover, backgroundPressed, backgroundLocked,
  checkedBackground, checkedHover, checkedLocked, ...layout
}: NativeToggleProps): JSX.Element => {
  // Unchecked side mirrors Button; checked side follows the same rule against its
  // own base (single `background` styles both sides when nothing else is given).
  const unchecked = resolveStateBackgrounds({ background: layout.background, backgroundHover, backgroundPressed, backgroundLocked });
  const checkedBase = checkedBackground ?? unchecked.background;

  return {
    type: MODAL_TOGGLE_SLOT_TYPE,
    props: {
      // Control block first so the state textures land at BUTTON-IDENTICAL byte
      // offsets ([1024-1272] right after the reserved block), toggle-specific
      // fields after. The writer calls `form.toggle()` directly from `nativeArgs`
      // (no `build` closure).
      ...withControl({ ...layout, background: unchecked.background }),
      backgroundHover: unchecked.backgroundHover, // [1024-1106] like Button
      backgroundPressed: unchecked.backgroundPressed, // [1107-1189] reserved (no pressed state)
      backgroundLocked: unchecked.backgroundLocked, // [1190-1272]
      checkedBackground: checkedBase, // [1273-1355] toggle-specific
      checkedHover: checkedHover ?? checkedBase, // [1356-1438]
      checkedLocked: checkedLocked ?? checkedBase, // [1439-1521]
    },
    // Native args ride the writer-only side channel: never serialized, so they cost no
    // payload bytes and can't shift RP-read offsets.
    nativeArgs: {
      name,
      defaultValue: defaultValue ?? false,
    },
  };
};

export interface ToggleProps extends Omit<NativeToggleProps, 'name'> {
  /** Result key inside a `<Form>`, where it is required; unused where a press is the answer. */
  name?: string;
  /** The state, held by the caller instead of the control. Only where a press reaches script. */
  on?: boolean;
  /** Called with the new state, where a press reaches script. */
  onChange?: (on: boolean) => void;
}

/**
 * A boolean. Inside a `<Form>` it is the engine's own toggle, answered on submit under `name`;
 * where a press reaches script (`<Screen>`, `<Container>`) it is a button that flips its state and
 * calls `onChange`.
 */
export const Toggle: FunctionComponent<ToggleProps> = ({ on, onChange, ...props }: ToggleProps): JSX.Element => {
  const mechanism = useMechanism('Toggle');
  const [internal, setInternal] = useState(props.defaultValue ?? false);

  if (mechanism === 'field') {
    return nativeToggle({ ...props, name: props.name ?? '' });
  }

  const current = on ?? internal;
  const { name: _name, defaultValue: _default, checkedBackground, checkedHover, checkedLocked, ...rest } = props;
  const checkedBase = checkedBackground ?? rest.background;

  return Button({
    ...rest,
    background: current ? checkedBase : rest.background,
    backgroundHover: current ? checkedHover ?? checkedBase : rest.backgroundHover,
    backgroundLocked: current ? checkedLocked ?? checkedBase : rest.backgroundLocked,
    onPress: () => {
      setInternal(!current);
      onChange?.(!current);
    },
  });
};

/** Serializes a `modal-toggle` into the native modal toggle control. */
export const toggleWriter: Writer = (payload, form, ctx, _callbacks, _props, nativeArgs) => {
  if (!isModalForm(form)) {
    throw new ModalFormError('`Toggle` must be rendered inside a `<Form>`.');
  }

  const name = typeof nativeArgs?.name === 'string' ? nativeArgs.name : '';
  const defaultValue = nativeArgs?.defaultValue === true;

  emitToggle(payload, form, ctx, name, defaultValue);
};
