import { describe, expect, it } from 'vitest';
import { ellipsizeText, measureText, wrapText } from '../textMetrics';

describe('measureText', () => {
  it('returns positive intrinsic dimensions', () => {
    const dims = measureText({ text: 'Hello world' });

    expect(dims.width).toBeGreaterThan(0);
    expect(dims.height).toBeGreaterThan(0);
  });

  it('ignores formatting codes in width calculations', () => {
    const plain = measureText({ text: 'Hello' });
    const colored = measureText({ text: '§aHello' });

    expect(colored.width).toBe(plain.width);
  });

  it('uses generated mojangles glyph widths', () => {
    const dims = measureText({ text: 'Hello' });

    expect(dims.width).toBe(26);
    expect(dims.height).toBe(10);
  });

  it('bold width is exactly plain width + boldOffset * charCount', () => {
    // boldOffset = 1: each char adds 1px for the bold shadow advance
    const plain = measureText({ text: 'Hi' });
    const bold = measureText({ text: '§lHi' });

    expect(bold.width).toBe(plain.width + 2); // 2 chars × 1
  });

  it('italic has the same width as normal', () => {
    const normal = measureText({ text: 'Hi' });
    const italic = measureText({ text: '§oHi' });

    expect(italic.width).toBe(normal.width);
  });

  it('bold italic has the same width as bold', () => {
    const bold = measureText({ text: '§lHi' });
    const boldItalic = measureText({ text: '§l§oHi' });

    expect(boldItalic.width).toBe(bold.width);
  });

  it('§r resets bold', () => {
    const allBold = measureText({ text: '§lHi' });
    const resetMid = measureText({ text: '§lH§ri' });

    expect(resetMid.width).toBeLessThan(allBold.width);
  });

  it('scale 2.0 doubles the width', () => {
    const scale1 = measureText({ text: 'A' });
    const scale2 = measureText({ text: 'A', fontSize: 2.0 });

    expect(scale2.width).toBe(scale1.width * 2);
  });

  it('accounts for multi-line height', () => {
    const single = measureText({ text: 'Line 1' });
    const multi = measureText({ text: 'Line 1\nLine 2\nLine 3' });

    expect(multi.height).toBeGreaterThan(single.height);
  });
});

describe('wrapText', () => {
  it('returns text unchanged when shorter than maxWidth', () => {
    // 'Hi' = 6+6 = 12px, maxWidth 100
    expect(wrapText('Hi', 100)).toBe('Hi');
  });

  it('breaks at word boundary without hyphen', () => {
    // Each word is 'AB' = 12px. maxWidth=14 fits one word, not two with space (12+5+12=29)
    const result = wrapText('AB CD', 14);

    expect(result).toBe('AB\nCD');
  });

  it('drops trailing space at end of line', () => {
    const result = wrapText('AB  CD', 14);

    expect(result).not.toMatch(/^ /m);
  });

  it('preserves a genuine leading space on unwrapped text', () => {
    // A paragraph split into independently-wrapped runs at a link boundary can
    // produce a run that legitimately starts with a word-separator space (e.g.
    // " or the " between two link runs) — that space must survive, unlike a
    // space that leads a line ONLY because a wrap just inserted a newline there.
    expect(wrapText(' or the ', 100)).toBe(' or the ');
  });

  it('inserts hyphen for mid-word break', () => {
    // 'ABCDE' = 5×6=30px. maxWidth=18: fits A,B,C (18px) then D pushes over with hyphen
    // A=6, B=6, C=6 → 18, then D=6 + hyphen=6 > 18 → break after C
    const result = wrapText('ABCDE', 18);

    expect(result).toContain('-\n');
  });

  it('bold uses wider advances', () => {
    // Normal 'AB' = 12px, bold 'AB' = 14px. maxWidth=13 fits normal but not bold
    const normal = wrapText('AB', 13);
    const bold = wrapText('§lAB', 13);

    expect(normal).toBe('AB');
    expect(bold).toContain('\n');
  });

  it('preserves formatting codes in output', () => {
    const result = wrapText('§lABCDE', 18);

    expect(result).toContain('§l');
  });

  it('scale halves the effective line width', () => {
    // At scale 2.0 the effective max is halved, same as maxWidth/2 at scale 1.0
    const s1 = wrapText('ABCD', 12);
    const s2 = wrapText('ABCD', 24, undefined, 2.0);

    expect(s1).toBe(s2);
  });

  it('wrapped text produces correct multi-line height via measureText', () => {
    const long = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const wrapped = wrapText(long, 48); // 48px fits ~8 chars per line
    const dims = measureText({ text: wrapped });

    expect(dims.height).toBeGreaterThan(10); // more than 1 line
  });
});

describe('ellipsizeText', () => {
  it('returns text unchanged when it fits', () => {
    expect(ellipsizeText('Hi', 100)).toBe('Hi');
  });

  it('truncates and appends ... when text overflows', () => {
    // 'ABCDEF' = 36px. maxWidth=18: fits A,B,C (18px), ellipsis='...' (6px) fits with AB (12+6=18)
    const result = ellipsizeText('ABCDEF', 18);

    expect(result).toMatch(/\.\.\.$/);
    expect(result.length).toBeLessThan('ABCDEF'.length + 1);
  });

  it('preserves formatting codes before the cut', () => {
    const result = ellipsizeText('§lABCDEF', 20);

    expect(result).toContain('§l');
    expect(result).toMatch(/\.\.\.$/);
  });

  it('returns full text when it barely fits with ellipsis', () => {
    // 'AB' = 12px. '...' = 6px. total = 18. If maxWidth=18 exactly, AB fits without truncation.
    expect(ellipsizeText('AB', 18)).toBe('AB');
  });

  it('does not truncate a scaled string against its own measured width', () => {
    // Regression: the guide header title '§0Guide' (minecraftTen, scale 1.2) is a
    // non-stretched leaf, so the flex fit-content cap sizes it to its own measured
    // width and re-ellipsizes at that width. measureText rounds 27 * 1.2 = 32.4 down
    // to 32; 32 / 1.2 = 26.667 < 27 dropped the last glyph → 'GUI...' in-game.
    const width = measureText({ text: '§0Guide', font: 'minecraftTen', fontSize: 1.2 }).width;

    expect(width).toBe(32);
    expect(ellipsizeText('§0Guide', width, 'minecraftTen', 1.2)).toBe('§0Guide');
  });

  it('a string always fits its own measured width across fonts and scales', () => {
    const cases: { text: string; font?: 'mojangles' | 'minecraftTen'; scale: number }[] = [
      { text: 'Guide', font: 'minecraftTen', scale: 1.2 },
      { text: 'Settings', font: 'minecraftTen', scale: 1.2 },
      { text: 'Hello world', scale: 1.0 },
      { text: 'ABCDEFG', font: 'minecraftTen', scale: 1.5 },
      { text: 'Xy', scale: 1.3 },
    ];

    for (const { text, font, scale } of cases) {
      const width = measureText({ text, font, fontSize: scale }).width;

      expect(ellipsizeText(text, width, font, scale)).toBe(text);
      expect(wrapText(text, width, font, scale)).toBe(text);
    }
  });
});
