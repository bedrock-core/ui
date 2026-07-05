import { CANONICAL_SCREEN } from '@bedrock-core/flexbox';
import { isModalForm } from '../../core/guards';
import { ModalFormError, type Writer } from '../../core/types';
import { emitDropdown } from '../../core/writers';
import { FunctionComponent, JSX } from '../../jsx';
import { measureText } from '../../util/textMetrics';
import { resolveStateBackgrounds, UNSTYLED_TEXTURE, withControl, type StateBackgroundProps } from '../control';
import { labelFontFields, type LabelFont } from './controlPayload';
import { MODAL_DROPDOWN_SLOT_TYPE } from './modalControls';
import { isOptionStyle, isStringArray, optionLabelPosition, serializeSelectOption, type OptionStyle } from './optionPayload';
import { FormControlBase } from './shared';

/**
 * Fixed option row height (px) — the RP `dropdown_option_radio` renders every row at this
 * height. The per-option `height` field is still encoded into each blob (offset [175]) for a
 * future per-option-height re-add, but the RP currently ignores it and stacks fixed rows, so
 * `popupHeight` is computed from THIS constant to stay in sync with what the RP draws.
 */
const OPTION_ROW_HEIGHT = 17;
/**
 * Popup chrome (px): the option group's own "+4px" padding + the scroll viewport's
 * insets (2px top + 2px bottom) + 1px rounding slack — must match the RP scroll
 * block in modal_dropdown.json.
 */
const POPUP_CHROME = 9;
/** Popup height cap: half the canonical screen — longer lists get the scrollbar. */
const POPUP_MAX_HEIGHT = CANONICAL_SCREEN.height / 2;

export interface FormDropdownProps extends FormControlBase, StateBackgroundProps {
  /** Selectable options. */
  options: string[];
  /**
   * Initial selection as an option VALUE (mapped to its index). Defaults to the first
   * option. `Form.onSubmit` reports the selected option's INDEX (native behavior).
   */
  defaultValue?: string;
  // Closed-box textures come from StateBackgroundProps (same shape as `Button`):
  // background/backgroundHover/backgroundPressed/backgroundLocked, resolved by the
  // shared `state ?? base ?? unstyled` rule.
  /**
   * Popup container background texture — the surface behind the option list when the
   * dropdown is open. Defaults to the unstyled placeholder texture.
   */
  popupBackground?: string;
  /** Per-option row background texture (idle). Defaults to the unstyled placeholder. */
  optionBackground?: string;
  /** Per-option row hover-state texture. Defaults to the resolved option background. */
  optionHover?: string;
  /** Per-option row selected-state texture. Defaults to the resolved option background. */
  optionSelected?: string;
  /** Option label font family (popup rows). Defaults to `'mojangles'`. */
  optionFont?: LabelFont;
  /** Option label scale multiplier relative to the standard glyph size. Default `1.0`. */
  optionScale?: number;
  /**
   * Option label horizontal alignment inside its row (the label box is inset 4px on
   * each side). Default `'left'`. (Free-form label offsets are NOT supported: anchored
   * offsets are engine-dead inside the dropdown popup chunk, in-game verified.)
   */
  optionAlign?: 'left' | 'center' | 'right';
  /** Option row height (px). Default `17`. Applies to every option row. */
  optionHeight?: number;
  // --- Closed-box current-value label (live-updates via native #dropdown_option_text) ---
  /**
   * Color code prefix for the closed-box current-value text (e.g. `'§0'`). Prepended to
   * the decoded option text RP-side, so styling matches the rest of the system's `§`-code
   * convention. Default `''` (renders the label's own white).
   */
  currentColor?: string;
  /** Current-value label font family. Defaults to `'mojangles'`. */
  currentFont?: LabelFont;
  /** Current-value label scale multiplier relative to the standard glyph size. Default `1.0`. */
  currentScale?: number;
  /** Current-value X offset (px) from the closed box's left-middle frame. Default `8`. */
  currentInsetX?: number;
  /** Current-value Y offset (px). Default: vertically centered (−lineHeight/2). */
  currentInsetY?: number;
}

/**
 * Option dropdown field → `ModalFormData.dropdown`. Result (`Form.onSubmit`): the
 * selected option's `index` (number, native behavior). Modal-only; render inside a
 * `<Form>`. Accepts the same control/layout props as any component; geometry is
 * computed by the layout phase and encoded into the label payload for the RP to
 * position/style the native widget.
 *
 * Each option carries its OWN encoded payload (text + row height + background states +
 * font/scale/align) as the native option string — the RP option rows self-decode it per row,
 * so option styling is genuinely per-option (not read uniformly from the dropdown cell).
 */
export const FormDropdown: FunctionComponent<FormDropdownProps> = ({
  name, options, defaultValue,
  backgroundHover, backgroundPressed, backgroundLocked, popupBackground,
  optionBackground, optionHover, optionSelected,
  optionFont, optionScale, optionAlign, optionHeight,
  currentColor, currentFont, currentScale, currentInsetX, currentInsetY, ...layout
}: FormDropdownProps): JSX.Element => {
  const defaultIndex = defaultValue !== undefined ? Math.max(0, options.indexOf(defaultValue)) : 0;
  const optionLabelFont = labelFontFields({ font: optionFont, scale: optionScale });
  // Closed-box current-value label style (rides the CELL payload, not the option blob —
  // it decorates #dropdown_option_text after the RP decodes the option text out of it).
  const currentLabelFont = labelFontFields({ font: currentFont, scale: currentScale });
  // Closed box mirrors Button: the shared `state ?? base ?? unstyled` rule.
  const closedBox = resolveStateBackgrounds({ background: layout.background, backgroundHover, backgroundPressed, backgroundLocked });
  // Option rows follow the same rule against their own base.
  const optionBase = optionBackground ?? UNSTYLED_TEXTURE;
  const rowHeight = optionHeight ?? OPTION_ROW_HEIGHT;

  // Per-option style (currently uniform) — carried by the writer into each option's blob.
  // Serialized as single dropdown-cell fields; the writer reads them + the raw option text to
  // build one blob per option. The RP no longer reads any option styling from the cell.
  const optionStyle: OptionStyle = {
    height: rowHeight,
    background: optionBase,
    backgroundHover: optionHover ?? optionBase,
    backgroundSelected: optionSelected ?? optionBase,
    fontType: optionLabelFont.fontType,
    fontScaleFactor: optionLabelFont.fontScaleFactor,
    align: optionAlign ?? 'left',
    // Dropdown popup rows draw no bullet glyph — empty textures self-hide the bullet images
    // (the size fields are then inert; encoded anyway to keep the shared blob layout).
    bulletTexture: '',
    bulletSelectedTexture: '',
    bulletWidth: 12,
    bulletHeight: 12,
  };

  return {
    type: MODAL_DROPDOWN_SLOT_TYPE,
    props: {
      // Control block first so the closed-box state textures land at the SAME byte
      // offsets as `Button`'s ([1024-1272], right after the reserved block) — the RP
      // closed-box faces are literal copies of the button's state decode blocks.
      ...withControl({ ...layout, background: closedBox.background }),
      backgroundHover: closedBox.backgroundHover, // [1024-1106] like Button
      backgroundPressed: closedBox.backgroundPressed, // [1107-1189]
      backgroundLocked: closedBox.backgroundLocked, // [1190-1272]
      popupBackground: popupBackground ?? UNSTYLED_TEXTURE, // [1273-1355] dropdown-specific
      // [1356-1438] computed popup height (px): rows × fixed row height + chrome, cap at half
      // the screen. The RP decodes it into popup_shift's #size_binding_y; the centering (half
      // above / half below the pinned middle line) is done geometrically by popup_card's
      // bottom_left→left_middle anchoring. (Option styling no longer lives in this payload — it
      // moved into each option's own blob, so the popupHeight field shifts up to [1356]. Uses
      // the FIXED row height since the RP stacks fixed-height rows.)
      popupHeight: Math.min(options.length * OPTION_ROW_HEIGHT + POPUP_CHROME, POPUP_MAX_HEIGHT),
      // Closed-box current-value label fields (RP-decoded, appended right after popupHeight so
      // they keep FIXED offsets: currentColor [1439], currentFontType [1522], currentFontScale
      // [1605], currentX [1688], currentY [1771]). The RP decodes the selected option TEXT out
      // of #dropdown_option_text, then styles it with these cell-level fields — color rides as
      // a §-code prefix (system convention), font/scale drive the label, and x/y position it
      // from the closed box's left-middle frame ([1,1] + top_left anchored offset).
      currentColor: currentColor ?? '',
      currentFontType: currentLabelFont.fontType,
      currentFontScale: currentLabelFont.fontScaleFactor,
      currentX: currentInsetX ?? 8,
      currentY: currentInsetY ?? -Math.round(measureText({ text: 'Ag', font: currentFont, fontSize: currentScale ?? 1.0 }).height / 2),
    },
    // Native args ride the writer-only side channel: never serialized, so they cost no
    // payload bytes and can't shift the RP-read offsets above. The writer encodes one blob
    // per option from the raw `options` + the resolved `optionStyle`, then hands the blob
    // array to the native `dropdown()` call. Because these bypass the serializer entirely,
    // option text is not subject to the 80-byte primitive-field cap.
    nativeArgs: {
      name,
      defaultValueIndex: defaultIndex,
      options,
      optionStyle,
    },
  };
};

/** Serializes a `modal-dropdown` into the native modal dropdown control. */
export const formDropdownWriter: Writer = (payload, form, ctx, _callbacks, props, nativeArgs) => {
  if (!isModalForm(form)) {
    throw new ModalFormError('Form.Dropdown must be rendered inside a `<Form>`.');
  }

  const name = typeof nativeArgs?.name === 'string' ? nativeArgs.name : '';
  const defaultValueIndex = typeof nativeArgs?.defaultValueIndex === 'number' ? nativeArgs.defaultValueIndex : 0;
  const options = isStringArray(nativeArgs?.options) ? nativeArgs.options : [];

  // Encode one payload blob per option from its raw text + the resolved option style; the
  // blobs become the native option strings.
  const resolvedStyle: OptionStyle = isOptionStyle(nativeArgs?.optionStyle)
    ? nativeArgs.optionStyle
    : {
        height: OPTION_ROW_HEIGHT,
        background: UNSTYLED_TEXTURE,
        backgroundHover: UNSTYLED_TEXTURE,
        backgroundSelected: UNSTYLED_TEXTURE,
        ...labelFontFields(),
        align: 'left',
        bulletTexture: '',
        bulletSelectedTexture: '',
        bulletWidth: 12,
        bulletHeight: 12,
      };

  // Label position is TS-COMPUTED (alignment left the RP): popup rows are as wide as the
  // closed box (the cell) and stack at the FIXED row height; left inset 4 matches the old
  // "100% - 8px" centered label box.
  const rowWidth = typeof props?.jsonUIWidth === 'number' ? props.jsonUIWidth : 0;
  const encodedOptions = options.map(option => serializeSelectOption(
    option,
    resolvedStyle,
    undefined,
    optionLabelPosition(option, resolvedStyle, rowWidth, OPTION_ROW_HEIGHT, 4),
  ));

  emitDropdown(payload, form, ctx, name, encodedOptions, defaultValueIndex);
};
