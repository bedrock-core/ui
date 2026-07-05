import { serializeProps } from '../../core/serializer';
import { measureText } from '../../util/textMetrics';
import type { LabelFont } from './controlPayload';

/** Host `type` tag for a per-option payload blob (decoded per-row by the RP option controls). */
export const DROPDOWN_OPTION_TYPE = 'dropdown-option';

/**
 * The per-option styling an option row is encoded with — shared by the dropdown popup rows AND
 * the inline radio / toggle-button rows (both ride the native `options[]` collection strings,
 * decoded per-row by the RP). For the dropdown popup this is uniform across options; for inline
 * selects each `Form.Option` supplies its own (styling is genuinely per-option).
 *
 * The two `bullet*` fields are the radio glyph pair (empty for the dropdown popup and for the
 * segmented toggle-button skin — an empty texture self-hides the bullet image RP-side).
 */
export interface OptionStyle {
  height: number;
  background: string;
  backgroundHover: string;
  backgroundSelected: string;
  fontType: string;
  fontScaleFactor: number;
  align: 'left' | 'center' | 'right';
  /** Unselected radio bullet glyph texture. Empty = no bullet (dropdown / segmented). */
  bulletTexture: string;
  /** Selected radio bullet glyph texture. Empty = no bullet. */
  bulletSelectedTexture: string;
  /** Bullet glyph width (px). */
  bulletWidth: number;
  /** Bullet glyph height (px). */
  bulletHeight: number;
}

/**
 * Per-option flex geometry (px) computed by the layout phase for a `Form.Option`. Packed into the
 * option blob AFTER the style fields so the RP option row SELF-POSITIONS via `use_anchored_offset`
 * (x/y) at its flex-computed size (width/height) — exactly the control-block positioning pattern,
 * applied at the option level. The dropdown popup passes all zeros (its rows still flow).
 */
export interface OptionGeometry {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Zero geometry — the dropdown popup rows flow (engine-positioned), so they encode no offsets. */
export const NO_OPTION_GEOMETRY: OptionGeometry = { x: 0, y: 0, width: 0, height: 0 };

/**
 * Runtime type guard for the `optionStyle` carried on a control's `nativeArgs`.
 * Uses `in`-operator narrowing so no unsafe assertion is needed to index `value`.
 */
export function isOptionStyle(value: unknown): value is OptionStyle {
  return (
    typeof value === 'object'
    && value !== null
    && 'height' in value && typeof value.height === 'number'
    && 'background' in value && typeof value.background === 'string'
    && 'backgroundHover' in value && typeof value.backgroundHover === 'string'
    && 'backgroundSelected' in value && typeof value.backgroundSelected === 'string'
    && 'fontType' in value && typeof value.fontType === 'string'
    && 'fontScaleFactor' in value && typeof value.fontScaleFactor === 'number'
    && 'align' in value && (value.align === 'left' || value.align === 'center' || value.align === 'right')
    && 'bulletTexture' in value && typeof value.bulletTexture === 'string'
    && 'bulletSelectedTexture' in value && typeof value.bulletSelectedTexture === 'string'
    && 'bulletWidth' in value && typeof value.bulletWidth === 'number'
    && 'bulletHeight' in value && typeof value.bulletHeight === 'number'
  );
}

/** Runtime type guard for a `string[]` (the raw option list on `nativeArgs`). */
export function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(v => typeof v === 'string');
}

/** The computed position of an option's label inside its row (px, from row top-left). */
export interface OptionLabelPosition {
  x: number;
  y: number;
}

/**
 * Compute where an option's label sits inside its row — ALIGNMENT IS TS-SIDE now: the RP
 * has one position-driven `option_label` (no left/center/right variants, no align gating);
 * this measures the text with the real font metrics and turns the requested `align` into a
 * concrete x, plus vertical centering into y. `leftInset` is the left-aligned start (callers
 * pass bulletWidth + gap when a radio bullet occupies the row's left edge).
 */
export function optionLabelPosition(
  text: string,
  style: OptionStyle,
  rowWidth: number,
  rowHeight: number,
  leftInset: number,
): OptionLabelPosition {
  // Invert the serialized fields back to measurement inputs (fontScaleFactor = scale / 0.5).
  const font: LabelFont = style.fontType === 'MinecraftTen' ? 'minecraftTen' : 'mojangles';
  const m = measureText({ text, font, fontSize: style.fontScaleFactor * 0.5 });

  const x = style.align === 'center'
    ? Math.round((rowWidth - m.width) / 2)
    : style.align === 'right'
      ? Math.round(rowWidth - 4 - m.width)
      : leftInset;

  return { x, y: Math.round((rowHeight - m.height) / 2) };
}

/**
 * Encode one option into its own `bcuiv0007` payload blob — the string handed to the native
 * `ModalFormData.dropdown` as this option's entry. The engine surfaces it per-row as
 * `#custom_radio_text`, and the RP option rows decode text + row height + background states +
 * font/scale (+ the two bullet textures) from it via the shared `'%.Ns'` slicing grammar
 * (exactly like main-form cells decode their `#custom_text`). Because each option gets its OWN
 * payload, the 64-field marker budget resets per option, and — since `options[]` bypasses the
 * serializer's primitive prop channel — option text is not subject to the 80-byte field cap
 * here. Field ORDER is the RP decode contract. `label` carries the TS-COMPUTED label position
 * (see {@link optionLabelPosition}): labelX occupies the old align field slot [673] and labelY
 * appends at the end, so every other offset is unchanged.
 */
export function serializeSelectOption(
  text: string,
  style: OptionStyle,
  geometry: OptionGeometry = NO_OPTION_GEOMETRY,
  label: OptionLabelPosition = { x: 4, y: 0 },
): string {
  const [payload] = serializeProps({
    type: DROPDOWN_OPTION_TYPE,
    text, // field 1 → #custom_radio_text (visible label), offset [92]
    height: style.height, // field 2 → (legacy flow row height), [175]
    background: style.background, // field 3 → idle option face, [258]
    backgroundHover: style.backgroundHover, // field 4, [341]
    backgroundSelected: style.backgroundSelected, // field 5, [424]
    fontType: style.fontType, // field 6, [507]
    fontScaleFactor: style.fontScaleFactor, // field 7, [590]
    labelX: label.x, // field 8 → option_label anchored X (was the align gate slot), [673]
    bulletTexture: style.bulletTexture, // field 9 → unselected bullet glyph, [756]
    bulletSelectedTexture: style.bulletSelectedTexture, // field 10 → selected bullet glyph, [839]
    // Per-option flex geometry (px) — the inline row self-positions from these via
    // use_anchored_offset (x/y) at this size (w/h). Dropdown popup rows pass zeros (they flow).
    optionX: geometry.x, // field 11 → #anchored_offset_value_x, [922]
    optionY: geometry.y, // field 12 → #anchored_offset_value_y, [1005]
    optionWidth: geometry.width, // field 13 → #size_binding_x, [1088]
    optionHeight: geometry.height, // field 14 → #size_binding_y, [1171]
    bulletWidth: style.bulletWidth, // field 15 → bullet glyph width px, [1254]
    bulletHeight: style.bulletHeight, // field 16 → bullet glyph height px, [1337]
    labelY: label.y, // field 17 → option_label anchored Y, [1420]
  });

  return payload;
}
