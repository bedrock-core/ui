import { CANONICAL_SCREEN } from '@bedrock-core/flexbox';
import { isModalForm } from '../../core/guards';
import { ModalFormError, type Writer } from '../../core/types';
import { emitDropdown } from '../../core/writers';
import { FunctionComponent, JSX } from '../../jsx';
import { resolveStateBackgrounds, UNSTYLED_TEXTURE, withControl, type StateBackgroundProps } from '../control';
import { labelFontFields, type LabelFont } from './controlPayload';
import { MODAL_DROPDOWN_SLOT_TYPE } from './modalControls';
import { FormControlBase } from './shared';

/** Option row height (px) — must match the RP's `dropdown_option_radio` "17px". */
const POPUP_ROW_HEIGHT = 17;
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
}

/**
 * Option dropdown field → `ModalFormData.dropdown`. Result (`Form.onSubmit`): the
 * selected option's `index` (number, native behavior). Modal-only; render inside a
 * `<Form>`. Accepts the same control/layout props as any component; geometry is
 * computed by the layout phase and encoded into the label payload for the RP to
 * position/style the native widget.
 */
export const FormDropdown: FunctionComponent<FormDropdownProps> = ({
  name, options, defaultValue,
  backgroundHover, backgroundPressed, backgroundLocked, popupBackground,
  optionBackground, optionHover, optionSelected,
  optionFont, optionScale, optionAlign, ...layout
}: FormDropdownProps): JSX.Element => {
  const defaultIndex = defaultValue !== undefined ? Math.max(0, options.indexOf(defaultValue)) : 0;
  const optionLabelFont = labelFontFields({ font: optionFont, scale: optionScale });
  // Closed box mirrors Button: the shared `state ?? base ?? unstyled` rule.
  const closedBox = resolveStateBackgrounds({ background: layout.background, backgroundHover, backgroundPressed, backgroundLocked });
  // Option rows follow the same rule against their own base.
  const optionBase = optionBackground ?? UNSTYLED_TEXTURE;

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
      optionBackground: optionBase, // [1356-1438]
      optionHover: optionHover ?? optionBase, // [1439-1521]
      optionSelected: optionSelected ?? optionBase, // [1522-1604]
      // [1605-1687] computed popup height (px): hug the option list, cap at half the
      // screen. The RP decodes it into popup_shift's #size_binding_y; the centering
      // (half above / half below the pinned middle line) is done geometrically by
      // popup_card's bottom_left→left_middle anchoring.
      popupHeight: Math.min(options.length * POPUP_ROW_HEIGHT + POPUP_CHROME, POPUP_MAX_HEIGHT),
      // Option-label styling block (Step 5): decoded by the three alignment-gated
      // option_label_* variants in modal_dropdown.json — offsets are the contract.
      optionFontType: optionLabelFont.fontType, // [1688-1770]
      optionFontScaleFactor: optionLabelFont.fontScaleFactor, // [1771-1853]
      optionAlign: optionAlign ?? 'left', // [1854-1936] selects the visible label variant
      // Native args (past the RP-read region): read by the writer, not decoded RP-side.
      // `defaultValueIndex` is resolved here from the `defaultValue` option value so the
      // writer stays a pure reader. The `options` array is serialized as one primitive
      // string field per option (`option0`, `option1`, …) plus `optionCount` — the same
      // primitive payload channel every other prop uses. The writer rebuilds the array
      // from them. (In-game verified: the native dropdown has no practical option-count or
      // label-length cap, so per-option fields carry it fine.)
      name,
      defaultValueIndex: defaultIndex,
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
  // Rebuild the options array from the per-option primitive fields (`optionCount` +
  // `option0`, `option1`, …) the component serialized.
  const count = typeof props?.optionCount === 'number' ? props.optionCount : 0;
  const options: string[] = [];

  for (let i = 0; i < count; i++) {
    const option = props?.[`option${i}`];

    options.push(typeof option === 'string' ? option : '');
  }

  emitDropdown(payload, form, ctx, name, options, defaultValueIndex);
};
