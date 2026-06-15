import { describe, expect, it } from 'vitest';
import { Text } from '../Text';

// The non-key Text path is pure (no hooks), so the resolved node can be
// inspected directly. These lock in the JSON UI leading-digit guard that Text
// applies to every label it emits.

describe('Text — JSON UI label safety', () => {
  it('prefixes a zero-width §r when the text starts with a digit', () => {
    expect(Text({ children: '50' }).props.value).toBe('§r50');
  });

  it('prefixes negative numbers (leading -) too', () => {
    expect(Text({ children: '-5' }).props.value).toBe('§r-5');
  });

  it('leaves letter-leading text untouched', () => {
    expect(Text({ children: 'Hello' }).props.value).toBe('Hello');
  });

  it('leaves text already starting with a § code untouched', () => {
    expect(Text({ children: '§a50' }).props.value).toBe('§a50');
  });

  it('leaves the empty string untouched', () => {
    expect(Text({ children: '' }).props.value).toBe('');
  });
});
