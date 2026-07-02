import { ControlProps, StateBackgroundProps } from './control';

/**
 * Chrome shared by the modal-backed field primitives ({@link Input},
 * {@link Dropdown}, {@link Slider}): the title, body, submit text, tooltip and
 * control label of the single-control `ModalFormData` each one opens. State
 * textures come from {@link StateBackgroundProps}, forwarded to the underlying
 * `Button` face which resolves them with the shared `state ?? base ?? unstyled` rule.
 */
export interface ModalFieldProps extends ControlProps, StateBackgroundProps {
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
