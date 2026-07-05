import type { ControlProps } from '../control';

/**
 * Common props for every modal field control (`Form.Toggle` / `Slider` / `Dropdown`
 * / `Input`). Each control is a pure DECLARATION: it owns a `name` (its result key)
 * and builds the typed native call. There is no `onChange` / controlled value — the
 * native modal is atomic and returns every value at once on submit, which
 * `Form.onSubmit` receives keyed by `name`. `defaultValue` (per-control) sets the
 * build-time initial value.
 *
 * Deliberately minimal: no label/tooltip — these primitives are the bare native
 * widgets; field labels are composed at higher levels as separate components.
 *
 * Extends `ControlProps` so a modal control accepts the SAME control + layout props as
 * any other component (visible/enabled/background + width/height/flex/margin/…). The
 * layout phase computes geometry and it is encoded into the control's label payload, so
 * the RP positions/styles the native widget exactly like an ActionForm component.
 */
export interface FormControlBase extends ControlProps {
  /** Result key — the value appears at `values[name]` in `Form.onSubmit`. Required. */
  name: string;
}
