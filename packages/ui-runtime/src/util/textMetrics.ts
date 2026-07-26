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

type ProfileName = 'mojangles' | 'minecraftTen';

interface GeneratedFontMetrics {
  generatedAt: string;
  aliases: Record<string, ProfileName>;
  profiles: Record<ProfileName, GeneratedProfileMetrics>;
}
// eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion
const typedFontMetrics = fontMetrics as unknown as GeneratedFontMetrics;

const BASE_METRICS = typedFontMetrics.profiles;
const FONT_ALIASES = typedFontMetrics.aliases;

function isProfileName(name: string): name is ProfileName {
  return name in BASE_METRICS;
}

function normalizeFont(font?: TextFont): ProfileName {
  const name: string = font ?? 'mojangles';

  if (isProfileName(name)) { return name; }

  return FONT_ALIASES[name] ?? 'mojangles';
}

function isColorCode(code: string): boolean {
  return /^[0-9a-f]$/i.test(code);
}

/**
 * Fit tolerance (scaled px) for `wrapText`/`ellipsizeText` budget comparisons.
 *
 * `measureText` reports a width of `round(unscaledWidth * fontSize)`, so a text
 * leaf sized to its own intrinsic width can be re-measured against that rounded
 * budget (the flex fit-content cap does exactly this for a non-stretched leaf).
 * Dividing the budget straight back — `round(W * s) / s` — can come out below the
 * true unscaled width `W` (when `W * s` rounded down), which would drop the last
 * glyph even though the string is measured to fit. A half-pixel of slack makes a
 * string always fit its own measured width without letting content visibly spill.
 */
const FIT_TOLERANCE = 0.5;

function baseGlyphWidth(codePoint: number, profile: ProfileName): number {
  const metrics = BASE_METRICS[profile];
  const width = metrics.glyphWidths[String(codePoint)];

  return width ?? metrics.fallbackWidth;
}

/**
 * Truncates text to fit within maxWidth pixels, appending '...' when cut.
 * Operates on a single line (no \n handling).
 */
export function ellipsizeText(
  text: string,
  maxWidth: number,
  font?: TextFont,
  fontSize = 1.0,
): string {
  const profile = normalizeFont(font);
  const metrics = BASE_METRICS[profile];
  const scaledMax = (maxWidth + FIT_TOLERANCE) / fontSize;
  const ELLIPSIS = '...';

  // Measure ellipsis width (unscaled)
  let ellipsisWidth = 0;
  const eBold = false;

  for (let i = 0; i < ELLIPSIS.length; i++) {
    const cp = ELLIPSIS.codePointAt(i)!;
    const w = baseGlyphWidth(cp, profile);

    ellipsisWidth += eBold ? w + metrics.boldOffset : w;
  }

  let lineWidth = 0;
  let bold = false;
  let visibleEnd = 0; // byte index where we last fit without ellipsis

  for (let i = 0; i < text.length;) {
    const ch = text[i];

    if (ch === '§' && i + 1 < text.length) {
      const lower = text[i + 1].toLowerCase();

      if (isColorCode(lower) || lower === 'r') {
        bold = false;
      } else if (lower === 'l') {
        bold = true;
      }

      i += 2;
      continue;
    }

    const cp = text.codePointAt(i)!;
    const adv = baseGlyphWidth(cp, profile) + (bold ? metrics.boldOffset : 0);

    if (lineWidth + adv > scaledMax) {
      // Doesn't fit — check if we can fit the ellipsis at visibleEnd
      return text.slice(0, visibleEnd) + ELLIPSIS;
    }

    if (lineWidth + adv + ellipsisWidth <= scaledMax) {
      visibleEnd = i + (cp > 0xffff ? 2 : 1);
    }

    lineWidth += adv;
    i += cp > 0xffff ? 2 : 1;
  }

  return text; // fits without truncation
}

/**
 * Pre-breaks text so it fits within maxWidth pixels, inserting `\n` at word
 * boundaries and `-\n` mid-word when a single word exceeds the line width.
 * Works in unscaled units (scaledMax = maxWidth / fontSize).
 */
export function wrapText(
  text: string,
  maxWidth: number,
  font?: TextFont,
  fontSize = 1.0,
): string {
  const profile = normalizeFont(font);
  const metrics = BASE_METRICS[profile];
  const scaledMax = (maxWidth + FIT_TOLERANCE) / fontSize;

  let result = '';
  let lineWidth = 0;
  let bold = false;

  type Token = { ch: string; advance: number };
  const pending: Token[] = [];
  let pendingWidth = 0;

  function glyphAdv(cp: number): number {
    const w = baseGlyphWidth(cp, profile);

    return bold ? w + metrics.boldOffset : w;
  }

  function flushPending(): void {
    if (pending.length === 0) {
      return;
    }

    if (lineWidth + pendingWidth <= scaledMax) {
      for (const t of pending) {
        result += t.ch;
      }

      lineWidth += pendingWidth;
    } else if (pendingWidth <= scaledMax) {
      result += '\n';
      lineWidth = 0;

      for (const t of pending) {
        result += t.ch;
      }

      lineWidth += pendingWidth;
    } else {
      // Word longer than full line — hyphenate character by character
      const hypAdv = glyphAdv(45); // '-'

      for (const { ch, advance } of pending) {
        if (advance === 0) {
          result += ch;
          continue;
        }

        if (lineWidth + advance + hypAdv > scaledMax && lineWidth > 0) {
          result += '-\n';
          lineWidth = 0;
        }

        result += ch;
        lineWidth += advance;
      }
    }

    pending.length = 0;
    pendingWidth = 0;
  }

  let i = 0;

  while (i < text.length) {
    const ch = text[i];

    if (ch === '\n') {
      flushPending();
      result += '\n';
      lineWidth = 0;
      i++;
      continue;
    }

    if (ch === '§' && i + 1 < text.length) {
      const code = text[i + 1];
      const lower = code.toLowerCase();

      if (isColorCode(lower) || lower === 'r') {
        bold = false;
      } else if (lower === 'l') {
        bold = true;
      }

      pending.push({ ch: '§' + code, advance: 0 });
      i += 2;
      continue;
    }

    if (ch === ' ') {
      flushPending();
      const spaceAdv = glyphAdv(32);

      if (lineWidth === 0 && result.endsWith('\n')) {
        // skip a leading space on a line that JUST wrapped — but not a
        // leading space on the untouched input (e.g. a paragraph split into
        // independently-wrapped runs at a link boundary: a run genuinely
        // starting with " " is a real word-separator, not wrap indentation).
      } else if (lineWidth + spaceAdv <= scaledMax) {
        result += ' ';
        lineWidth += spaceAdv;
      } else {
        result += '\n';
        lineWidth = 0;
      }

      i++;
      continue;
    }

    const cp = text.codePointAt(i)!;
    const adv = glyphAdv(cp);
    const charStr = cp > 0xffff ? text.slice(i, i + 2) : ch;

    pending.push({ ch: charStr, advance: adv });
    pendingWidth += adv;
    i += cp > 0xffff ? 2 : 1;
  }

  flushPending();

  return result;
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
