import type { ControlProps } from '../control';
import type { LabelFont } from './controlPayload';

/**
 * Common props for every modal field control (`Form.Toggle` / `Slider` / `Dropdown`
 * / `Input`). Each control is a pure DECLARATION: it owns a `name` (its result key)
 * and builds the typed native call. There is no `onChange` / controlled value — the
 * native modal is atomic and returns every value at once on submit, which
 * `Form.onSubmit` receives keyed by `name`. `defaultValue` (per-control) sets the
 * build-time initial value.
 *
 * Extends `ControlProps` so a modal control accepts the SAME control + layout props as
 * any other component (visible/enabled/background + width/height/flex/margin/…). The
 * layout phase computes geometry and it is encoded into the control's label payload, so
 * the RP positions/styles the native widget exactly like an ActionForm component.
 */
export interface FormControlBase extends ControlProps {
  /** Result key — the value appears at `values[name]` in `Form.onSubmit`. Required. */
  name: string;
  /** Field label shown beside the native control. */
  label?: string;
  /** Hover tooltip on the native control. */
  tooltip?: string;
  /** Label font family. Defaults to `'mojangles'`. */
  font?: LabelFont;
  /** Label scale multiplier relative to the standard glyph size. Defaults to `1.0`. */
  scale?: number;
}
