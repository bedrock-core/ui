import { TextFont } from '../components/Text';
import fontMetrics from './font-metrics.generated.json';

export interface MeasureTextOptions {
  text: string;
  font?: TextFont;
  fontSize?: number;
}

interface FontMetrics {
  lineHeight: number;
  fallbackWidth: number;
  boldOffset: number;
}

interface GeneratedProfileMetrics extends FontMetrics {
  glyphWidths: Record<string, number>;
}

const BASE_METRICS: Record<TextFont, GeneratedProfileMetrics> = fontMetrics.profiles;

function normalizeFont(font?: TextFont): TextFont {
  return font ?? 'mojangles';
}

function isColorCode(code: string): boolean {
  return /^[0-9a-f]$/i.test(code);
}

function baseGlyphWidth(codePoint: number, profile: TextFont): number {
  const metrics = BASE_METRICS[profile];
  const width = metrics.glyphWidths[String(codePoint)];

  return width ?? metrics.fallbackWidth;
}

/**
 * Approximate intrinsic text dimensions for Bedrock UI labels.
 * Formatting sequences (e.g. §a, §l) are treated as zero-width control codes.
 */
export function measureText({
  text,
  font,
  fontSize = 1.0,
}: MeasureTextOptions): { width: number; height: number } {
  const profile = normalizeFont(font);
  const metrics = BASE_METRICS[profile];

  let lineWidth = 0;
  let maxLineWidth = 0;
  let lineCount = 1;
  let bold = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];

    if (ch === '\n') {
      maxLineWidth = Math.max(maxLineWidth, lineWidth);
      lineWidth = 0;
      lineCount++;
      continue;
    }

    if (ch === '§' && i + 1 < text.length) {
      const code = text[i + 1].toLowerCase();

      // Skip code character.
      i++;

      if (isColorCode(code) || code === 'r') {
        bold = false;
      } else if (code === 'l') {
        bold = true;
      }

      continue;
    }

    const codePoint = text.codePointAt(i);

    if (codePoint === undefined) {
      continue;
    }

    if (codePoint > 0xffff) {
      i++;
    }

    let advance = baseGlyphWidth(codePoint, profile);

    if (bold) {
      advance += metrics.boldOffset;
    }

    lineWidth += advance;
  }

  maxLineWidth = Math.max(maxLineWidth, lineWidth);

  return {
    width: Math.max(1, Math.round(maxLineWidth * fontSize)),
    height: Math.max(1, Math.round(metrics.lineHeight * lineCount * fontSize)),
  };
}
