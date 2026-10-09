import { describe, expect, it } from 'vitest';
import { fitCaption } from '../fitCaption';

describe('bounded captions', () => {
  it('leaves fitting text intact and replaces the overflow with an ellipsis', () => {
    expect(fitCaption('ABC', 18, 'mojangles', 1)).toBe('ABC');
    expect(fitCaption('ABCDEF', 18, 'mojangles', 1)).toBe('AB...');
  });

  it('draws nothing when even an ellipsis cannot fit', () => {
    for (const width of [0, 1, 5]) {
      expect(fitCaption('ABC', width, 'mojangles', 1)).toBe('');
    }
  });

  it('draws one line and keeps zero-width formatting with the caption', () => {
    expect(fitCaption('ABC\nDEF', 100, 'mojangles', 1)).toBe('ABC');
    expect(fitCaption('§0ABCDEF', 18, 'mojangles', 1)).toBe('§0AB...');
  });
});
