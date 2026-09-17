import { describe, expect, it } from 'vitest';
import { EMPTY_PIECE, parseTrans, splitTrans, TransError } from '../trans';
import { measureText } from '../textMetrics';

/** Every language's string of each piece of a line, as `[chain, ...values]` rows. */
const rows = (line: readonly { chain: readonly string[]; values: Readonly<Record<string, string>> }[], locales: readonly string[]): unknown[][] =>
  line.map(piece => [piece.chain.join('>'), ...locales.map(locale => piece.values[locale])]);

describe('parseTrans', () => {
  it('takes the tags out and records what each one wraps', () => {
    const { text, runs } = parseTrans('See <shop>the shop</shop> now', new Set(['shop']), 'test');

    expect(text).toBe('See the shop now');
    expect(runs.map(run => [run.chain.join('>'), text.slice(run.from, run.to)])).toEqual([
      ['', 'See '],
      ['shop', 'the shop'],
      ['', ' now'],
    ]);
  });

  it('keeps the tags i18next keeps: a line break, bold and italic', () => {
    expect(parseTrans('a<br/>b <strong>c</strong> <i>d</i>', new Set(), 'test').text).toBe('a\nb §lc§r §od§r');
  });

  it('restores the codes around a bold span when it closes', () => {
    expect(parseTrans('§9a <strong>b</strong> c', new Set(), 'test').text).toBe('§9a §lb§r§9 c');
  });

  it('reads a name no component has as text', () => {
    expect(parseTrans('use <Text> here', new Set(['shop']), 'test').text).toBe('use <Text> here');
  });

  it('refuses a tag left open, one closed out of order, and a placeholder', () => {
    expect(() => parseTrans('<a>open', new Set(['a']), 'test')).toThrow(TransError);
    expect(() => parseTrans('<a><b>x</a></b>', new Set(['a', 'b']), 'test')).toThrow(TransError);
    expect(() => parseTrans('you have %1$s', new Set(), 'test')).toThrow(/placeholder/);
  });
});

describe('splitTrans', () => {
  it('keeps a text that fits as one piece', () => {
    const { lines } = splitTrans({ en_US: 'short words' }, new Set(), 200);

    expect(lines.map(line => rows(line, ['en_US']))).toEqual([[['', 'short words']]]);
  });

  it('cuts a line where a component begins and ends, each piece carrying its codes', () => {
    const { lines } = splitTrans({ en_US: 'see §9<shop>the page</shop>§r now' }, new Set(['shop']), 400);

    expect(lines.map(line => rows(line, ['en_US']))).toEqual([[
      ['', 'see '],
      ['shop', '§9the page'],
      ['', '§r now'],
    ]]);
  });

  it('breaks every language into the same number of lines, the shorter one spread rather than left blank', () => {
    const width = measureText({ text: 'aaaa aaaa' }).width;
    const { lines } = splitTrans({ en_US: 'aaaa aaaa aaaa', es_ES: 'aaaa aaaa aaaa aaaa aaaa' }, new Set(), width);

    expect(lines).toHaveLength(3);
    expect(lines.every(line => line.some(piece => piece.values.en_US !== EMPTY_PIECE))).toBe(true);
  });

  it('fills a piece a language does not draw on that line with a code, never a blank', () => {
    const width = measureText({ text: 'aaaa aaaa' }).width;
    const { lines } = splitTrans({ en_US: '<a>link</a> aaaa aaaa', es_ES: 'aaaa aaaa <a>link</a>' }, new Set(['a']), width);

    expect(lines.flat().every(piece => Object.values(piece.values).every(value => value !== ''))).toBe(true);
    expect(lines[0]?.find(piece => piece.chain.join('>') === 'a')?.values).toEqual({ en_US: 'link', es_ES: EMPTY_PIECE });
  });

  it('lets a language put its components in another order on the same line', () => {
    const { lines } = splitTrans({ en_US: '<a>A</a> and <b>B</b>', es_ES: '<b>B</b> y <a>A</a>' }, new Set(['a', 'b']), 400);
    const [line = []] = lines;
    const drawn = (locale: string): string[] => line.flatMap(piece => (piece.values[locale] === EMPTY_PIECE ? [] : [`${piece.chain.join('>')}:${piece.values[locale]}`]));

    expect(drawn('en_US')).toEqual(['a:A', ': and ', 'b:B']);
    expect(drawn('es_ES')).toEqual(['b:B', ': y ', 'a:A']);
  });

  it('keeps a style inside a press as one chain', () => {
    const { lines } = splitTrans({ en_US: '<shop><gold>gold</gold> shop</shop>' }, new Set(['shop', 'gold']), 400);

    expect(lines.map(line => rows(line, ['en_US']))).toEqual([[['shop>gold', 'gold'], ['shop', ' shop']]]);
  });

  it('repeats the codes in effect at the start of a line that continues a styled span', () => {
    const width = measureText({ text: '§laaaa aaaa' }).width;
    const { lines } = splitTrans({ en_US: '§laaaa aaaa aaaa§r' }, new Set(), width);

    expect(lines).toHaveLength(2);
    expect(lines[1]?.[0]?.values.en_US.startsWith('§l')).toBe(true);
  });

  it('hyphenates only a word broken across lines, never a line broken at a space', () => {
    // Room for the space after the second word, and not for the word after it: the wrap keeps the space on the line.
    const width = measureText({ text: 'aaaa aaaa ' }).width + 1;
    const spaced = splitTrans({ en_US: 'aaaa aaaa aaaa' }, new Set(), width);
    const long = splitTrans({ en_US: 'a'.repeat(40) }, new Set(), width);

    expect(spaced.lines.flat().some(piece => piece.values.en_US.endsWith('-'))).toBe(false);
    expect(long.lines[0]?.at(-1)?.values.en_US.endsWith('-')).toBe(true);
  });

  it('breaks a line where the text says <br/>', () => {
    expect(splitTrans({ en_US: 'one<br/>two' }, new Set(), 400).lines.map(line => rows(line, ['en_US']))).toEqual([[['', 'one']], [['', 'two']]]);
  });
});
