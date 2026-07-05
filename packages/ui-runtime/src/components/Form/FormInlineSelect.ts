import { isModalForm } from '../../core/guards';
import { ModalFormError, type Writer } from '../../core/types';
import { emitDropdown } from '../../core/writers';
import { FunctionComponent, JSX } from '../../jsx';
import { UNSTYLED_TEXTURE, withControl } from '../control';
import { labelFontFields, type LabelFont } from './controlPayload';
import { MODAL_INLINE_SELECT_SLOT_TYPE, MODAL_OPTION_SLOT_TYPE } from './modalControls';
import { optionLabelPosition, serializeSelectOption, type OptionGeometry, type OptionStyle } from './optionPayload';
import { FormControlBase } from './shared';

export interface FormInlineSelectProps extends FormControlBase {
  /**
   * Initial selection as an option VALUE (matched against each `Form.Option`'s `value`, mapped to
   * its index). Defaults to the first option. `Form.onSubmit` reports the selected option's INDEX.
   */
  defaultValue?: string;
  // --- Group-level option style defaults (each Form.Option may override its own) ---
  /** Default idle option background texture. */
  optionBackground?: string;
  /** Default option hover background. */
  optionHover?: string;
  /** Default option selected background. */
  optionSelected?: string;
  /** Default unselected bullet glyph (radio). Empty draws no bullet (segmented). */
  bullet?: string;
  /** Default selected bullet glyph (radio). */
  bulletSelected?: string;
  /** Default bullet glyph width (px). Default `12`. */
  bulletWidth?: number;
  /** Default bullet glyph height (px). Default `12`. */
  bulletHeight?: number;
  /** Default option label font. */
  optionFont?: LabelFont;
  /** Default option label scale. */
  optionScale?: number;
  /** Default option label alignment. */
  optionAlign?: 'left' | 'center' | 'right';
  /**
   * The `Form.Option` children — each is flex-laid-out by our layout system (position them with
   * the usual layout props), and its computed geometry is packed into its native option blob so
   * the RP option row self-positions. The single submitted value is the selected option's index.
   */
  children?: JSX.Node;
}

/** The resolved group-level defaults the writer applies to any option field an option didn't set. */
interface GroupOptionDefaults {
  background: string;
  backgroundHover: string;
  backgroundSelected: string;
  bulletTexture: string;
  bulletSelectedTexture: string;
  bulletWidth: number;
  bulletHeight: number;
  fontType: string;
  fontScaleFactor: number;
  align: 'left' | 'center' | 'right';
}

/**
 * Inline single-select group (radio group / toggle-button group) → `ModalFormData.dropdown`,
 * rendered INLINE (all options always visible, no popup). Result (`Form.onSubmit`): the selected
 * option's INDEX. Modal-only; render inside a `<Form>`.
 *
 * Options are authored as `Form.Option` CHILDREN. Each is laid out by our flex engine (arbitrary
 * position/size), and the writer packs every option's computed x/y/w/h into its native blob so the
 * RP option row self-positions via `use_anchored_offset` — layout is fully ours, not the engine's
 * flow. Selection + the single submitted index still ride the one native `dropdown()` emitted here.
 *
 * The group cell itself is a full-size, top-left-anchored invisible container; options place
 * themselves absolutely within it from their blob geometry.
 */
export const FormInlineSelect: FunctionComponent<FormInlineSelectProps> = ({
  name, defaultValue,
  optionBackground, optionHover, optionSelected,
  bullet, bulletSelected, bulletWidth, bulletHeight,
  optionFont, optionScale, optionAlign,
  children, ...layout
}: FormInlineSelectProps): JSX.Element => {
  const optionBase = optionBackground ?? UNSTYLED_TEXTURE;
  const groupFont = labelFontFields({ font: optionFont, scale: optionScale });

  // Group-level defaults an option inherits when it doesn't set its own field.
  const groupDefaults: GroupOptionDefaults = {
    background: optionBase,
    backgroundHover: optionHover ?? optionBase,
    backgroundSelected: optionSelected ?? optionBase,
    bulletTexture: bullet ?? '',
    bulletSelectedTexture: bulletSelected ?? '',
    bulletWidth: bulletWidth ?? 12,
    bulletHeight: bulletHeight ?? 12,
    fontType: groupFont.fontType,
    fontScaleFactor: groupFont.fontScaleFactor,
    align: optionAlign ?? 'left',
  };

  return {
    type: MODAL_INLINE_SELECT_SLOT_TYPE,
    // The Form.Option children ride here so the layout phase lays them out (each gets its own
    // jsonUIx/y/w/h). They are NOT serialized as controls — the writer reads their geometry and
    // the serialize walk skips MODAL_OPTION_SLOT_TYPE nodes.
    props: {
      // Full-size top-left container: the cell reserves the group's flow box (from the caller's
      // layout); options position absolutely inside it from their own blob geometry.
      ...withControl(layout),
      children,
    },
    // Group defaults ride the writer-only side channel (never serialized). The writer combines
    // them with each option child's own overrides + post-layout geometry to build the blobs.
    nativeArgs: {
      name,
      defaultValue: defaultValue ?? '',
      groupDefaults,
    },
  };
};

// ── Writer ──────────────────────────────────────────────────────────────────────

/** Narrow a built child element to a `Form.Option` and read its post-layout data + geometry. */
interface OptionData {
  value: string;
  text: string;
  style: OptionStyle;
  geometry: OptionGeometry;
}

function readNumber(v: unknown, fallback = 0): number {
  return typeof v === 'number' ? v : fallback;
}

function readString(v: unknown, fallback: string): string {
  return typeof v === 'string' ? v : fallback;
}

function readAlign(v: unknown, fallback: 'left' | 'center' | 'right'): 'left' | 'center' | 'right' {
  return v === 'left' || v === 'center' || v === 'right' ? v : fallback;
}

/**
 * Extract one option's value/text/style/geometry from its (post-layout) `Form.Option` element.
 * Geometry is encoded RELATIVE to the group cell's own box (`groupX`/`groupY`): the layout phase
 * computes ABSOLUTE screen coords for every node, but the RP option row anchors inside the group
 * box (which is already placed at the cell's screen position), so absolute coords would be
 * double-offset (verified via pipeline dump: option y = group y + local y).
 */
function readOption(el: JSX.Element, defaults: GroupOptionDefaults, groupX: number, groupY: number): OptionData {
  const p = el.props;

  return {
    value: readString(p.value, ''),
    text: readString(p.label, ''),
    style: {
      // Legacy flow-height field [175] is UNUSED inline (the row sizes from geometry width/height
      // at [1088]/[1171]); keep it 0 so it doesn't shadow the real per-option height.
      height: 0,
      background: readString(p.background, defaults.background),
      backgroundHover: readString(p.backgroundHover, defaults.backgroundHover),
      backgroundSelected: readString(p.backgroundSelected, defaults.backgroundSelected),
      fontType: readString(p.__optionFontType, defaults.fontType),
      fontScaleFactor: readNumber(p.__optionFontScale, defaults.fontScaleFactor),
      align: readAlign(p.align, defaults.align),
      bulletTexture: readString(p.bullet, defaults.bulletTexture),
      bulletSelectedTexture: readString(p.bulletSelected, defaults.bulletSelectedTexture),
      bulletWidth: readNumber(p.bulletWidth, defaults.bulletWidth),
      bulletHeight: readNumber(p.bulletHeight, defaults.bulletHeight),
    },
    geometry: {
      x: readNumber(p.jsonUIx) - groupX,
      y: readNumber(p.jsonUIy) - groupY,
      width: readNumber(p.jsonUIWidth),
      height: readNumber(p.jsonUIHeight),
    },
  };
}

function isGroupDefaults(v: unknown): v is GroupOptionDefaults {
  return typeof v === 'object' && v !== null && 'background' in v && 'fontType' in v;
}

function isOptionElement(node: unknown): node is JSX.Element {
  return (
    typeof node === 'object' && node !== null && 'type' in node
    && (node).type === MODAL_OPTION_SLOT_TYPE
  );
}

/**
 * Serialize a `modal-inline-select` into the native modal dropdown, reading each laid-out
 * `Form.Option` child's geometry + data. Same native `dropdown()` call as the popup dropdown —
 * only the per-option blobs (now carrying flex geometry) and the RP inline decode differ.
 */
export const formInlineSelectWriter: Writer = (payload, form, ctx, _callbacks, props, nativeArgs, children) => {
  if (!isModalForm(form)) {
    throw new ModalFormError('Form.Radio / Form.ToggleButton must be rendered inside a `<Form>`.');
  }

  const name = typeof nativeArgs?.name === 'string' ? nativeArgs.name : '';
  const defaultValue = typeof nativeArgs?.defaultValue === 'string' ? nativeArgs.defaultValue : '';
  const defaults: GroupOptionDefaults = isGroupDefaults(nativeArgs?.groupDefaults)
    ? nativeArgs.groupDefaults
    : {
        background: UNSTYLED_TEXTURE, backgroundHover: UNSTYLED_TEXTURE, backgroundSelected: UNSTYLED_TEXTURE,
        bulletTexture: '', bulletSelectedTexture: '', bulletWidth: 12, bulletHeight: 12,
        ...labelFontFields(), align: 'left',
      };

  // The group cell's own layout box — option geometry is encoded relative to it.
  const groupX = readNumber(props?.jsonUIx);
  const groupY = readNumber(props?.jsonUIy);

  const childArray = Array.isArray(children) ? children : children === undefined ? [] : [children];
  const optionEls = childArray.filter(isOptionElement);
  const opts = optionEls.map(el => readOption(el, defaults, groupX, groupY));

  const defaultIndex = Math.max(0, opts.findIndex(o => o.value === defaultValue));

  // One blob per option, carrying its style + flex geometry; the blobs are the native option
  // strings the RP inline rows self-decode + self-position from.
  // Label position is TS-COMPUTED (alignment left the RP): each option's label places
  // inside ITS OWN row box. A radio bullet occupies the row's left edge, so left-aligned
  // labels start past it (bulletWidth + 4px gap) — the bullet-dependent label offset.
  const encodedOptions = opts.map(o => serializeSelectOption(
    o.text,
    o.style,
    o.geometry,
    optionLabelPosition(
      o.text,
      o.style,
      o.geometry.width,
      o.geometry.height,
      o.style.bulletTexture !== '' ? o.style.bulletWidth + 4 : 4,
    ),
  ));

  emitDropdown(payload, form, ctx, name, encodedOptions, defaultIndex);
};
