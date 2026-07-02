import type { ModalFormData } from '@minecraft/server-ui';
import { CANONICAL_SCREEN } from '@bedrock-core/flexbox';
import { isModalForm } from '../../core/guards';
import { ModalFormError, type Writer } from '../../core/types';
import { emitModalControl } from '../../core/writers';
import { FunctionComponent, JSX } from '../../jsx';
import { controlPayloadProps } from './controlPayload';
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

export interface FormDropdownProps extends FormControlBase {
  /** Selectable options. */
  options: string[];
  /**
   * Initial selection as an option VALUE (mapped to its index). Defaults to the first
   * option. `Form.onSubmit` reports the selected option's INDEX (native behavior).
   */
  defaultValue?: string;
  /**
   * Closed-box hover-state texture. Mirrors `Button`'s state textures — the default
   * texture is the base `background` prop; these three swap on interaction. Default
   * `''` (RP falls back to the default `background`).
   */
  backgroundHover?: string;
  /** Closed-box pressed-state texture. Default `''`. */
  backgroundPressed?: string;
  /** Closed-box locked/disabled-state texture. Default `''`. */
  backgroundLocked?: string;
  /**
   * Popup container background texture — the surface behind the option list when the
   * dropdown is open. Default `''` (container renders without a background).
   */
  popupBackground?: string;
  /** Per-option row background texture (idle). Default `''`. */
  optionBackground?: string;
  /** Per-option row hover-state texture. Default `''`. */
  optionHover?: string;
  /** Per-option row selected-state texture. Default `''`. */
  optionSelected?: string;
}

/**
 * Option dropdown field → `ModalFormData.dropdown`. Result (`Form.onSubmit`): the
 * selected option's `index` (number, native behavior). Modal-only; render inside a
 * `<Form>`. Accepts the same control/layout props as any component; geometry is
 * computed by the layout phase and encoded into the label payload for the RP to
 * position/style the native widget.
 */
export const FormDropdown: FunctionComponent<FormDropdownProps> = ({
  name, label, tooltip, options, defaultValue, font, scale,
  backgroundHover, backgroundPressed, backgroundLocked, popupBackground,
  optionBackground, optionHover, optionSelected, ...layout
}: FormDropdownProps): JSX.Element => {
  const defaultIndex = defaultValue !== undefined ? Math.max(0, options.indexOf(defaultValue)) : 0;

  // Split the payload props so the closed-box state textures land at the SAME byte
  // offsets as `Button`'s ([1024-1272], right after the reserved block). The RP
  // closed-box faces are literal copies of the button's state decode blocks, so the
  // dropdown payload must match the button field layout there; the label styling tail
  // moves after them.
  const { value, fontType, fontScaleFactor, ...controlBlock } = controlPayloadProps(layout, label ?? '', { font, scale });

  return {
    type: MODAL_DROPDOWN_SLOT_TYPE,
    props: {
      ...controlBlock,
      backgroundHover: backgroundHover ?? '', // [1024-1106] like Button
      backgroundPressed: backgroundPressed ?? '', // [1107-1189]
      backgroundLocked: backgroundLocked ?? '', // [1190-1272]
      popupBackground: popupBackground ?? '', // [1273-1355] dropdown-specific
      optionBackground: optionBackground ?? '', // [1356-1438]
      optionHover: optionHover ?? '', // [1439-1521]
      optionSelected: optionSelected ?? '', // [1522-1604]
      // [1605-1687] computed popup height (px): hug the option list, cap at half the
      // screen. The RP decodes it into popup_card's #size_binding_y and derives the
      // centering offset (-height/2) from it.
      popupHeight: Math.min(options.length * POPUP_ROW_HEIGHT + POPUP_CHROME, POPUP_MAX_HEIGHT),
      value,
      fontType,
      fontScaleFactor,
      name,
      // Option text stays raw for now — per-option decode is a follow-up once the
      // label path is proven in-game.
      build: (form: ModalFormData, payload: string): void => {
        form.dropdown(payload, options, { defaultValueIndex: defaultIndex, tooltip });
      },
    },
  };
};

/** Serializes a `modal-dropdown` into the native modal dropdown control. */
export const formDropdownWriter: Writer = (payload, form, ctx, callbacks, props) => {
  if (!isModalForm(form)) {
    throw new ModalFormError('Form.Dropdown must be rendered inside a `<Form>`.');
  }

  const build = callbacks.build as ((f: ModalFormData, p: string) => void) | undefined;
  const name = typeof props?.name === 'string' ? props.name : '';

  if (!build) {
    return;
  }

  emitModalControl(form, ctx, name, payload, build);
};
