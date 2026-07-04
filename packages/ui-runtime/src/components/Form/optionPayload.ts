import { serializeProps } from '../../core/serializer';

/** Host `type` tag for a per-option payload blob (decoded per-row by the RP option controls). */
export const DROPDOWN_OPTION_TYPE = 'dropdown-option';

/**
 * The per-option styling every option row is encoded with — shared by the dropdown popup
 * rows AND the inline radio / toggle-button rows (both ride the native `options[]` collection
 * strings, decoded per-row by the RP). Currently uniform across a control's options, but it
 * rides EACH option's own payload blob, so per-option overrides are a purely additive follow-up.
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
}

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
  );
}

/** Runtime type guard for a `string[]` (the raw option list on `nativeArgs`). */
export function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(v => typeof v === 'string');
}

/**
 * Encode one option into its own `bcuiv0007` payload blob — the string handed to the native
 * `ModalFormData.dropdown` as this option's entry. The engine surfaces it per-row as
 * `#custom_radio_text`, and the RP option rows decode text + row height + background states +
 * font/scale/align (+ the two bullet textures) from it via the shared `'%.Ns'` slicing grammar
 * (exactly like main-form cells decode their `#custom_text`). Because each option gets its OWN
 * payload, the 64-field marker budget resets per option, and — since `options[]` bypasses the
 * serializer's primitive prop channel — option text is not subject to the 80-byte field cap
 * here. Field ORDER is the RP decode contract; the two bullet fields append AFTER `align` so
 * the dropdown popup's existing offsets are unchanged.
 */
export function serializeSelectOption(text: string, style: OptionStyle): string {
  const [payload] = serializeProps({
    type: DROPDOWN_OPTION_TYPE,
    text, // field 1 → #custom_radio_text (visible label), offset [92]
    height: style.height, // field 2 → row #size_binding_y (px), [175]
    background: style.background, // field 3 → idle option face, [258]
    backgroundHover: style.backgroundHover, // field 4, [341]
    backgroundSelected: style.backgroundSelected, // field 5, [424]
    fontType: style.fontType, // field 6, [507]
    fontScaleFactor: style.fontScaleFactor, // field 7, [590]
    align: style.align, // field 8 → gates option_label_left/center/right, [673]
    bulletTexture: style.bulletTexture, // field 9 → unselected bullet glyph, [756]
    bulletSelectedTexture: style.bulletSelectedTexture, // field 10 → selected bullet glyph, [839]
  });

  return payload;
}
