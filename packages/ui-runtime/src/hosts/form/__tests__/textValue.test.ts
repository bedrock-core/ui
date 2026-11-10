import { describe, expect, it } from 'vitest';
import { Text } from '../../../components/Text';
import { textValue } from '../runtime';

describe('compiled live-text limits', () => {
  it.each([
    { input: '123456', limit: 4, expected: '§r1234' },
    { input: '-123456', limit: 4, expected: '§r-123' },
    { input: '1234', limit: 1, expected: '§r1' },
    { input: '1234', limit: 0, expected: '' },
    { input: 'abcdef', limit: 4, expected: 'abcd' },
    { input: '1😀x', limit: 2, expected: '§r1' },
    { input: '1😀x', limit: 3, expected: '§r1😀' },
    { input: '1😀x', limit: 4, expected: '§r1😀x' },
    { input: '😀x', limit: 1, expected: '' },
    { input: '😀x', limit: 2, expected: '😀' },
    { input: 'A😀x', limit: 2, expected: 'A' },
    { input: 'A😀x', limit: 3, expected: 'A😀' },
  ])('preserves $input with a $limit-unit literal limit', ({ input, limit, expected }) => {
    const element = Text({ children: input, maxLength: limit });

    expect(textValue(element, limit)).toBe(expected);
  });

  it('does not split a surrogate pair at a smaller carrier limit', () => {
    const element = Text({ children: 'A😀B', maxLength: 8 });

    expect(textValue(element, 2)).toBe('A');
    expect(textValue(element, 3)).toBe('A😀');
  });

  it('keeps author-supplied formatting inside the literal limit', () => {
    for (const input of ['§r123456', '§a123456']) {
      expect(textValue(Text({ children: input, maxLength: 8 }), 4)).toBe(input.slice(0, 4));
    }
  });

  it('emits nothing for a zero carrier limit, including an inserted numeric guard', () => {
    expect(textValue(Text({ children: '1234', maxLength: 4 }), 0)).toBe('');
  });

  it('preserves a numeric translation key whole', () => {
    const element = Text({ children: { translate: '123456' }, maxLength: 2 });

    expect(textValue(element, 2)).toBe('123456');
  });

  it('preserves client-resolved messages without copying or truncating them', () => {
    const element = Text({ children: { rawtext: [{ text: '1234😀' }] }, maxLength: 2 });
    const value = element.props.value as { tail: unknown };

    expect(textValue(element, 2)).toBe(value.tail);
  });
});
