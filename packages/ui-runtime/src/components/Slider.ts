import { usePlayer } from '../hooks/usePlayer';
import { useState } from '../hooks/useState';
import { FunctionComponent, JSX } from '../jsx';
import { showModalForm } from '../util/showForm';
import { Button } from './Button';
import { ModalFieldProps } from './modalField';
import { Text } from './Text';

export interface SliderProps extends ModalFieldProps {
  /** Minimum selectable value. */
  min: number;
  /** Maximum selectable value. */
  max: number;
  /** Increment between selectable values. Defaults to `1` (native default). */
  step?: number;
  /** Controlled value. When provided, the field reflects this on every render. */
  value?: number;
  /** Initial value for the uncontrolled case. Defaults to `min`. */
  defaultValue?: number;
  /** Called with the new value when the player confirms the modal. */
  onChange?: (value: number) => void;
  /** Called when the player cancels (X / Esc) the modal. */
  onCancel?: () => void;
  /**
   * Overrides the default text face. When provided, this node is rendered inside
   * the button instead of the value `Text`, letting styled wrappers draw a custom
   * face (e.g. a track and thumb) while reusing the modal/state logic.
   */
  face?: JSX.Node;
}

/**
 * A numeric slider rendered as a `Button` that *looks like* a field. Pressing it
 * opens a single-slider `ModalFormData`; on confirm the chosen value is committed
 * (internal state + `onChange`), on cancel nothing changes (`onCancel`). Either
 * way the root form re-presents with the current value.
 *
 * Supports both controlled (`value` + `onChange`) and uncontrolled
 * (`defaultValue`) usage, like {@link Input}.
 *
 * This is the unstyled runtime primitive (a peer of the base `Button`); supply a
 * `background` or compose a styled wrapper for a field-like appearance.
 */
export const Slider: FunctionComponent<SliderProps> = ({
  min,
  max,
  step,
  value,
  defaultValue,
  onChange,
  onCancel,
  label,
  title,
  body,
  submitLabel,
  tooltip,
  enabled,
  face,
  ...rest
}: SliderProps): JSX.Element => {
  const [internal, setInternal] = useState(defaultValue ?? min);
  const current = value ?? internal;
  const player = usePlayer();

  const faceText = `${current}`;

  const handlePress = async (): Promise<void> => {
    if (enabled === false) {
      return;
    }

    const response = await showModalForm(
      player,
      (form) => {
        form.slider(label ?? '', min, max, { defaultValue: current, valueStep: step, tooltip });
      },
      { title: title ?? label, body, submitLabel },
    );

    if (response.canceled) {
      onCancel?.();

      return;
    }

    const next = Number(response.formValues?.[0] ?? current);

    setInternal(next);
    onChange?.(next);
  };

  return Button({
    ...rest,
    enabled,
    onPress: handlePress,
    children: face ?? Text({ children: faceText }),
  });
};
