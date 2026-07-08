import { CANONICAL_SCREEN } from '@bedrock-core/flexbox';
import { isModalForm } from '../../core/guards';
import { ModalFormError, type Writer } from '../../core/types';
import { emitDropdown } from '../../core/writers';
import { FunctionComponent, JSX } from '../../jsx';
import { measureText } from '../../util/textMetrics';
import { resolveStateBackgrounds, UNSTYLED_TEXTURE, withControl, type StateBackgroundProps } from '../control';
import { labelFontFields, type LabelFont } from './controlPayload';
import {
  fallbackGroupDefaults, isGroupDefaults, NO_OPTION_GEOMETRY, optionElements, optionLabelPosition,
  readOption, serializeSelectOption, type GroupOptionDefaults,
} from './optionPayload';
import { FormControlBase } from './shared';

/**
 * Fixed option row height (px) — the RP `dropdown_option_radio` renders every row at this
 * height (the popup rows flow at fixed height; only INLINE options carry real geometry).
 * `popupHeight` is computed from THIS constant to stay in sync with what the RP draws.
 */
const OPTION_ROW_HEIGHT = 17;
/**
 * Adjacent option rows FUSE their 1px texture borders: each face renders 1px taller than
 * its flow slot (`"100%+1px"` in RP `dropdown_option_radio`), so its bottom border and the
 * next row's top border coincide — a single 1px line between elements instead of
 * border + gap + border. The fused column is therefore rows × height + 1px tall.
 */
const OPTION_ROW_OVERLAP = 1;
/**
 * Padding (px) between the option list and the popup card edges. The RP mirrors the
 * left/top/right (`dropdown_options` offset `[1,1]` + `"100%-2px"` width); `popupHeight`
 * adds it for BOTH the top and bottom edges.
 */
const POPUP_PADDING = 1;
/** Popup height cap: half the canonical screen — longer lists get the scrollbar. */
const POPUP_MAX_HEIGHT = CANONICAL_SCREEN.height / 2;

/** Host type for the native modal dropdown slot (modal-only). */
export const MODAL_DROPDOWN_SLOT_TYPE = 'modal-dropdown';

export interface FormDropdownProps extends FormControlBase, StateBackgroundProps {
  /**
   * Initial selection as an option VALUE (matched against each `Form.Option`'s `value`,
   * mapped to its index). Defaults to the first option. `Form.onSubmit` reports the
   * selected option's INDEX (native behavior).
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
  // --- Group-level option style defaults (each Form.Option may override its own) ---
  /** Default option row background texture (idle). Defaults to the unstyled placeholder. */
  optionBackground?: string;
  /** Default option row hover-state texture. Defaults to the resolved option background. */
  optionHover?: string;
  /** Default option row selected-state texture. Defaults to the resolved option background. */
  optionSelected?: string;
  /** Default option label font family (popup rows). Defaults to `'mojangles'`. */
  optionFont?: LabelFont;
  /** Default option label scale multiplier relative to the standard glyph size. Default `1.0`. */
  optionScale?: number;
  /** Default option label alignment (TS-computed into the label position). Default `'left'`. */
  optionAlign?: 'left' | 'center' | 'right';
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
  /**
   * The selectable options, authored as `Form.Option` children (same authoring shape as
   * `Form.Radio` / `Form.ToggleButton`). Popup rows flow at the fixed row height, so an
   * option's layout props are ignored here — only its `value`/`label`/style are read.
   */
  children?: JSX.Node;
}

/**
 * Option dropdown field → `ModalFormData.dropdown`. Result (`Form.onSubmit`): the
 * selected option's `index` (number, native behavior). Modal-only; render inside a
 * `<Form>`. Accepts the same control/layout props as any component; geometry is
 * computed by the layout phase and encoded into the label payload for the RP to
 * position/style the native widget.
 *
 * Options are `Form.Option` CHILDREN. Each carries its OWN encoded payload (label group +
 * background states) as the native option string — the RP option rows self-decode it per
 * row, so option styling is genuinely per-option (not read uniformly from the cell).
 */
export const FormDropdown: FunctionComponent<FormDropdownProps> = ({
  name, defaultValue,
  backgroundHover, backgroundPressed, backgroundLocked, popupBackground,
  optionBackground, optionHover, optionSelected,
  optionFont, optionScale, optionAlign,
  currentColor, currentFont, currentScale, currentInsetX, currentInsetY,
  children, ...layout
}: FormDropdownProps): JSX.Element => {
  const optionLabelFont = labelFontFields({ font: optionFont, scale: optionScale });
  // Closed-box current-value label style (rides the CELL payload, not the option blob —
  // it decorates #dropdown_option_text after the RP decodes the option text out of it).
  const currentLabelFont = labelFontFields({ font: currentFont, scale: currentScale });
  // Closed box mirrors Button: the shared `state ?? base ?? unstyled` rule.
  const closedBox = resolveStateBackgrounds({ background: layout.background, backgroundHover, backgroundPressed, backgroundLocked });
  // Option rows follow the same rule against their own base.
  const optionBase = optionBackground ?? UNSTYLED_TEXTURE;

  // Group-level defaults an option inherits when it doesn't set its own field. Bullets are
  // dropdown-inert (empty textures self-hide the glyph images RP-side).
  const groupDefaults: GroupOptionDefaults = {
    background: optionBase,
    backgroundHover: optionHover ?? optionBase,
    backgroundSelected: optionSelected ?? optionBase,
    bulletTexture: '',
    bulletSelectedTexture: '',
    bulletHoverTexture: '',
    bulletSelectedHoverTexture: '',
    bulletWidth: 12,
    bulletHeight: 12,
    fontType: optionLabelFont.fontType,
    fontScaleFactor: optionLabelFont.fontScaleFactor,
    align: optionAlign ?? 'left',
  };

  const optionCount = optionElements(children).length;

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
      // [1356-1438] computed popup height (px): the fused option column (rows × height +
      // the 1px border overlap, cap at half the screen) + top and bottom padding. The RP
      // decodes it into popup_shift's #size_binding_y; the centering (half above / half below
      // the pinned middle line) is done geometrically by popup_card's bottom_left→left_middle
      // anchoring.
      popupHeight: Math.min(optionCount * OPTION_ROW_HEIGHT + OPTION_ROW_OVERLAP, POPUP_MAX_HEIGHT) + 2 * POPUP_PADDING,
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
      // Option children ride props like the inline select's: laid out (harmlessly — popup
      // rows flow at the fixed height), never serialized as controls (the walk skips
      // MODAL_OPTION_SLOT_TYPE), read by the writer below.
      children,
    },
    // Group defaults ride the writer-only side channel (never serialized). The writer combines
    // them with each option child's own overrides to build the blobs.
    nativeArgs: {
      name,
      defaultValue: defaultValue ?? '',
      groupDefaults,
    },
  };
};

/** Serializes a `modal-dropdown` into the native modal dropdown control. */
export const formDropdownWriter: Writer = (payload, form, ctx, _callbacks, props, nativeArgs, children) => {
  if (!isModalForm(form)) {
    throw new ModalFormError('Form.Dropdown must be rendered inside a `<Form>`.');
  }

  const name = typeof nativeArgs?.name === 'string' ? nativeArgs.name : '';
  const defaultValue = typeof nativeArgs?.defaultValue === 'string' ? nativeArgs.defaultValue : '';
  const defaults: GroupOptionDefaults = isGroupDefaults(nativeArgs?.groupDefaults)
    ? nativeArgs.groupDefaults
    : { ...fallbackGroupDefaults(), background: UNSTYLED_TEXTURE, backgroundHover: UNSTYLED_TEXTURE, backgroundSelected: UNSTYLED_TEXTURE };

  // Popup rows FLOW at the fixed row height — the option children's flex geometry is
  // ignored (pass zeros); only value/label/style are read.
  const opts = optionElements(children).map(el => readOption(el, defaults));
  const defaultIndex = Math.max(0, opts.findIndex(o => o.value === defaultValue));

  // Label position is TS-COMPUTED (alignment left the RP): popup rows are as wide as the
  // closed box (the cell); left inset 4 matches the old label box margin.
  const rowWidth = typeof props?.jsonUIWidth === 'number' ? props.jsonUIWidth : 0;
  const encodedOptions = opts.map(o => serializeSelectOption(
    o.text,
    o.style,
    NO_OPTION_GEOMETRY,
    // Center the label in the VISIBLE face (flow slot + the 1px border overlap): the face
    // center is also the center of the interior between the two shared border lines.
    optionLabelPosition(o.text, o.style, rowWidth, OPTION_ROW_HEIGHT + OPTION_ROW_OVERLAP, 4),
  ));

  emitDropdown(payload, form, ctx, name, encodedOptions, defaultIndex);
};
