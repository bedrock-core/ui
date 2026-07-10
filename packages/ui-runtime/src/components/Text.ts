import { useContext } from '../hooks';
import { FunctionComponent, JSX } from '../jsx';
import { TranslationKeysContext } from '../data/TranslationKeys';
import { type Writer } from '../core/types';
import { emitLabel } from '../core/writers';
import { ControlProps, withControl } from './control';
import { labelFontFields, type LabelFont } from './Form/controlPayload';

/** Public alias of the shared label font union (single source: controlPayload). */
export type TextFont = LabelFont;

/**
 * Element type emitted for `<Text shadow>`. JSON UI's label `shadow` is a load-time
 * property (not bindable), so shadow is routed at serialize time through a separate
 * component type: the RP mounts `text_shadow` as a sibling of `text` in both label
 * routers, gated by the standard `(#type = '…')` type gate, with a literal
 * `$shadow: true` on its label. Same writer, same payload contract as `text`.
 */
export const TEXT_SHADOW_TYPE = 'text_shadow';

/**
 * Element types for LOCALIZED overflow text (wordBreak/ellipsis/maxLines on a
 * `localizationKey`). The build side cannot pre-process a key — `props.value`
 * must stay the key and the RP resolves it at render — so these route to an RP
 * label variant whose width is bound to the control box, making Bedrock wrap
 * the resolved string natively. Raw text never uses them (it is pre-wrapped at
 * layout time and emitted as `text` / `text_shadow`).
 */
export const TEXT_WRAP_TYPE = 'text_wrap';
export const TEXT_SHADOW_WRAP_TYPE = 'text_shadow_wrap';

/** Whether an element type is one of the label-rendered text types. */
export function isTextElementType(type: unknown): boolean {
  return type === 'text' || type === TEXT_SHADOW_TYPE
    || type === TEXT_WRAP_TYPE || type === TEXT_SHADOW_WRAP_TYPE;
}

export type TextWordBreak = 'normal' | 'break-word';
export type TextOverflow = 'ellipsis';

export interface TextStyle {
  font?: TextFont;
}

export interface TextProps extends ControlProps {
  font?: TextFont;

  /**
   * Scale multiplier relative to the standard "normal" glyph size. Defaults to 1.0.
   * Values below 1.0 produce smaller text; values above 1.0 produce larger text.
   * Internally mapped to font_scale_factor accounting for the font_size:small base.
   */
  scale?: number;

  /**
   * Raw text content to display. Max 80 UTF-8 bytes.
   * For longer strings, use `localizationKey` instead.
   */
  children?: string;

  /**
   * Minecraft translation key (e.g. `"ui.myscreen.title"`).
   *
   * For correct layout metrics (word-wrap, ellipsis), the key should resolve through
   * the `translation-keys` Regolith filter: the key must exist in your pack's .lang
   * files, and the generated keys must be provided at the root of the UI via
   * `TranslationKeysContext`:
   *
   * ```tsx
   * import translationKeys from '@bedrock-core/generated/translation-keys';
   *
   * <TranslationKeysContext value={translationKeys}>
   *   <MyScreen />
   * </TranslationKeysContext>
   * ```
   *
   * A key missing from the map (another pack's key, plain text, or no provider at
   * all) measures as the literal key string — mirroring Bedrock, which renders an
   * unmatched key as-is. Plain-text values therefore render fine; only their wrap
   * metrics are approximate. To resolve another bedrock-core addon's keys, publish
   * them via `core.translations.provide(...)` and pass `core.translations.all()`
   * as the context value.
   *
   * Takes priority over `children` when both are provided.
   */
  localizationKey?: string;

  /**
   * 'break-word': automatically wrap at word boundaries, with hyphens for mid-word breaks.
   * Width comes from the container — no explicit maxWidth needed.
   */
  wordBreak?: TextWordBreak;

  /**
   * 'ellipsis': truncate text that overflows its container with '...'.
   */
  overflow?: TextOverflow;

  /**
   * Limit rendered text to N lines. The last line is always ellipsized.
   */
  maxLines?: number;

  /** Fine-tune X nudge (px) of the rendered label inside its layout box. Default `0`. */
  offsetX?: number;
  /** Fine-tune Y nudge (px) of the rendered label inside its layout box. Default `0`. */
  offsetY?: number;

  /**
   * Drop shadow behind the glyphs (JSON UI `shadow`). Default `false`.
   * Resolved at serialize time: shadowed text emits the `text_shadow` element type,
   * which the RP routes to a label variant with a literal `shadow: true`.
   */
  shadow?: boolean;
}

/**
 * Make raw text safe to render as a Bedrock JSON UI label. JSON UI feeds a
 * label's `text` through a numeric string-format path, so a value that starts
 * with a digit (or a leading `-`) renders blank or garbled. Prefixing a
 * zero-width `§r` shifts the leading character off the digit without changing
 * what's shown — the section code is consumed by the renderer and the text
 * metrics already treat `§x` as zero-width, so width/layout are unaffected.
 */
export function safeLabelText(text: string): string {
  return /^[\d-]/.test(text) ? `§r${text}` : text;
}

export const Text: FunctionComponent<TextProps> = ({
  children,
  localizationKey,
  font,
  scale,
  wordBreak,
  overflow,
  maxLines,
  offsetX,
  offsetY,
  shadow,
  ...rest
}: TextProps): JSX.Element => {
  const resolvedScale = scale ?? 1.0;
  // Shared mapping (controlPayload): font alias + scale over the font_size:small 0.5× base.
  const labelFont = labelFontFields({ font, scale });
  const isKey = localizationKey !== undefined;

  let resolvedText: string;

  if (isKey) {
    const translationKeys = useContext(TranslationKeysContext);

    // A key missing from the map (another pack's key, plain text, or no provider at
    // all) measures as the literal key string — mirroring Bedrock, which renders an
    // unmatched key as-is. Wrap/ellipsis metrics are approximate for such strings.
    resolvedText = translationKeys?.[localizationKey] ?? localizationKey;
  } else {
    resolvedText = children ?? '';
  }

  // Localized overflow text routes to the *_wrap types (see TEXT_WRAP_TYPE): the
  // RP wraps the resolved string in a box-sized label, since the key cannot be
  // pre-broken build-side. Raw overflow text is pre-wrapped at layout time instead.
  const rpWraps = isKey
    && (wordBreak === 'break-word' || overflow === 'ellipsis' || maxLines !== undefined);

  return {
    // Shadow picks the component TYPE (see TEXT_SHADOW_TYPE): all types share this
    // writer and payload; the RP routers gate them apart with the standard type gate.
    type: shadow
      ? (rpWraps ? TEXT_SHADOW_WRAP_TYPE : TEXT_SHADOW_TYPE)
      : (rpWraps ? TEXT_WRAP_TYPE : 'text'),
    props: {
      ...withControl(rest),
      // Keys pass through — we send the key, not the resolved string, so a
      // digit-leading .lang entry is guarded there; raw text uses safeLabelText.
      // The label GROUP contract (label decodes it sequentially from [1024]):
      // text, fontType, fontScale, x, y — `value` is the group's text slot (kept
      // named `value` for the key pass-through semantics; field ORDER is what the RP reads).
      value: isKey ? localizationKey : safeLabelText(resolvedText),
      fontType: labelFont.fontType,
      fontScaleFactor: labelFont.fontScaleFactor,
      labelX: offsetX ?? 0, // [1273] → label anchored X offset
      labelY: offsetY ?? 0, // [1356] → label anchored Y offset
      __textMetrics: {
        font,
        fontSize: resolvedScale,
        wordBreak,
        overflow,
        maxLines,
        // Resolved display string used by the layout phase for metrics.
        // For raw text this equals value; for keys it's the full translated string.
        resolvedText,
        // True only for localizationKey texts: props.value holds the KEY (RP
        // resolves it at render), so the layout phase must never rewrite it
        // with processed display text. Raw text (isKey false) DOES get its
        // wrapped/truncated string committed — a JSON UI label is content-sized
        // and never wraps on its own, so the `\n`s must be in the string.
        isKey,
      },
    },
  };
};

/** Serializes a `text` or `text_shadow` into the static (label) slot. */
export const textWriter: Writer = (payload, form, ctx) => {
  emitLabel(payload, form, ctx);
};
