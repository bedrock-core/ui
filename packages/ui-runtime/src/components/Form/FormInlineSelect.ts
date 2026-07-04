import { isModalForm } from '../../core/guards';
import { ModalFormError, type Writer } from '../../core/types';
import { emitDropdown } from '../../core/writers';
import { FunctionComponent, JSX } from '../../jsx';
import { UNSTYLED_TEXTURE, withControl } from '../control';
import { labelFontFields, type LabelFont } from './controlPayload';
import { MODAL_INLINE_SELECT_SLOT_TYPE } from './modalControls';
import { isOptionStyle, isStringArray, serializeSelectOption, type OptionStyle } from './optionPayload';
import { FormControlBase } from './shared';

/**
 * Fixed option row height (px) fallback — the RP inline rows render every row at the height
 * decoded from each option's blob; this is the default when `optionHeight` is unset. Also drives
 * the computed inline list height so the cell reserves the exact flow space the RP draws.
 */
const OPTION_ROW_HEIGHT = 17;
/**
 * Vertical-stack chrome (px): the option group's own "+4px" padding from
 * `vanilla_option_radio_dropdown_group` — must match the RP group block in dropdown.json.
 */
const STACK_CHROME = 4;

/** Orientation of the inline option list: a vertical radio stack, or a horizontal segment strip. */
export type InlineSelectOrientation = 'vertical' | 'horizontal';

export interface FormInlineSelectProps extends FormControlBase {
  /** Selectable options. */
  options: string[];
  /**
   * Initial selection as an option VALUE (mapped to its index). Defaults to the first
   * option. `Form.onSubmit` reports the selected option's INDEX (native behavior).
   */
  defaultValue?: string;
  /**
   * List layout: `'vertical'` stacks the options as a radio group (default); `'horizontal'`
   * lays them side by side as a segment strip. Drives both the RP flow and the computed height.
   */
  orientation?: InlineSelectOrientation;
  /** Per-option row background texture (idle). Defaults to the unstyled placeholder. */
  optionBackground?: string;
  /** Per-option row hover-state texture. Defaults to the resolved option background. */
  optionHover?: string;
  /** Per-option row selected-state texture. Defaults to the resolved option background. */
  optionSelected?: string;
  /**
   * Unselected radio bullet glyph texture (drawn left of the label). Empty (default) draws no
   * bullet — used by the segmented skin, where the row background carries the whole visual.
   */
  bullet?: string;
  /** Selected radio bullet glyph texture. Empty (default) draws no bullet. */
  bulletSelected?: string;
  /** Option label font family. Defaults to `'mojangles'`. */
  optionFont?: LabelFont;
  /** Option label scale multiplier relative to the standard glyph size. Default `1.0`. */
  optionScale?: number;
  /** Option label horizontal alignment inside its row. Default `'left'`. */
  optionAlign?: 'left' | 'center' | 'right';
  /** Option row height (px). Default `17`. Applies to every option row. */
  optionHeight?: number;
}

/**
 * Inline single-select field (radio group / toggle-button group) → `ModalFormData.dropdown`.
 * Result (`Form.onSubmit`): the selected option's `index` (number, native behavior). Modal-only;
 * render inside a `<Form>`.
 *
 * Unlike `Form.Dropdown`, the RP renders the option collection INLINE in the form flow — all
 * options are always visible (no closed box, no popup). It reuses the native `dropdown()` value
 * channel and the same per-option `options[]` blob encoding; the ONLY cell-level styling field is
 * `orientation` (the RP gates a vertical radio stack vs. a horizontal segment strip on it). Every
 * per-option visual (row faces, bullet glyph, label) rides that option's own blob.
 *
 * The cell height is the FULL inline list height (rows × row height + chrome), set as the
 * control's explicit `height` so the list reserves real flow space and later controls flow below
 * it — the key difference from the dropdown, whose popup floats outside the flow.
 */
export const FormInlineSelect: FunctionComponent<FormInlineSelectProps> = ({
  name, options, defaultValue,
  orientation = 'vertical',
  optionBackground, optionHover, optionSelected,
  bullet, bulletSelected,
  optionFont, optionScale, optionAlign, optionHeight, ...layout
}: FormInlineSelectProps): JSX.Element => {
  const defaultIndex = defaultValue !== undefined ? Math.max(0, options.indexOf(defaultValue)) : 0;
  const optionLabelFont = labelFontFields({ font: optionFont, scale: optionScale });
  const optionBase = optionBackground ?? UNSTYLED_TEXTURE;
  const rowHeight = optionHeight ?? OPTION_ROW_HEIGHT;

  // Per-option style (currently uniform) — carried by the writer into each option's blob.
  const optionStyle: OptionStyle = {
    height: rowHeight,
    background: optionBase,
    backgroundHover: optionHover ?? optionBase,
    backgroundSelected: optionSelected ?? optionBase,
    fontType: optionLabelFont.fontType,
    fontScaleFactor: optionLabelFont.fontScaleFactor,
    align: optionAlign ?? 'left',
    bulletTexture: bullet ?? '',
    bulletSelectedTexture: bulletSelected ?? '',
  };

  // Inline list height reserved in the flow. Vertical: one row per option + the group's chrome.
  // Horizontal: a single strip one row tall (N segments side by side). An explicit caller
  // `height` still wins (withControl reads layout.height).
  const inlineHeight = layout.height ?? (orientation === 'vertical'
    ? options.length * rowHeight + STACK_CHROME
    : rowHeight);

  return {
    type: MODAL_INLINE_SELECT_SLOT_TYPE,
    props: {
      // Control block first (header/type/width/height/x/y/visible/enabled/background/region/
      // reserved). height is the real inline list height so the list occupies flow space.
      ...withControl({ ...layout, height: inlineHeight }),
      // [1024] the ONLY component-specific cell field: the RP gates the vertical stack vs. the
      // horizontal segment strip on it. Everything else visual is per-option (the blob).
      orientation,
    },
    // Native args ride the writer-only side channel: never serialized. The writer encodes one
    // blob per option from `options` + `optionStyle`, then hands the blobs to `dropdown()`.
    nativeArgs: {
      name,
      defaultValueIndex: defaultIndex,
      options,
      optionStyle,
    },
  };
};

/** Serializes a `modal-inline-select` into the native modal dropdown control (rendered inline). */
export const formInlineSelectWriter: Writer = (payload, form, ctx, _callbacks, _props, nativeArgs) => {
  if (!isModalForm(form)) {
    throw new ModalFormError('Form.Radio / Form.ToggleButton must be rendered inside a `<Form>`.');
  }

  const name = typeof nativeArgs?.name === 'string' ? nativeArgs.name : '';
  const defaultValueIndex = typeof nativeArgs?.defaultValueIndex === 'number' ? nativeArgs.defaultValueIndex : 0;
  const options = isStringArray(nativeArgs?.options) ? nativeArgs.options : [];

  const resolvedStyle: OptionStyle = isOptionStyle(nativeArgs?.optionStyle)
    ? nativeArgs.optionStyle
    : {
        height: OPTION_ROW_HEIGHT,
        background: UNSTYLED_TEXTURE,
        backgroundHover: UNSTYLED_TEXTURE,
        backgroundSelected: UNSTYLED_TEXTURE,
        fontType: 'default',
        fontScaleFactor: 2,
        align: 'left',
        bulletTexture: '',
        bulletSelectedTexture: '',
      };

  // Same native call + per-option blob encoding as the dropdown — only the RP decode differs.
  const encodedOptions = options.map(option => serializeSelectOption(option, resolvedStyle));

  emitDropdown(payload, form, ctx, name, encodedOptions, defaultValueIndex);
};
