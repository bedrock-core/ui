import { CANONICAL_SCREEN } from '@bedrock-core/flexbox';
import { isModalForm } from '../../core/guards';
import { serializeProps } from '../../core/serializer';
import { ModalFormError, type Writer } from '../../core/types';
import { emitDropdown } from '../../core/writers';
import { FunctionComponent, JSX } from '../../jsx';
import { resolveStateBackgrounds, UNSTYLED_TEXTURE, withControl, type StateBackgroundProps } from '../control';
import { labelFontFields, type LabelFont } from './controlPayload';
import { MODAL_DROPDOWN_SLOT_TYPE } from './modalControls';
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

/** Host `type` tag for a per-option payload blob (decoded per-row by the RP option controls). */
const DROPDOWN_OPTION_TYPE = 'dropdown-option';

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
}

/**
 * The per-option styling every option row is encoded with. Currently uniform (all options
 * share the dropdown-level values), but it rides EACH option's own payload blob, so per-option
 * overrides are a purely additive follow-up.
 */
interface OptionStyle {
  height: number;
  background: string;
  backgroundHover: string;
  backgroundSelected: string;
  fontType: string;
  fontScaleFactor: number;
  align: 'left' | 'center' | 'right';
}

/**
 * Encode one option into its own `bcuiv0007` payload blob — the string handed to the native
 * `ModalFormData.dropdown` as this option's entry. The engine surfaces it per-row as
 * `#custom_radio_text`, and the RP `dropdown_option_radio` decodes text + row height +
 * background states + font/scale/align from it via the shared `'%.Ns'` slicing grammar
 * (exactly like main-form cells decode their `#custom_text`). Because each option gets its
 * OWN payload, the 64-field marker budget resets per option, and — since `options[]` bypasses
 * the serializer's primitive prop channel — option text is not subject to the 80-byte field
 * cap here. Field ORDER is the RP decode contract.
 */
function serializeDropdownOption(text: string, style: OptionStyle): string {
  const [payload] = serializeProps({
    type: DROPDOWN_OPTION_TYPE,
    text, // field 1 → #custom_radio_text (visible label)
    height: style.height, // field 2 → row #size_binding_y (px)
    background: style.background, // field 3 → idle option face
    backgroundHover: style.backgroundHover, // field 4
    backgroundSelected: style.backgroundSelected, // field 5
    fontType: style.fontType, // field 6
    fontScaleFactor: style.fontScaleFactor, // field 7
    align: style.align, // field 8 → gates option_label_left/center/right
  });

  return payload;
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
  optionFont, optionScale, optionAlign, optionHeight, ...layout
}: FormDropdownProps): JSX.Element => {
  const defaultIndex = defaultValue !== undefined ? Math.max(0, options.indexOf(defaultValue)) : 0;
  const optionLabelFont = labelFontFields({ font: optionFont, scale: optionScale });
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
      // Native args (past the RP-read region): read by the writer, not decoded RP-side. The
      // writer encodes one blob per option from the raw option text + the option style below,
      // then passes the blob array to the native `dropdown()` call. Raw option text rides
      // `option0..optionN` primitive fields (≤80 bytes each); `optionCount` bounds the loop.
      name,
      defaultValueIndex: defaultIndex,
      optHeight: optionStyle.height,
      optBackground: optionStyle.background,
      optBackgroundHover: optionStyle.backgroundHover,
      optBackgroundSelected: optionStyle.backgroundSelected,
      optFontType: optionStyle.fontType,
      optFontScaleFactor: optionStyle.fontScaleFactor,
      optAlign: optionStyle.align,
      optionCount: options.length,
      ...Object.fromEntries(options.map((option, i) => [`option${i}`, option])),
    },
  };
};

/** Serializes a `modal-dropdown` into the native modal dropdown control. */
export const formDropdownWriter: Writer = (payload, form, ctx, _callbacks, props) => {
  if (!isModalForm(form)) {
    throw new ModalFormError('Form.Dropdown must be rendered inside a `<Form>`.');
  }

  const name = typeof props?.name === 'string' ? props.name : '';
  const defaultValueIndex = typeof props?.defaultValueIndex === 'number' ? props.defaultValueIndex : 0;

  // Reconstruct the per-option style the component resolved, then encode one payload blob per
  // option from its raw text + that style. The blobs become the native option strings.
  const style: OptionStyle = {
    height: typeof props?.optHeight === 'number' ? props.optHeight : OPTION_ROW_HEIGHT,
    background: typeof props?.optBackground === 'string' ? props.optBackground : UNSTYLED_TEXTURE,
    backgroundHover: typeof props?.optBackgroundHover === 'string' ? props.optBackgroundHover : UNSTYLED_TEXTURE,
    backgroundSelected: typeof props?.optBackgroundSelected === 'string' ? props.optBackgroundSelected : UNSTYLED_TEXTURE,
    fontType: typeof props?.optFontType === 'string' ? props.optFontType : 'default',
    fontScaleFactor: typeof props?.optFontScaleFactor === 'number' ? props.optFontScaleFactor : 2,
    align: props?.optAlign === 'center' || props?.optAlign === 'right' ? props.optAlign : 'left',
  };

  const count = typeof props?.optionCount === 'number' ? props.optionCount : 0;
  const encodedOptions: string[] = [];

  for (let i = 0; i < count; i++) {
    const text = props?.[`option${i}`];

    encodedOptions.push(serializeDropdownOption(typeof text === 'string' ? text : '', style));
  }

  emitDropdown(payload, form, ctx, name, encodedOptions, defaultValueIndex);
};
