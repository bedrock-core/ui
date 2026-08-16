import { describe, expect, it } from 'vitest';

import { interpolate, toPositional } from '../interpolate';

describe('interpolate', () => {
  it('fills named markers from a record', () => {
    expect(interpolate('You bought {{item}} for {{ price }}.', { item: 'Apple', price: 5 }))
      .toBe('You bought Apple for 5.');
  });

  it('leaves unknown markers intact', () => {
    expect(interpolate('{{known}} {{unknown}}', { known: 'x' })).toBe('x {{unknown}}');
  });

  it('fills indexed positional slots from an array', () => {
    expect(interpolate('%2$s then %1$s', ['a', 'b'])).toBe('b then a');
  });

  it('fills bare %s slots in appearance order', () => {
    expect(interpolate('%s and %s', ['a', 'b'])).toBe('a and b');
  });

  it('leaves out-of-range slots intact', () => {
    expect(interpolate('%1$s %3$s', ['a'])).toBe('a %3$s');
  });

  it('returns the template untouched without arguments', () => {
    expect(interpolate('plain {{x}}')).toBe('plain {{x}}');
  });
});

describe('toPositional', () => {
  it('maps every occurrence to its recorded slot', () => {
    expect(toPositional('{{a}}{{b}}{{a}}', ['a', 'b'])).toBe('%1$s%2$s%1$s');
  });

  it('leaves unrecorded variables intact', () => {
    expect(toPositional('{{ghost}}', [])).toBe('{{ghost}}');
  });
});
