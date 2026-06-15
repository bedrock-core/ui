import { ControlProps } from './control';

/**
 * Chrome shared by the modal-backed field primitives ({@link Input},
 * {@link Dropdown}, {@link Slider}): the title, body, submit text, tooltip and
 * control label of the single-control `ModalFormData` each one opens.
 */
export interface ModalFieldProps extends ControlProps {
  /** Hover-state background texture, forwarded to the underlying `Button` face. */
  backgroundHover?: string;
  /** Pressed-state background texture, forwarded to the underlying `Button` face. */
  backgroundPressed?: string;
  /** Locked/disabled-state background texture, forwarded to the underlying `Button` face. */
  backgroundLocked?: string;
  /** Label for the control inside the modal. */
  label?: string;
  /** Modal title. Defaults to `label`. */
  title?: string;
  /** Descriptive text shown above the control in the modal. */
  body?: string;
  /** Confirm-button text in the modal. */
  submitLabel?: string;
  /** Hover tooltip on the modal control. */
  tooltip?: string;
}
