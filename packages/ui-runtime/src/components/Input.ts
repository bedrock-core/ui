import { usePlayer } from '../hooks/usePlayer';
import { useState } from '../hooks/useState';
import { FunctionComponent, JSX } from '../jsx';
import { showModalForm } from '../util/showForm';
import { Button } from './Button';
import { ModalFieldProps } from './modalField';
import { Text } from './Text';

export interface InputProps extends ModalFieldProps {
  /** Controlled value. When provided, the field reflects this on every render. */
  value?: string;
  /** Initial value for the uncontrolled case. */
  defaultValue?: string;
  /** Called with the new value when the player confirms the modal. */
  onChange?: (value: string) => void;
  /** Called when the player cancels (X / Esc) the modal. */
  onCancel?: () => void;
  /** Placeholder shown on the face when empty, and inside the modal text field. */
  placeholder?: string;
}

/**
 * A text input rendered as a `Button` that *looks like* a field. Pressing it
 * opens a single-field `ModalFormData`; on confirm the typed value is committed
 * (internal state + `onChange`), on cancel nothing changes (`onCancel`). Either
 * way the root form re-presents with the current value.
 *
 * Supports both controlled (`value` + `onChange`) and uncontrolled
 * (`defaultValue`) usage, like the ore-styled `Toggle`.
 *
 * This is the unstyled runtime primitive (a peer of the base `Button`); supply a
 * `background` or compose a styled wrapper for a field-like appearance.
 */
export const Input: FunctionComponent<InputProps> = ({
  value,
  defaultValue,
  onChange,
  onCancel,
  label,
  placeholder,
  title,
  body,
  submitLabel,
  tooltip,
  enabled,
  ...rest
}: InputProps): JSX.Element => {
  const [internal, setInternal] = useState(defaultValue ?? '');
  const current = value ?? internal;
  const player = usePlayer();

  const face = current !== '' ? current : (placeholder ?? '');

  const handlePress = async (): Promise<void> => {
    if (enabled === false) {
      return;
    }

    const response = await showModalForm(
      player,
      (form) => {
        form.textField(label ?? '', placeholder ?? '', { defaultValue: current, tooltip });
      },
      { title: title ?? label, body, submitLabel },
    );

    if (response.canceled) {
      onCancel?.();

      return;
    }

    const next = String(response.formValues?.[0] ?? '');

    setInternal(next);
    onChange?.(next);
  };

  return Button({
    ...rest,
    enabled,
    onPress: handlePress,
    children: Text({ children: face }),
  });
};
