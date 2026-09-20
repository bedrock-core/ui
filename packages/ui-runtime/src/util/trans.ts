import type { TextFont } from '../components/Text';
import { lineRanges, measureText, type LineRange } from './textMetrics';

/**
 * Breaking a translated text into lines and pieces, in every language at once.
 *
 * A compiled screen has one layout, and a client draws each key in its own
 * language. So text whose tags make parts of it pressable or styled is split by
 * the build into lines it breaks itself, and each line into pieces — a stretch
 * inside the same tags — whose strings differ per language. The client packs a
 * line's pieces at the widths it draws them, so a press sized to its piece
 * covers exactly that text in whichever language is shown.
 *
 * Every language gets the same number of lines, the most any of them needs: a
 * line takes its height even when nothing is drawn in it, so a language needing
 * fewer spreads its last lines over the rest instead of leaving blank ones.
 */

/** One piece of a line: the components it sits inside, outermost first, and its string in every language. */
export interface TransPiece {
  readonly chain: readonly string[];
  readonly values: Readonly<Record<string, string>>;
}

/** A translated text split for every language: its lines of pieces. */
export interface TransLayout {
  readonly lines: readonly (readonly TransPiece[])[];
}

/** Why a translated text cannot be split, in the words its author needs. */
export class TransError extends Error {
  override name = 'TransError';
}

/**
 * What a language puts in a piece it does not use: a formatting code, which
 * draws nothing and takes no width. A blank value would draw its key instead.
 */
export const EMPTY_PIECE = '§r';

/** Tags i18next keeps without a component: a line break, bold and italic. */
const BUILT_IN_STYLES: Readonly<Record<string, string>> = { strong: '§l', i: '§o' };

/** `<name>`, `</name>` or `<name/>`. */
const TAG = /<(\/?)([A-Za-z0-9_]+)\s*(\/?)>/g;

/** A placeholder a value is filled with when it is shown: a translated text is baked, so it has none. */
const PLACEHOLDER = /%(\d+\$)?[sd]/;

/** A stretch of a language's text inside the same components. */
interface Run {
  readonly chain: readonly string[];
  readonly from: number;
  readonly to: number;
}

/** A language's text with its tags taken out: the styled string, and the stretches each chain of components covers. */
export interface ParsedTrans {
  readonly text: string;
  readonly runs: readonly Run[];
}

/** Every formatting code in effect at `index`: those since the last reset, which a piece starting there has to repeat. */
function activeCodes(text: string, index: number): string {
  let codes = '';

  for (const match of text.slice(0, index).matchAll(/§(.)/g)) {
    codes = match[1]?.toLowerCase() === 'r' ? '' : `${codes}${match[0]}`;
  }

  return codes;
}

/** Whether a stretch of styled text draws anything. */
const draws = (text: string): boolean => text.replace(/§./g, '') !== '';

/**
 * A language's text with its tags taken out.
 *
 * A tag is a name `components` has, or one of the built-ins; anything else in
 * angle brackets is text. `<br/>` breaks the line, `<strong>` and `<i>` bold
 * and italicize, and a component's tags mark what it wraps.
 *
 * @param value - The text as written, tags and all.
 * @param names - The names `components` gives.
 * @param where - What the text is, for an error to name.
 */
export function parseTrans(value: string, names: ReadonlySet<string>, where: string): ParsedTrans {
  if (PLACEHOLDER.test(value)) {
    throw new TransError(`${where} holds a placeholder: a translated text is composed at build, so it cannot take values.`);
  }

  let text = '';
  const runs: Run[] = [];
  const chain: string[] = [];
  const styles: { name: string; restore: string }[] = [];

  const append = (part: string): void => {
    if (part === '') {
      return;
    }

    const last = runs.at(-1);

    if (last !== undefined && last.to === text.length && last.chain.join('>') === chain.join('>')) {
      runs[runs.length - 1] = { ...last, to: text.length + part.length };
    } else {
      runs.push({ chain: [...chain], from: text.length, to: text.length + part.length });
    }

    text += part;
  };

  let at = 0;

  for (const match of value.matchAll(TAG)) {
    const [whole, closing, name = '', selfClosing] = match;
    const index = match.index;
    const style = BUILT_IN_STYLES[name];
    const known = names.has(name) || name === 'br' || style !== undefined;

    append(value.slice(at, index));
    at = index + whole.length;

    if (!known) {
      append(whole);
      continue;
    }

    if (selfClosing === '/') {
      if (name === 'br') {
        append('\n');
        continue;
      }

      throw new TransError(`${where}: <${name}/> draws nothing to wrap, and a component standing alone in a line is not supported.`);
    }

    if (closing === '/') {
      if (style !== undefined) {
        const open = styles.pop();

        if (open?.name !== name) {
          throw new TransError(`${where}: </${name}> closes a tag that is not open.`);
        }

        append(`§r${open.restore}`);
      } else {
        if (chain.at(-1) !== name) {
          throw new TransError(`${where}: </${name}> closes a tag that is not open.`);
        }

        chain.pop();
      }

      continue;
    }

    if (style !== undefined) {
      styles.push({ name, restore: activeCodes(text, text.length) });
      append(style);
    } else if (name !== 'br') {
      chain.push(name);
    }
  }

  append(value.slice(at));

  const open = [...chain, ...styles.map(style => style.name)];

  if (open.length > 0) {
    throw new TransError(`${where}: <${open.join('>, <')}> is never closed.`);
  }

  return { text, runs };
}

/** The lines `text[from..]` wraps into at `width`, as ranges of `text`. */
function wrapFrom(text: string, from: number, width: number, font: TextFont | undefined, scale: number): LineRange[] {
  const codes = activeCodes(text, from);
  const shift = from - codes.length;

  return lineRanges(codes + text.slice(from), width, font, scale).map(({ start, end }) => ({
    start: Math.max(from, start + shift),
    end: Math.max(from, end + shift),
  }));
}

/** The widest word of `text[from..]`: the narrowest a wrap can go without breaking one. */
function widestWord(text: string, from: number, font: TextFont | undefined, scale: number): number {
  let widest = 0;
  let start = from;

  for (let i = from; i <= text.length; i += 1) {
    if (i === text.length || text[i] === ' ' || text[i] === '\n') {
      if (i > start) {
        widest = Math.max(widest, measureText({ text: activeCodes(text, start) + text.slice(start, i), font, fontSize: scale }).width);
      }

      start = i + 1;
    }
  }

  return widest;
}

/**
 * `lines` rebroken so they number `target`: the fewest last lines are wrapped
 * narrower until they fill the lines missing, so the lines above stay as full
 * as the width allows. Keeps the closest it gets when no narrowing lands on the
 * count exactly.
 */
function spread(text: string, lines: readonly LineRange[], target: number, width: number, font: TextFont | undefined, scale: number): readonly LineRange[] {
  const count = lines.length;
  let closest = lines;

  for (let last = 1; last <= count; last += 1) {
    const from = lines[count - last]?.start ?? 0;
    const want = last + (target - count);
    let low = Math.min(width, Math.max(1, widestWord(text, from, font, scale)));
    let high = width;

    // The narrowest width that still fits in `want` lines: every line as short as it can be.
    while (low < high) {
      const middle = Math.floor((low + high) / 2);

      if (wrapFrom(text, from, middle, font, scale).length <= want) {
        high = middle;
      } else {
        low = middle + 1;
      }
    }

    const rebroken = [...lines.slice(0, count - last), ...wrapFrom(text, from, low, font, scale)];

    if (rebroken.length === target) {
      return rebroken;
    }

    if (rebroken.length > closest.length && rebroken.length < target) {
      closest = rebroken;
    }
  }

  return closest;
}

/** A line with the spaces at its ends dropped, and whether it was broken inside a word. */
function trimmed(text: string, lines: readonly LineRange[], index: number): { start: number; end: number; hyphen: boolean } {
  const line = lines[index] ?? { start: 0, end: 0 };
  const next = lines[index + 1];
  // Broken inside a word: the next line starts where this one ends, with no space on either side of the break.
  const hyphen = next !== undefined && next.start === line.end && line.end < text.length
    && text[line.end] !== ' ' && text[line.end - 1] !== ' ' && text[line.end] !== '\n';
  let { start, end } = line;

  while (start < end && text[start] === ' ') {
    start += 1;
  }

  while (end > start && (text[end - 1] === ' ' || text[end - 1] === '\n')) {
    end -= 1;
  }

  return { start, end, hyphen };
}

/** A line of one language as the runs it cuts across, each still drawing something. */
function runsOn(line: { start: number; end: number }, parsed: ParsedTrans): Run[] {
  return parsed.runs.flatMap((run) => {
    const from = Math.max(run.from, line.start);
    const to = Math.min(run.to, line.end);

    return from < to && draws(parsed.text.slice(from, to)) ? [{ chain: run.chain, from, to }] : [];
  });
}

/**
 * The shortest sequence both `a` and `b` are in order within: the pieces a line
 * needs so that every language's stretches keep their own order, when two
 * languages put the same components in a different one.
 */
function supersequence(a: readonly string[], b: readonly string[]): string[] {
  const common: number[][] = Array.from({ length: a.length + 1 }, () => new Array<number>(b.length + 1).fill(0));

  for (let i = a.length - 1; i >= 0; i -= 1) {
    for (let j = b.length - 1; j >= 0; j -= 1) {
      common[i][j] = a[i] === b[j] ? common[i + 1][j + 1] + 1 : Math.max(common[i + 1][j], common[i][j + 1]);
    }
  }

  const merged: string[] = [];
  let i = 0;
  let j = 0;

  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      merged.push(a[i]);
      i += 1;
      j += 1;
    } else if (common[i + 1][j] >= common[i][j + 1]) {
      merged.push(a[i]);
      i += 1;
    } else {
      merged.push(b[j]);
      j += 1;
    }
  }

  return [...merged, ...a.slice(i), ...b.slice(j)];
}

/**
 * Splits a translated text for every language it is given in.
 *
 * @param translations - The text in each language, by locale, tags and all.
 * @param names - The names `components` gives.
 * @param width - The width every line has to fit.
 * @param font - The font the pieces draw in.
 * @param scale - The scale the pieces draw at.
 * @param where - What the text is, for an error to name.
 */
export function splitTrans(
  translations: Readonly<Record<string, string>>,
  names: ReadonlySet<string>,
  width: number,
  font?: TextFont,
  scale = 1,
  where = 'a translated text',
): TransLayout {
  const locales = Object.keys(translations);
  const parsed = new Map(locales.map(locale => [locale, parseTrans(translations[locale] ?? '', names, `${where} in ${locale}`)] as const));
  const wrapped = new Map(locales.map(locale => [locale, lineRanges(parsed.get(locale)?.text ?? '', width, font, scale)] as const));
  const target = Math.max(1, ...[...wrapped.values()].map(lines => lines.length));
  const broken = new Map(locales.map((locale) => {
    const text = parsed.get(locale)?.text ?? '';

    return [locale, spread(text, wrapped.get(locale) ?? [], target, width, font, scale)] as const;
  }));
  const lines: TransPiece[][] = [];

  for (let index = 0; index < target; index += 1) {
    const cut = locales.map((locale) => {
      const language = parsed.get(locale) ?? { text: '', runs: [] };
      const ranges = broken.get(locale) ?? [];

      if (index >= ranges.length) {
        return { locale, text: language.text, hyphen: false, runs: [] as Run[] };
      }

      const line = trimmed(language.text, ranges, index);

      return { locale, text: language.text, hyphen: line.hyphen, runs: runsOn(line, language) };
    });

    // The pieces this line needs: every language's stretches, in each language's own order.
    const order = cut.reduce<string[]>((merged, { runs }) => supersequence(merged, runs.map(run => run.chain.join('>'))), []);
    const values = order.map((): Record<string, string> => ({}));

    for (const { locale, text, hyphen, runs } of cut) {
      let slot = 0;

      for (const [at, run] of runs.entries()) {
        const key = run.chain.join('>');

        while (slot < order.length && order[slot] !== key) {
          slot += 1;
        }

        // Codes closing a piece style nothing after them: the next piece repeats what it needs.
        const own = text.slice(run.from, run.to).replace(/(§.)+$/, '');
        // A piece that opens with a reset starts from nothing, so the codes before it would be undone at once.
        const piece = (own.startsWith('§r') ? '' : activeCodes(text, run.from)) + own + (hyphen && at === runs.length - 1 ? '-' : '');
        const into = values[slot];

        if (into !== undefined) {
          into[locale] = `${into[locale] ?? ''}${piece}`;
        }

        slot += 1;
      }
    }

    lines.push(order.map((key, slot) => ({
      chain: key === '' ? [] : key.split('>'),
      values: Object.fromEntries(locales.map(locale => [locale, values[slot]?.[locale] ?? EMPTY_PIECE])),
    })));
  }

  return { lines };
}
