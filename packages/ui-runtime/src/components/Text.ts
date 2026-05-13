import { useContext } from '../hooks';
import { FunctionComponent, JSX } from '../jsx';
import { TranslationKeysContext } from '../data/TranslationKeysContext';
import { TranslationKeysError } from '../core/types';
import { ControlProps, withControl } from './control';

export type TextFont = 'mojangles';

export type TextWordBreak = 'normal' | 'break-word';
export type TextOverflow = 'ellipsis';

export interface TextStyle {
  font?: TextFont;
}

export interface TextProps extends ControlProps {
  font?: TextFont;

  /**
   * Upward scale multiplier for rendered glyph size (≥ 1.0).
   * Maps to JSON UI font_scale_factor. Values below 1.0 are clamped to 1.0.
   */
  scale?: number;

  /**
   * Raw text content to display. Max 80 UTF-8 bytes.
   * For longer strings, use `localizationKey` instead.
   */
  children?: string;

  /**
   * Minecraft translation key (e.g. `"ui.myscreen.title"`).
   * The key must exist in your pack's .lang files and in the generated
   * `translationKeys.generated.json`. Requires `TranslationKeysContext`
   * to be provided at the root of the UI.
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
}

const FONT_TYPE_MAP: Record<TextFont, string> = {
  mojangles: 'default',
};

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
  const clampedScale = Math.max(1.0, scale ?? 1.0);
  const isKey = localizationKey !== undefined;

  let resolvedText: string;

  if (isKey) {
    const translationKeys = useContext(TranslationKeysContext);

    if (translationKeys === null) {
      throw new TranslationKeysError(
        `TranslationKeysContext is not provided. Did you forget to install the 'translation-keys' Regolith filter `
        + `and wrap your UI in <TranslationKeysContext value={translationKeys}>?`,
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
      value: isKey ? localizationKey : resolvedText,
      fontType: FONT_TYPE_MAP[font ?? 'mojangles'],
      fontScaleFactor: clampedScale,
      __textMetrics: {
        font,
        fontSize: clampedScale,
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
