/**
 * Common props for every modal field control (`Form.Toggle` / `Slider` / `Dropdown`
 * / `Input`). Each control is a pure DECLARATION: it owns a `name` (its result key)
 * and builds the typed native call. There is no `onChange` / controlled value — the
 * native modal is atomic and returns every value at once on submit, which
 * `Form.onSubmit` receives keyed by `name`. `defaultValue` (per-control) sets the
 * build-time initial value. Modal controls take no layout props; the native modal
 * lays them out.
 */
export interface FormControlBase {
  /** Result key — the value appears at `values[name]` in `Form.onSubmit`. Required. */
  name: string;
  /** Field label shown beside the native control. */
  label?: string;
  /** Hover tooltip on the native control. */
  tooltip?: string;
}
