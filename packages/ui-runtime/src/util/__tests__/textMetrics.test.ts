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

  it('uses generated minecraft-ten glyph widths', () => {
    const dims = measureText({ text: 'WIDE TEXT', font: 'minecraft-ten' });

    expect(dims.width).toBe(42);
    expect(dims.height).toBe(9);
  });

  it('applies bold formatting as wider glyph advances', () => {
    const plain = measureText({ text: 'Title' });
    const bold = measureText({ text: '§lTitle§r' });

    expect(bold.width).toBeGreaterThan(plain.width);
  });

  it('accounts for multi-line height', () => {
    const single = measureText({ text: 'Line 1' });
    const multi = measureText({ text: 'Line 1\nLine 2\nLine 3' });

    expect(multi.height).toBeGreaterThan(single.height);
  });
});
