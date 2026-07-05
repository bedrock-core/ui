import { FunctionComponent, JSX } from '../../jsx';
import { withControl, type ControlProps } from '../control';
import { labelFontFields, type LabelFont } from './controlPayload';

/**
 * Host type for `Form.Option` — LAYOUT-ONLY: the flex engine lays it out (so it gets
 * computed x/y/w/h like any element), but the serializer does NOT emit it as a native
 * control — its data + geometry are read by the parent select's writer and packed into
 * the native option blob. Skipped by the serialize walk (see serializer.ts).
 */
export const MODAL_OPTION_SLOT_TYPE = 'modal-option';

export interface FormOptionProps extends ControlProps {
  /**
   * The option's value. `Form.Dropdown` / `Form.Radio` / `Form.ToggleButton` report the
   * SELECTED option's INDEX on submit (native dropdown behavior); `value` is what a
   * `defaultValue` match tests against and is the caller's stable identifier.
   */
  value: string;
  // --- label props, in the serialized label-group order (text, font, scale, position) ---
  /** Option label text. Rendered by the RP option row (decoded from the option blob). */
  label: string;
  /** Label font family. Falls back to the group's `optionFont`. */
  font?: LabelFont;
  /** Label scale. Falls back to the group's `optionScale`. */
  scale?: number;
  /** Label alignment — TS-computed into the label-group x/y. Falls back to the group's `optionAlign`. */
  align?: 'left' | 'center' | 'right';
  // --- row faces ---
  /** Per-option idle row/segment background texture. Falls back to the group's `optionBackground`. */
  background?: string;
  /** Per-option hover background. Falls back to the group's `optionHover`. */
  backgroundHover?: string;
  /** Per-option selected background. Falls back to the group's `optionSelected`. */
  backgroundSelected?: string;
  // --- radio bullet ---
  /** Unselected bullet glyph texture (radio). Falls back to the group's `bullet`. */
  bullet?: string;
  /** Selected bullet glyph texture (radio). Falls back to the group's `bulletSelected`. */
  bulletSelected?: string;
  /** Unselected bullet glyph on hover. Falls back to the group's `bulletHover`. */
  bulletHover?: string;
  /** Selected bullet glyph on hover. Falls back to the group's `bulletSelectedHover`. */
  bulletSelectedHover?: string;
  /** Bullet glyph width (px). Falls back to the group's `bulletWidth`. */
  bulletWidth?: number;
  /** Bullet glyph height (px). Falls back to the group's `bulletHeight`. */
  bulletHeight?: number;
}

/**
 * One option of a `Form.Radio` / `Form.ToggleButton`. LAYOUT-ONLY: the flex engine lays it out
 * (so it gets a computed `x/y/width/height` like any element — position it with the usual
 * `ControlProps`/`LayoutProps`: `flex`, `gap`, `width`, `paddingTop`, …), but it is NOT emitted
 * as a native control. The parent inline-select's writer reads each option element's post-layout
 * geometry + its `label`/`value`/style off `props` and packs them into that option's native blob,
 * which the RP option row decodes to SELF-POSITION via `use_anchored_offset`.
 *
 * So authoring `<Form.Radio><Form.Option value="a" label="A" /> …</Form.Radio>` gives every option
 * real, fully-customizable flex layout — the same layout system every other component uses — while
 * selection + the single submitted index still ride the one native `dropdown()` the group emits.
 */
export const FormOption: FunctionComponent<FormOptionProps> = ({
  value, label, background, backgroundHover, backgroundSelected,
  bullet, bulletSelected, bulletHover, bulletSelectedHover, bulletWidth, bulletHeight,
  font, scale, align, ...layout
}: FormOptionProps): JSX.Element => {
  // Pre-resolve the font fields here (the writer wants fontType/fontScaleFactor, not the raw
  // LabelFont), only when the caller set them — otherwise the group's resolved values are used.
  const fontFields = font !== undefined || scale !== undefined
    ? labelFontFields({ font, scale })
    : undefined;

  // A layout-only host node. `withControl(layout)` extracts the caller's layout props into
  // `__layout` (so the flex engine lays the option out) and seeds the jsonUIx/y/width/height the
  // layout phase fills. The option-DATA fields ride alongside for the writer to read post-layout;
  // the node is never serialized as a control (skipped in serialize), so nothing else is emitted.
  return {
    type: MODAL_OPTION_SLOT_TYPE,
    props: {
      ...withControl(layout),
      value,
      label,
      background,
      backgroundHover,
      backgroundSelected,
      bullet,
      bulletSelected,
      bulletHover,
      bulletSelectedHover,
      bulletWidth,
      bulletHeight,
      align,
      // Resolved font fields (or undefined → inherit the group's), so the writer needn't re-map.
      __optionFontType: fontFields?.fontType,
      __optionFontScale: fontFields?.fontScaleFactor,
    },
  };
};
