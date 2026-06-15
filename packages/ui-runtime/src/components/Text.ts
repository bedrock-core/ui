import { useContext } from '../hooks';
import { FunctionComponent, JSX } from '../jsx';
import { TranslationKeysContext } from '../data/TranslationKeys';
import { TranslationKeysError, type Writer } from '../core/types';
import { emitLabel } from '../core/writers';
import { ControlProps, withControl } from './control';

export type TextFont = 'mojangles' | 'minecraftTen';

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
   * Requires the `translation-keys` Regolith filter: the key must exist in
   * your pack's .lang files so the filter can resolve it, and the generated
   * keys must be provided at the root of the UI via `TranslationKeysContext`:
   *
   * ```tsx
   * import translationKeys from '@bedrock-core/generated/translation-keys';
   *
   * <TranslationKeysContext value={translationKeys}>
   *   <MyScreen />
   * </TranslationKeysContext>
   * ```
   *
   * Without the filter and provider, rendering throws a `TranslationKeysError`.
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
}

const FONT_TYPE_MAP: Record<TextFont, string> = {
  mojangles: 'default',
  minecraftTen: 'MinecraftTen',
};

// font_size: small is hardcoded in text.json (0.5× base render).
// All metric calculations must account for this factor.
const FONT_SIZE_BASE = 0.5;

/**
 * Make raw text safe to render as a Bedrock JSON UI label. JSON UI feeds a
 * label's `text` through a numeric string-format path, so a value that starts
 * with a digit (or a leading `-`) renders blank or garbled. Prefixing a
 * zero-width `§r` shifts the leading character off the digit without changing
 * what's shown — the section code is consumed by the renderer and the text
 * metrics already treat `§x` as zero-width, so width/layout are unaffected.
 */
function safeLabelText(text: string): string {
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
  ...rest
}: TextProps): JSX.Element => {
  const resolvedScale = scale ?? 1.0;
  const isKey = localizationKey !== undefined;

  let resolvedText: string;

  if (isKey) {
    const translationKeys = useContext(TranslationKeysContext);

    if (translationKeys === null) {
      throw new TranslationKeysError(
        `localizationKey requires translation keys, but no TranslationKeysContext is provided. `
        + `Install the 'translation-keys' Regolith filter, then wrap your UI root: `
        + `import translationKeys from '@bedrock-core/generated/translation-keys'; `
        + `<TranslationKeysContext value={translationKeys}>...</TranslationKeysContext>`,
      );
    }

    if (!(localizationKey in translationKeys)) {
      throw new TranslationKeysError(
        `Cannot calculate layout for localizationKey "${localizationKey}" — no resolved string found. `
        + `Run the 'translation-keys' Regolith filter and verify the key exists in your .lang files.`,
      );
    }

    resolvedText = translationKeys[localizationKey];
  } else {
    resolvedText = children ?? '';
  }

  return {
    type: 'text',
    props: {
      ...withControl(rest),
      // Keys pass through — we send the key, not the resolved string, so a
      // digit-leading .lang entry is guarded there; raw text uses safeLabelText.
      value: isKey ? localizationKey : safeLabelText(resolvedText),
      fontType: FONT_TYPE_MAP[font ?? 'mojangles'],
      fontScaleFactor: resolvedScale / FONT_SIZE_BASE,
      __textMetrics: {
        font,
        fontSize: resolvedScale,
        wordBreak,
        overflow,
        maxLines,
        // Resolved display string used by the layout phase for metrics.
        // For raw text this equals value; for keys it's the full translated string.
        resolvedText,
      },
    },
  };
};

/** Serializes a `text` into the static (label) slot. */
export const textWriter: Writer = (payload, form) => {
  emitLabel(payload, form);
};
