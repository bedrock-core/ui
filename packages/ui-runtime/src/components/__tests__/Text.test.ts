import { describe, expect, it } from 'vitest';
import { Text } from '../Text';

// Outside an active fiber the resolver is null (useTranslationResolver's
// plain-function fallback), so string children paint literally and the node
// can be inspected directly. These lock in the JSON UI leading-digit guard
// that Text applies to literal labels (v0008: the value rides the payload tail).

describe('Text — JSON UI label safety', () => {
  it('prefixes a zero-width §r when the text starts with a digit', () => {
    expect(Text({ children: '50' }).props.value).toEqual({ tail: '§r50' });
  });

  it('prefixes negative numbers (leading -) too', () => {
    expect(Text({ children: '-5' }).props.value).toEqual({ tail: '§r-5' });
  });

  it('leaves letter-leading text untouched', () => {
    expect(Text({ children: 'Hello' }).props.value).toEqual({ tail: 'Hello' });
  });

  it('leaves text already starting with a § code untouched', () => {
    expect(Text({ children: '§a50' }).props.value).toEqual({ tail: '§a50' });
  });

  it('leaves the empty string untouched', () => {
    expect(Text({ children: '' }).props.value).toEqual({ tail: '' });
  });
});
