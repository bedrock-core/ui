import { describe, expect, it } from 'vitest';
import { measureText } from '../textMetrics';

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
